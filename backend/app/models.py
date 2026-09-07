from datetime import datetime, timezone, date

from sqlalchemy import Column, Table, ForeignKey, String, Text, DateTime, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

def utcnow():
    return datetime.now(timezone.utc)

meeting_participants = Table(
    'meeting_participants', Base.metadata,
    Column('meeting_id', ForeignKey('meetings.id', ondelete='CASCADE'), primary_key=True),
    Column('participant_id', ForeignKey('participants.id', ondelete='CASCADE'), primary_key=True),
)

class Meeting(Base):
    __tablename__ = 'meetings'
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    meeting_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_seconds: Mapped[int]
    summary_short: Mapped[str] = mapped_column(Text)
    summary_detailed: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    participants: Mapped[list['Participant']] = relationship(secondary=meeting_participants, lazy='selectin')
    segments: Mapped[list['TranscriptSegment']] = relationship(cascade='all, delete-orphan', order_by='TranscriptSegment.segment_order', lazy='selectin')
    action_items: Mapped[list['ActionItem']] = relationship(cascade='all, delete-orphan', order_by='ActionItem.id', lazy='selectin')
    topics: Mapped[list['Topic']] = relationship(cascade='all, delete-orphan', lazy='selectin')
    chapters: Mapped[list['Chapter']] = relationship(cascade='all, delete-orphan', order_by='Chapter.chapter_order', lazy='selectin')

class Participant(Base):
    __tablename__ = 'participants'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255))
    avatar_color: Mapped[str] = mapped_column(String(20), default='#7957d5')

class TranscriptSegment(Base):
    __tablename__ = 'transcript_segments'
    __table_args__ = (UniqueConstraint('meeting_id', 'segment_order'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey('meetings.id', ondelete='CASCADE'), index=True)
    speaker_name: Mapped[str] = mapped_column(String(100))
    start_seconds: Mapped[float]
    end_seconds: Mapped[float]
    text: Mapped[str] = mapped_column(Text)
    segment_order: Mapped[int]

class ActionItem(Base):
    __tablename__ = 'action_items'
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey('meetings.id', ondelete='CASCADE'), index=True)
    text: Mapped[str] = mapped_column(String(2000))
    assignee: Mapped[str] = mapped_column(String(100), default='Unassigned')
    due_date: Mapped[date | None]
    completed: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class Topic(Base):
    __tablename__ = 'topics'
    __table_args__ = (UniqueConstraint('meeting_id', 'name'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey('meetings.id', ondelete='CASCADE'), index=True)
    name: Mapped[str] = mapped_column(String(60), index=True)

class Chapter(Base):
    __tablename__ = 'chapters'
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey('meetings.id', ondelete='CASCADE'), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    start_seconds: Mapped[float]
    chapter_order: Mapped[int]

class AppState(Base):
    __tablename__ = 'app_state'
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[str] = mapped_column(String(100))
