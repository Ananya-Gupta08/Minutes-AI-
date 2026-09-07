from datetime import datetime, date, timezone
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

Name = Annotated[str, Field(min_length=1, max_length=100)]
Tag = Annotated[str, Field(min_length=1, max_length=60)]

class Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid', allow_inf_nan=False)

class MeetingCreate(Input):
    title: str = Field(min_length=1, max_length=200)
    meeting_date: datetime
    duration_seconds: int = Field(ge=1, le=86400)
    participants: list[Name] = Field(default_factory=list, max_length=50)
    tags: list[Tag] = Field(default_factory=list, max_length=20)
    raw_transcript: str = Field(min_length=3, max_length=1_000_000)
    transcript_format: Literal['txt', 'vtt', 'json'] = 'txt'

    @field_validator('meeting_date')
    @classmethod
    def normalize_date(cls, value):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

class MeetingUpdate(Input):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    meeting_date: datetime | None = None
    duration_seconds: int | None = Field(default=None, ge=1, le=86400)
    participants: list[Name] | None = Field(default=None, max_length=50)
    tags: list[Tag] | None = Field(default=None, max_length=20)

    @field_validator('title', 'meeting_date', 'duration_seconds', 'participants', 'tags')
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError('This field cannot be null')
        if isinstance(value, datetime):
            return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
        return value

class ActionCreate(Input):
    text: str = Field(min_length=1, max_length=2000)
    assignee: str = Field(default='Unassigned', min_length=1, max_length=100)
    due_date: date | None = None
    completed: bool = False

class ActionUpdate(Input):
    text: str | None = Field(default=None, min_length=1, max_length=2000)
    assignee: str | None = Field(default=None, min_length=1, max_length=100)
    due_date: date | None = None
    completed: bool | None = None

    @field_validator('text', 'assignee', 'completed')
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError('This field cannot be null')
        return value

class Output(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class ParticipantOut(Output):
    id: int
    name: str
    email: str | None
    avatar_color: str

class SegmentOut(Output):
    id: int
    speaker_name: str
    start_seconds: float
    end_seconds: float
    text: str
    segment_order: int

class ActionOut(Output):
    id: int
    meeting_id: int
    text: str
    assignee: str
    due_date: date | None
    completed: bool

class TopicOut(Output):
    id: int
    name: str

class ChapterOut(Output):
    id: int
    title: str
    description: str
    start_seconds: float
    chapter_order: int

class NoteSection(BaseModel):
    title: str
    bullets: list[str]

class AnalysisOut(BaseModel):
    sections: list[NoteSection]
    decisions: list[str]
    source: str

class MeetingOut(Output):
    id: int
    title: str
    meeting_date: datetime
    duration_seconds: int
    summary_short: str
    summary_detailed: AnalysisOut
    created_at: datetime
    updated_at: datetime
    participants: list[ParticipantOut]
    topics: list[TopicOut]
    action_items: list[ActionOut]

    @field_validator('meeting_date', 'created_at', 'updated_at')
    @classmethod
    def utc_output(cls, value):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

class MeetingDetail(MeetingOut):
    segments: list[SegmentOut]
    chapters: list[ChapterOut]

class Stats(BaseModel):
    total_meetings: int
    total_hours: float
    open_action_items: int
    meetings_this_week: int

class LibraryOut(BaseModel):
    meetings: list[MeetingOut]
    total: int
    stats: Stats
    participants: list[str]
    topics: list[str]
