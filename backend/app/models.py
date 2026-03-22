import uuid
from datetime import datetime
from sqlalchemy import Column, String, JSON, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, default=gen_uuid)
    raw_name = Column(Text)
    first_name = Column(Text)
    last_name = Column(Text)
    phones = Column(JSON, default=list)      # [{raw, normalized, type, display}]
    emails = Column(JSON, default=list)
    birthday = Column(Date, nullable=True)
    organization = Column(Text)
    title = Column(Text)
    notes = Column(Text)
    telegram = Column(Text)
    social_links = Column(JSON, default=dict)
    circle = Column(String(20))              # close | middle | distant | unknown
    tags = Column(JSON, default=list)
    relationship_ctx = Column(Text)          # colleague, friend, client, etc.
    ai_summary = Column(Text)
    ai_suggestions = Column(JSON, nullable=True)
    import_uid = Column(Text, unique=True, nullable=True)
    imported_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cleaned = Column(Boolean, default=False)

    links_from = relationship("ContactLink", foreign_keys="ContactLink.source_id", back_populates="source")
    links_to = relationship("ContactLink", foreign_keys="ContactLink.target_id", back_populates="target")
    reminders = relationship("Reminder", back_populates="contact")


class ContactLink(Base):
    __tablename__ = "contact_links"

    id = Column(String, primary_key=True, default=gen_uuid)
    source_id = Column(String, ForeignKey("contacts.id"), nullable=False)
    target_id = Column(String, ForeignKey("contacts.id"), nullable=False)
    link_type = Column(String(50))
    note = Column(Text)

    source = relationship("Contact", foreign_keys=[source_id], back_populates="links_from")
    target = relationship("Contact", foreign_keys=[target_id], back_populates="links_to")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String, primary_key=True, default=gen_uuid)
    contact_id = Column(String, ForeignKey("contacts.id"), nullable=False)
    type = Column(String(20))   # birthday | followup | custom
    trigger_date = Column(Date)
    recurring = Column(Boolean, default=False)
    message = Column(Text)

    contact = relationship("Contact", back_populates="reminders")
