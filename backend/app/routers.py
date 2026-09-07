from datetime import date, datetime, time, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session
from .database import get_db
from .models import Meeting, Participant, Topic, TranscriptSegment, ActionItem, meeting_participants, utcnow
from .schemas import MeetingCreate, MeetingUpdate, MeetingDetail, LibraryOut, ActionCreate, ActionUpdate, ActionOut
from .services.meetings import create_meeting, get_participants

router = APIRouter(prefix='/api')

def find_meeting(db, meeting_id):
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(404, 'Meeting not found')
    return meeting

@router.get('/health')
def health(db: Session = Depends(get_db)):
    db.execute(select(1))
    return {'status': 'ok', 'product': 'Minutes AI'}

@router.get('/meetings', response_model=LibraryOut)
def list_meetings(search: str = Query('', max_length=200), participant: str = '', topic: str = '',
                  date_from: date | None = None, date_to: date | None = None,
                  sort: Literal['newest', 'oldest', 'title'] = 'newest',
                  limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(422, 'Start date must not be after end date')
    query = select(Meeting)
    if search.strip():
        escaped = search.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        pattern = f'%{escaped}%'
        query = query.where(or_(Meeting.title.ilike(pattern, escape='\\'),
            Meeting.participants.any(Participant.name.ilike(pattern, escape='\\')),
            Meeting.topics.any(Topic.name.ilike(pattern, escape='\\')),
            Meeting.segments.any(TranscriptSegment.text.ilike(pattern, escape='\\'))))
    if participant:
        query = query.where(Meeting.participants.any(Participant.name == participant))
    if topic:
        query = query.where(Meeting.topics.any(Topic.name == topic))
    if date_from:
        query = query.where(Meeting.meeting_date >= datetime.combine(date_from, time.min))
    if date_to:
        query = query.where(Meeting.meeting_date <= datetime.combine(date_to, time.max))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    order = {'newest': Meeting.meeting_date.desc(), 'oldest': Meeting.meeting_date.asc(), 'title': Meeting.title.asc()}[sort]
    meetings = db.scalars(query.order_by(order, Meeting.id).offset(offset).limit(limit)).all()
    now = datetime.now(timezone.utc)
    monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    stats = dict(total_meetings=db.scalar(select(func.count(Meeting.id))),
                 total_hours=round((db.scalar(select(func.sum(Meeting.duration_seconds))) or 0) / 3600, 1),
                 open_action_items=db.scalar(select(func.count(ActionItem.id)).where(ActionItem.completed.is_(False))),
                 meetings_this_week=db.scalar(select(func.count(Meeting.id)).where(Meeting.meeting_date >= monday, Meeting.meeting_date < monday + timedelta(days=7))))
    participants = db.scalars(select(Participant.name).where(Participant.id.in_(select(meeting_participants.c.participant_id))).order_by(Participant.name)).all()
    return dict(meetings=meetings, total=total, stats=stats, participants=participants,
                topics=db.scalars(select(Topic.name).distinct().order_by(Topic.name)).all())

@router.get('/search', response_model=LibraryOut)
def search(q: str = Query('', max_length=200), db: Session = Depends(get_db)):
    return list_meetings(search=q, limit=20, offset=0, db=db)

@router.post('/meetings', response_model=MeetingDetail, status_code=201)
def post_meeting(payload: MeetingCreate, db: Session = Depends(get_db)):
    try:
        meeting = create_meeting(db, payload)
        db.commit()
        return meeting
    except ValueError as exc:
        db.rollback()
        raise HTTPException(422, str(exc)) from exc

@router.get('/meetings/{meeting_id}', response_model=MeetingDetail)
def detail(meeting_id: int, db: Session = Depends(get_db)):
    return find_meeting(db, meeting_id)

@router.patch('/meetings/{meeting_id}', response_model=MeetingDetail)
def patch_meeting(meeting_id: int, payload: MeetingUpdate, db: Session = Depends(get_db)):
    meeting = find_meeting(db, meeting_id)
    updates = payload.model_dump(exclude_unset=True)
    if 'duration_seconds' in updates and any(s.end_seconds > updates['duration_seconds'] for s in meeting.segments):
        raise HTTPException(422, 'Duration cannot be shorter than the last transcript segment.')
    if 'participants' in updates:
        meeting.participants = get_participants(db, updates.pop('participants'))
    if 'tags' in updates:
        tags = list(dict.fromkeys(updates.pop('tags')))
        meeting.topics.clear()
        db.flush()
        meeting.topics = [Topic(name=t) for t in tags]
    for key, value in updates.items():
        setattr(meeting, key, value)
    if payload.model_fields_set:
        meeting.updated_at = utcnow()
    db.commit()
    return meeting

@router.delete('/meetings/{meeting_id}', status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    db.delete(find_meeting(db, meeting_id))
    db.commit()
    return Response(status_code=204)

@router.post('/meetings/{meeting_id}/action-items', response_model=ActionOut, status_code=201)
def add_action(meeting_id: int, payload: ActionCreate, db: Session = Depends(get_db)):
    find_meeting(db, meeting_id)
    action = ActionItem(meeting_id=meeting_id, **payload.model_dump())
    db.add(action)
    db.commit()
    return action

def find_action(db, action_id):
    action = db.get(ActionItem, action_id)
    if action is None:
        raise HTTPException(404, 'Action item not found')
    return action

@router.patch('/action-items/{action_id}', response_model=ActionOut)
def patch_action(action_id: int, payload: ActionUpdate, db: Session = Depends(get_db)):
    action = find_action(db, action_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(action, key, value)
    db.commit()
    return action

@router.delete('/action-items/{action_id}', status_code=204)
def delete_action(action_id: int, db: Session = Depends(get_db)):
    db.delete(find_action(db, action_id))
    db.commit()
    return Response(status_code=204)
