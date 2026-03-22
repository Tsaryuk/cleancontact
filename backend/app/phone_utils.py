import re
import phonenumbers
from phonenumbers import PhoneNumberFormat, NumberParseException


def normalize_phone(raw: str, default_region: str = "RU") -> dict:
    """
    Normalize a phone number to readable format: +7 XXX XXX-XX-XX
    Returns dict with raw, normalized, display, type, needs_review flag.
    """
    raw = raw.strip()
    result = {
        "raw": raw,
        "normalized": None,
        "display": None,
        "type": "mobile",
        "needs_review": False,
    }

    # Strip obviously bad entries
    digits = re.sub(r"\D", "", raw)
    if len(digits) < 7:
        result["needs_review"] = True
        return result

    try:
        parsed = phonenumbers.parse(raw, default_region)
        if not phonenumbers.is_valid_number(parsed):
            # Try with RU prefix
            if len(digits) == 10:
                parsed = phonenumbers.parse(f"+7{digits}", None)
            elif len(digits) == 11 and digits[0] == "8":
                parsed = phonenumbers.parse(f"+7{digits[1:]}", None)
            else:
                result["needs_review"] = True
                return result

        if not phonenumbers.is_valid_number(parsed):
            result["needs_review"] = True
            return result

        e164 = phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
        result["normalized"] = e164

        # Build readable format for Russian numbers: +7 XXX XXX-XX-XX
        if e164.startswith("+7") and len(e164) == 12:
            n = e164[2:]  # 10 digits
            result["display"] = f"+7 {n[0:3]} {n[3:6]}-{n[6:8]}-{n[8:10]}"
        else:
            # Generic international format
            result["display"] = phonenumbers.format_number(parsed, PhoneNumberFormat.INTERNATIONAL)

        # Detect number type
        nt = phonenumbers.number_type(parsed)
        if nt in (phonenumbers.PhoneNumberType.FIXED_LINE,):
            result["type"] = "work"
        elif nt in (phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE,):
            result["type"] = "mobile"
        else:
            result["type"] = "mobile"

    except NumberParseException:
        # Last-ditch: try to coerce 10-digit RU numbers
        if len(digits) == 10:
            try:
                parsed = phonenumbers.parse(f"+7{digits}", None)
                if phonenumbers.is_valid_number(parsed):
                    n = digits
                    result["normalized"] = f"+7{digits}"
                    result["display"] = f"+7 {n[0:3]} {n[3:6]}-{n[6:8]}-{n[8:10]}"
                    return result
            except Exception:
                pass
        result["needs_review"] = True

    return result
