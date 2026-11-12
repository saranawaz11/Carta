from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    content: str
    tags: list[str]
    archived_at: datetime | None
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None

    @model_validator(mode="after")
    def validate_update(self) -> "NoteUpdate":
        if not self.model_fields_set or any(
            getattr(self, field) is None for field in self.model_fields_set
        ):
            raise ValueError("At least one non-null field must be provided")
        return self


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class PendingAction(BaseModel):
    action: Literal["update", "archive", "delete"]
    note_id: UUID
    note_title: str
    expected_updated_at: datetime
    changes: dict[str, str]


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    history: list[ChatMessage] = Field(default_factory=list, max_length=6)
    pending_action: PendingAction | None = None


class ChatSource(BaseModel):
    note_id: UUID
    title: str


class CreatedNote(BaseModel):
    note_id: UUID
    title: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]
    pending_action: PendingAction | None = None
    created_note: CreatedNote | None = None


class ConfirmRequest(BaseModel):
    action: str
    note_id: UUID
    expected_updated_at: datetime
    changes: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_changes(self) -> "ConfirmRequest":
        if self.action == "update":
            NoteUpdate.model_validate(self.changes)
        return self


class ConfirmResponse(BaseModel):
    message: str
    note: NoteOut

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    due_at: datetime | None = None
    due_has_time: bool = False
    now: datetime | None = None
    timezone: str | None = None

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str | None) -> str | None:
        if value is not None:
            try:
                ZoneInfo(value)
            except Exception as error:
                raise ValueError("Unknown timezone") from error
        return value

    @model_validator(mode="after")
    def validate_date_context(self) -> "TaskCreate":
        if (self.now is None) != (self.timezone is None):
            raise ValueError("now and timezone must be provided together")
        if self.now is not None and self.now.utcoffset() is None:
            raise ValueError("now must include a timezone offset")
        if self.now is not None and (self.due_at is not None or self.due_has_time):
            raise ValueError("Natural-language tasks cannot include a resolved due date")
        return self


class TaskDateResolution(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    date_status: Literal["resolved", "no_date", "clarify"]
    due_at: str | None = None
    due_has_time: bool = False
    message: str | None = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Task title must not be empty")
        return value

    @model_validator(mode="after")
    def validate_resolution(self) -> "TaskDateResolution":
        if self.date_status == "resolved" and self.due_at is None:
            raise ValueError("A resolved date must include due_at")
        if self.date_status == "no_date" and (
            self.due_at is not None or self.due_has_time
        ):
            raise ValueError("An undated task cannot include due date or time")
        if self.date_status == "clarify" and self.due_at is not None:
            raise ValueError("An unresolved date cannot include due_at")
        return self


class TaskUpdate(BaseModel):
    completed: bool


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    due_at: datetime | None
    due_has_time: bool
    completed_at: datetime | None
    created_at: datetime


class CaptureRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    now: datetime
    timezone: str

    @field_validator("now")
    @classmethod
    def timezone_aware_now(cls, value: datetime) -> datetime:
        if value.utcoffset() is None:
            raise ValueError("Current datetime must include a timezone offset")
        return value

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Text must not be empty")
        return value

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except Exception as error:
            raise ValueError("Unknown timezone") from error
        return value


class CaptureResponse(BaseModel):
    outcome: Literal["task_created", "note_created", "pending_action", "message"]
    task: TaskOut | None = None
    note: NoteOut | None = None
    pending_action: PendingAction | None = None
    message: str | None = None


class SummaryRequest(BaseModel):
    now: datetime
    timezone: str

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except Exception as error:
            raise ValueError("Unknown timezone") from error
        return value


class DeadlineOut(BaseModel):
    title: str
    due_at: datetime
    due_has_time: bool
    already_in_tasks: bool


class ConnectionOut(BaseModel):
    note_id: UUID
    title: str
    reason: str


class SummaryOut(BaseModel):
    overview: str
    key_points: list[str]
    deadlines: list[DeadlineOut]
    connections: list[ConnectionOut]
    stale: bool
    generated_at: datetime
