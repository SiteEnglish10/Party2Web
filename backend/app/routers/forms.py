import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlmodel import Session, select

from ..auth import require_admin
from ..db import get_session
from ..models import FormDef, FormField, FormSubmission
from ..schemas import FormIn, SubmissionIn
from ..util import dumps, loads

router = APIRouter(prefix="/api", tags=["forms"])


def _pick(zh: str, en: str, lang: str) -> str:
    return en if lang == "en" else zh


def _field_out(f: FormField, lang: str) -> dict:
    return {
        "id": f.id,
        "label": _pick(f.label_zh, f.label_en, lang),
        "label_zh": f.label_zh,
        "label_en": f.label_en,
        "field_type": f.field_type,
        "options": loads(f.options, []),
        "required": f.required,
        "sort_order": f.sort_order,
    }


def _form_out(s: Session, form: FormDef, lang: str) -> dict:
    fields = s.exec(
        select(FormField).where(FormField.form_id == form.id)
        .order_by(FormField.sort_order, FormField.id)
    ).all()
    return {
        "id": form.id,
        "title": _pick(form.title_zh, form.title_en, lang),
        "title_zh": form.title_zh,
        "title_en": form.title_en,
        "active": form.active,
        "fields": [_field_out(f, lang) for f in fields],
    }


@router.get("/forms/active")
def active_forms(lang: str = "zh", s: Session = Depends(get_session)):
    forms = s.exec(
        select(FormDef).where(FormDef.active == True).order_by(FormDef.sort_order)  # noqa: E712
    ).all()
    return [_form_out(s, f, lang) for f in forms]


@router.get("/forms", dependencies=[Depends(require_admin)])
def all_forms(lang: str = "zh", s: Session = Depends(get_session)):
    forms = s.exec(select(FormDef).order_by(FormDef.sort_order)).all()
    return [_form_out(s, f, lang) for f in forms]


def _replace_fields(s: Session, form_id: int, fields):
    for old in s.exec(select(FormField).where(FormField.form_id == form_id)).all():
        s.delete(old)
    for i, fld in enumerate(fields):
        s.add(FormField(
            form_id=form_id, label_zh=fld.label_zh, label_en=fld.label_en,
            field_type=fld.field_type, options=dumps(fld.options),
            required=fld.required, sort_order=i,
        ))


@router.post("/forms", dependencies=[Depends(require_admin)])
def create_form(body: FormIn, s: Session = Depends(get_session)):
    maxo = s.exec(select(func.max(FormDef.sort_order))).one() or 0
    form = FormDef(title_zh=body.title_zh, title_en=body.title_en,
                   active=body.active, sort_order=maxo + 1)
    s.add(form)
    s.commit()
    s.refresh(form)
    _replace_fields(s, form.id, body.fields)
    s.commit()
    return _form_out(s, form, "zh")


@router.put("/forms/{fid}", dependencies=[Depends(require_admin)])
def update_form(fid: int, body: FormIn, s: Session = Depends(get_session)):
    form = s.get(FormDef, fid)
    if not form:
        raise HTTPException(404, "表单不存在")
    form.title_zh, form.title_en, form.active = body.title_zh, body.title_en, body.active
    s.add(form)
    _replace_fields(s, fid, body.fields)
    s.commit()
    return _form_out(s, form, "zh")


@router.delete("/forms/{fid}", dependencies=[Depends(require_admin)])
def delete_form(fid: int, s: Session = Depends(get_session)):
    form = s.get(FormDef, fid)
    if not form:
        raise HTTPException(404, "表单不存在")
    for f in s.exec(select(FormField).where(FormField.form_id == fid)).all():
        s.delete(f)
    for sub in s.exec(select(FormSubmission).where(FormSubmission.form_id == fid)).all():
        s.delete(sub)
    s.delete(form)
    s.commit()
    return {"ok": True}


@router.post("/forms/{fid}/submit")
def submit_form(fid: int, body: SubmissionIn, s: Session = Depends(get_session)):
    form = s.get(FormDef, fid)
    if not form or not form.active:
        raise HTTPException(404, "表单不可用")
    s.add(FormSubmission(form_id=fid, data=dumps(body.data)))
    s.commit()
    return {"ok": True}


@router.get("/forms/{fid}/submissions", dependencies=[Depends(require_admin)])
def submissions(fid: int, s: Session = Depends(get_session)):
    rows = s.exec(
        select(FormSubmission).where(FormSubmission.form_id == fid)
        .order_by(FormSubmission.created_at.desc())
    ).all()
    return [
        {"id": r.id, "data": loads(r.data, {}), "created_at": r.created_at.isoformat()}
        for r in rows
    ]


@router.get("/forms/{fid}/export.csv", dependencies=[Depends(require_admin)])
def export_csv(fid: int, s: Session = Depends(get_session)):
    form = s.get(FormDef, fid)
    if not form:
        raise HTTPException(404, "表单不存在")
    fields = s.exec(
        select(FormField).where(FormField.form_id == fid)
        .order_by(FormField.sort_order, FormField.id)
    ).all()
    rows = s.exec(select(FormSubmission).where(FormSubmission.form_id == fid)).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["提交时间"] + [f.label_zh for f in fields])
    for r in rows:
        data = loads(r.data, {})
        line = [r.created_at.isoformat()]
        for f in fields:
            val = data.get(str(f.id), data.get(f.label_zh, ""))
            if isinstance(val, list):
                val = ", ".join(map(str, val))
            line.append(val)
        writer.writerow(line)

    buf.seek(0)
    content = "﻿" + buf.getvalue()  # BOM，便于 Excel 识别中文
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="form-{fid}.csv"'},
    )
