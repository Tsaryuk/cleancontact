from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Contact
from ..schemas import ContactOut, ContactUpdate

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=List[ContactOut])
def list_contacts(
    q: Optional[str] = Query(None),
    circle: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Contact)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Contact.raw_name.ilike(like),
                Contact.first_name.ilike(like),
                Contact.last_name.ilike(like),
                Contact.organization.ilike(like),
                Contact.telegram.ilike(like),
                Contact.notes.ilike(like),
            )
        )
    if circle:
        query = query.filter(Contact.circle == circle)
    return query.order_by(Contact.raw_name).offset(skip).limit(limit).all()


@router.get("/count")
def count_contacts(db: Session = Depends(get_db)):
    return {"count": db.query(Contact).count()}


@router.get("/{contact_id}", response_model=ContactOut)
def get_contact(contact_id: str, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(404, "Contact not found")
    return c


@router.patch("/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: str, data: ContactUpdate, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(404, "Contact not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{contact_id}")
def delete_contact(contact_id: str, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(404, "Contact not found")
    db.delete(c)
    db.commit()
    return {"ok": True}
