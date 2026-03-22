import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import Contact
from ..schemas import ImportResult
from ..vcf_parser import parse_vcf
from ..vcf_exporter import export_vcf

router = APIRouter(tags=["import/export"])


@router.post("/import", response_model=ImportResult)
async def import_vcf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".vcf"):
        raise HTTPException(400, "Only .vcf files are supported")

    content = await file.read()
    parsed = parse_vcf(content)

    created = updated = skipped = 0

    for p in parsed:
        import_uid = p.get("import_uid")

        existing = None
        if import_uid:
            existing = db.query(Contact).filter(Contact.import_uid == import_uid).first()

        if not existing and not import_uid:
            # Fallback: match by name + first phone
            name = p.get("raw_name", "").strip()
            phones = p.get("phones", [])
            if name and phones:
                first_phone = phones[0].get("normalized") or phones[0].get("raw", "")
                # Try to find by raw_name (loose match)
                candidates = db.query(Contact).filter(Contact.raw_name == name).all()
                for cand in candidates:
                    cand_phones = cand.phones or []
                    for cp in cand_phones:
                        if cp.get("normalized") == first_phone:
                            existing = cand
                            break
                    if existing:
                        break

        if existing:
            # Update only raw fields from vCard, preserve manual edits
            existing.raw_name = p.get("raw_name") or existing.raw_name
            existing.first_name = p.get("first_name") or existing.first_name
            existing.last_name = p.get("last_name") or existing.last_name
            existing.phones = p.get("phones") or existing.phones
            existing.emails = p.get("emails") or existing.emails
            if p.get("birthday") and not existing.birthday:
                existing.birthday = p["birthday"]
            existing.organization = p.get("organization") or existing.organization
            existing.title = p.get("title") or existing.title
            existing.telegram = p.get("telegram") or existing.telegram
            existing.social_links = p.get("social_links") or existing.social_links
            existing.updated_at = datetime.utcnow()
            updated += 1
        else:
            contact = Contact(
                id=str(uuid.uuid4()),
                raw_name=p.get("raw_name"),
                first_name=p.get("first_name"),
                last_name=p.get("last_name"),
                phones=p.get("phones", []),
                emails=p.get("emails", []),
                birthday=p.get("birthday"),
                organization=p.get("organization"),
                title=p.get("title"),
                notes=p.get("notes"),
                telegram=p.get("telegram"),
                social_links=p.get("social_links", {}),
                import_uid=import_uid,
                imported_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                circle="unknown",
                tags=[],
                cleaned=False,
            )
            db.add(contact)
            created += 1

    db.commit()
    return ImportResult(
        total=len(parsed),
        created=created,
        updated=updated,
        skipped=skipped,
    )


@router.get("/export")
def export_contacts_vcf(db: Session = Depends(get_db)):
    contacts = db.query(Contact).order_by(Contact.raw_name).all()
    vcf_bytes = export_vcf(contacts)
    return Response(
        content=vcf_bytes,
        media_type="text/vcard",
        headers={"Content-Disposition": "attachment; filename=cleancontact_export.vcf"},
    )
