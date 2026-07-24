import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, select

from ..auth import require_admin
from ..config import MAX_IMAGE_BYTES, UPLOAD_DIR
from ..db import get_session
from ..models import SiteConfig

router = APIRouter(prefix="/api", tags=["uploads"])

_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


def _save_image(file: UploadFile) -> str:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _IMAGE_EXT:
        raise HTTPException(400, "仅支持 png/jpg/gif/webp 图片")
    content = file.file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "图片超过 5MB 限制")
    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(content)
    return f"/uploads/{name}"


@router.post("/uploads/image")
def upload_image(file: UploadFile = File(...)):
    """留言/公告配图上传（≤5MB）。"""
    return {"url": _save_image(file)}


@router.post("/uploads/qr", dependencies=[Depends(require_admin)])
def upload_qr(file: UploadFile = File(...), s: Session = Depends(get_session)):
    url = _save_image(file)
    cfg = s.exec(select(SiteConfig)).first()
    if cfg:
        cfg.sponsor_qr_url = url
        s.add(cfg)
        s.commit()
    return {"url": url}
