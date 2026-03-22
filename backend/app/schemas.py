from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime


class PhoneEntry(BaseModel):
    raw: str
    normalized: Optional[str] = None
    display: Optional[str] = None
    type: str = "mobile"
    needs_review: bool = False


class ContactBase(BaseModel):
    raw_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phones: Optional[List[dict]] = []
    emails: Optional[List[str]] = []
    birthday: Optional[date] = None
    organization: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    telegram: Optional[str] = None
    social_links: Optional[dict] = {}
    circle: Optional[str] = None
    tags: Optional[List[str]] = []
    relationship_ctx: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_suggestions: Optional[Any] = None
    cleaned: Optional[bool] = False


class ContactUpdate(ContactBase):
    pass


class ContactOut(ContactBase):
    id: str
    import_uid: Optional[str] = None
    imported_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    total: int
    created: int
    updated: int
    skipped: int


class AISuggestion(BaseModel):
    contact_id: str
    suggestions: dict


class AIConfirm(BaseModel):
    ai_summary: Optional[str] = None
    relationship: Optional[str] = None
    circle: Optional[str] = None
    tags: Optional[List[str]] = None


class AIEstimate(BaseModel):
    contacts: int
    estimated_input_tokens: int
    estimated_output_tokens: int
    estimated_cost_usd: float
