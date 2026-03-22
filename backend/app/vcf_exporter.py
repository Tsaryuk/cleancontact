"""
VCF/vCard 3.0 exporter — iPhone compatible.
Tags stored in NOTE field.
"""
import vobject
from typing import List
from .models import Contact


def export_vcf(contacts: List[Contact]) -> bytes:
    lines = []
    for c in contacts:
        vcard = vobject.vCard()

        # UID
        if c.import_uid:
            vcard.add("uid").value = c.import_uid

        # Name
        vcard.add("fn").value = c.raw_name or f"{c.first_name or ''} {c.last_name or ''}".strip()
        n = vobject.vcard.Name(
            family=c.last_name or "",
            given=c.first_name or "",
        )
        vcard.add("n").value = n

        # Phones — use display format
        for ph in (c.phones or []):
            display = ph.get("display") or ph.get("raw", "")
            if display:
                tel = vcard.add("tel")
                tel.value = display
                ptype = ph.get("type", "cell").upper()
                tel.type_param = "CELL" if ptype in ("MOBILE", "CELL") else "WORK"

        # Emails
        for email in (c.emails or []):
            em = vcard.add("email")
            em.value = email
            em.type_param = "INTERNET"

        # Birthday
        if c.birthday:
            vcard.add("bday").value = c.birthday.strftime("%Y-%m-%d")

        # Org / Title
        if c.organization:
            vcard.add("org").value = [c.organization]
        if c.title:
            vcard.add("title").value = c.title

        # Telegram via IMPP
        if c.telegram:
            handle = c.telegram.lstrip("@")
            impp = vcard.add("impp")
            impp.value = f"https://t.me/{handle}"

        # Social links
        for key, val in (c.social_links or {}).items():
            if isinstance(val, list):
                for v in val:
                    vcard.add("url").value = v
            elif val:
                vcard.add("url").value = val

        # Notes — merge original notes + tags + ai_summary
        note_parts = []
        if c.notes:
            note_parts.append(c.notes)
        if c.tags:
            note_parts.append("Теги: " + ", ".join(c.tags))
        if c.ai_summary:
            note_parts.append("AI: " + c.ai_summary)
        if c.relationship_ctx:
            note_parts.append("Контекст: " + c.relationship_ctx)
        if note_parts:
            vcard.add("note").value = "\n".join(note_parts)

        lines.append(vcard.serialize())

    return "".join(lines).encode("utf-8")
