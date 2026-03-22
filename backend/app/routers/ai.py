from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import Contact
from ..schemas import AISuggestion, AIConfirm, AIEstimate
from ..ai_service import enrich_contact, estimate_enrichment_cost

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/estimate", response_model=AIEstimate)
def estimate_enrichment(db: Session = Depends(get_db)):
    """Estimate API cost for enriching all contacts without ai_summary."""
    count = db.query(Contact).filter(Contact.ai_summary.is_(None)).count()
    return estimate_enrichment_cost(count)


@router.post("/enrich/{contact_id}", response_model=AISuggestion)
def enrich_one(contact_id: str, db: Session = Depends(get_db)):
    """Enrich a single contact with AI suggestions (does NOT save automatically)."""
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(404, "Contact not found")

    data = {
        "raw_name": c.raw_name,
        "organization": c.organization,
        "title": c.title,
        "notes": c.notes,
        "telegram": c.telegram,
        "emails": c.emails,
    }
    suggestions = enrich_contact(data)
    if suggestions and "error" not in suggestions:
        # Store suggestions pending confirmation
        c.ai_suggestions = suggestions
        db.commit()

    return AISuggestion(contact_id=contact_id, suggestions=suggestions or {})


@router.post("/confirm/{contact_id}", response_model=dict)
def confirm_suggestions(contact_id: str, data: AIConfirm, db: Session = Depends(get_db)):
    """Apply confirmed AI suggestions to the contact."""
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(404, "Contact not found")

    if data.ai_summary is not None:
        c.ai_summary = data.ai_summary
    if data.relationship is not None:
        c.relationship_ctx = data.relationship
    if data.circle is not None:
        c.circle = data.circle
    if data.tags is not None:
        c.tags = data.tags

    c.ai_suggestions = None
    c.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.post("/enrich-batch")
def enrich_batch(contact_ids: List[str], db: Session = Depends(get_db)):
    """
    Enrich a batch of contacts. Returns suggestions for all — does NOT auto-apply.
    """
    results = []
    for cid in contact_ids:
        c = db.query(Contact).filter(Contact.id == cid).first()
        if not c:
            continue
        data = {
            "raw_name": c.raw_name,
            "organization": c.organization,
            "title": c.title,
            "notes": c.notes,
            "telegram": c.telegram,
            "emails": c.emails,
        }
        suggestions = enrich_contact(data) or {}
        if suggestions and "error" not in suggestions:
            c.ai_suggestions = suggestions
        results.append({"contact_id": cid, "suggestions": suggestions})

    db.commit()
    return results
