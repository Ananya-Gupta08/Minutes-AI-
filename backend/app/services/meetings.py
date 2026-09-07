from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models import Meeting, Participant, Topic, TranscriptSegment, Chapter, ActionItem
from ..schemas import MeetingCreate
from .ingestion import parse_transcript
from .analysis import analyze

COLORS = ['#7957d5', '#278478', '#ca7851', '#5879bb', '#b45e8c']

def get_participants(db: Session, names: list[str]):
    people = []
    for name in dict.fromkeys(n.strip() for n in names if n.strip()):
        person = db.scalar(select(Participant).where(Participant.name == name))
        if person is None:
            person = Participant(name=name, avatar_color=COLORS[sum(map(ord, name)) % len(COLORS)])
            db.add(person)
            db.flush()
        people.append(person)
    return people

def create_meeting(db: Session, payload: MeetingCreate):
    segments = parse_transcript(payload.raw_transcript, payload.transcript_format, payload.duration_seconds)
    analysis = analyze(segments, payload.tags)
    names = list(dict.fromkeys(payload.participants + [s['speaker_name'] for s in segments if s['speaker_name'] != 'Speaker']))
    if len(names) > 50:
        raise ValueError('A meeting can have at most 50 participants, including transcript speakers.')
    meeting = Meeting(title=payload.title, meeting_date=payload.meeting_date, duration_seconds=payload.duration_seconds,
                      summary_short=analysis['summary_short'], summary_detailed=analysis['summary_detailed'],
                      participants=get_participants(db, names),
                      segments=[TranscriptSegment(**s) for s in segments],
                      topics=[Topic(name=t) for t in analysis['topics']],
                      chapters=[Chapter(**c) for c in analysis['chapters']],
                      action_items=[ActionItem(**a) for a in analysis['action_items']])
    db.add(meeting)
    db.flush()
    return meeting
