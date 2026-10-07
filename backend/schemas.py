from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    content: str
    archived_at: datetime | None
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    content: str | None = None

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
