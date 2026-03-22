"""
VCF/vCard parser — handles iPhone exports including Telegram via IMPP and X-SOCIALPROFILE.
"""
import re
import vobject
from datetime import date
from typing import Optional, List
from .phone_utils import normalize_phone


def _extract_telegram(vcard) -> Optional[str]:
    """Extract Telegram handle from IMPP or X-SOCIALPROFILE fields."""
    # IMPP: xmpp:telegram:username or  im:telegram:username
    for field_name in ("impp", "x-socialprofile"):
        try:
            items = vcard.contents.get(field_name, [])
            for item in items:
                val = str(item.value).strip()
                low = val.lower()
                if "telegram" in low or "t.me" in low:
                    # Extract username
                    handle = re.sub(r"(?i)^.*telegram[:/]+", "", val).strip()
                    handle = re.sub(r"^https?://t\.me/", "@", handle)
                    if not handle.startswith("@"):
                        handle = f"@{handle}"
                    return handle
        except Exception:
            pass

    # Also check NOTE field for t.me links
    try:
        note = str(vcard.note.value)
        m = re.search(r"(?:t\.me/|telegram\.me/)(@?\w+)", note, re.IGNORECASE)
        if m:
            handle = m.group(1)
            if not handle.startswith("@"):
                handle = f"@{handle}"
            return handle
    except Exception:
        pass

    return None


def _extract_social_links(vcard) -> dict:
    """Extract non-Telegram social links."""
    links = {}
    for field_name in ("url", "x-socialprofile", "impp"):
        try:
            items = vcard.contents.get(field_name, [])
            for item in items:
                val = str(item.value).strip()
                if not val:
                    continue
                low = val.lower()
                if "telegram" in low or "t.me" in low:
                    continue
                if "instagram" in low:
                    links["instagram"] = val
                elif "linkedin" in low:
                    links["linkedin"] = val
                elif "facebook" in low or "fb.com" in low:
                    links["facebook"] = val
                elif "twitter" in low or "x.com" in low:
                    links["twitter"] = val
                elif "vk.com" in low:
                    links["vk"] = val
                else:
                    links.setdefault("other", [])
                    if isinstance(links["other"], list):
                        links["other"].append(val)
        except Exception:
            pass
    return links


def _get_text(vcard, field: str) -> Optional[str]:
    try:
        val = getattr(vcard, field).value
        return str(val).strip() or None
    except Exception:
        return None


def parse_vcf(content: bytes) -> List[dict]:
    """Parse a .vcf file bytes and return list of contact dicts."""
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    contacts = []
    for vcard in vobject.readComponents(text):
        contact = _parse_vcard(vcard)
        if contact:
            contacts.append(contact)
    return contacts


def _parse_vcard(vcard) -> Optional[dict]:
    # Name
    raw_name = _get_text(vcard, "fn") or ""
    first_name = ""
    last_name = ""
    try:
        n = vcard.n.value
        first_name = (n.given or "").strip()
        last_name = (n.family or "").strip()
    except Exception:
        parts = raw_name.split(" ", 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""

    # UID
    import_uid = None
    try:
        import_uid = str(vcard.uid.value).strip() or None
    except Exception:
        pass

    # Phones
    phones = []
    try:
        for tel in vcard.contents.get("tel", []):
            raw = str(tel.value).strip()
            if raw:
                phones.append(normalize_phone(raw))
    except Exception:
        pass

    # Emails
    emails = []
    try:
        for email in vcard.contents.get("email", []):
            val = str(email.value).strip()
            if val:
                emails.append(val.lower())
    except Exception:
        pass

    # Birthday
    birthday = None
    try:
        bday_raw = str(vcard.bday.value).strip()
        # Formats: YYYY-MM-DD or YYYYMMDD or --MMDD (no year)
        bday_clean = re.sub(r"[^\d-]", "", bday_raw)
        if re.match(r"^\d{8}$", bday_clean):
            birthday = date(int(bday_clean[:4]), int(bday_clean[4:6]), int(bday_clean[6:8]))
        elif re.match(r"^\d{4}-\d{2}-\d{2}$", bday_clean):
            parts = bday_clean.split("-")
            birthday = date(int(parts[0]), int(parts[1]), int(parts[2]))
    except Exception:
        pass

    # Other fields
    organization = _get_text(vcard, "org")
    if organization:
        # org can be structured
        try:
            org_val = vcard.org.value
            if isinstance(org_val, (list, tuple)):
                organization = "; ".join(str(x) for x in org_val if x)
        except Exception:
            pass

    title = _get_text(vcard, "title")
    notes = _get_text(vcard, "note")
    telegram = _extract_telegram(vcard)
    social_links = _extract_social_links(vcard)

    return {
        "raw_name": raw_name,
        "first_name": first_name,
        "last_name": last_name,
        "phones": phones,
        "emails": emails,
        "birthday": birthday,
        "organization": organization,
        "title": title,
        "notes": notes,
        "telegram": telegram,
        "social_links": social_links,
        "import_uid": import_uid,
    }
