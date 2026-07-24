from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import Session, select

from ..auth import require_admin
from ..db import get_session
from ..models import Announcement
from ..present import announcement_out
from ..schemas import AnnouncementIn
from ..util import sanitize_html

router = APIRouter(prefix="/api", tags=["announcements"])


@router.get("/announcements")
def list_announcements(lang: str = "zh", s: Session = Depends(get_session)):
    rows = s.exec(
        select(Announcement).order_by(Announcement.sort_order, Announcement.id.desc())
    ).all()
    return [announcement_out(a, lang) for a in rows]


@router.get("/announcements/{aid}")
def get_announcement(aid: int, lang: str = "zh", s: Session = Depends(get_session)):
    a = s.get(Announcement, aid)
    if not a:
        raise HTTPException(404, "公告不存在")
    return announcement_out(a, lang)


@router.post("/announcements", dependencies=[Depends(require_admin)])
def create_announcement(body: AnnouncementIn, s: Session = Depends(get_session)):
    maxo = s.exec(select(func.max(Announcement.sort_order))).one() or 0
    a = Announcement(
        title_zh=body.title_zh, title_en=body.title_en,
        body_zh=sanitize_html(body.body_zh), body_en=sanitize_html(body.body_en),
        image_url=body.image_url, sort_order=maxo + 1,
    )
    s.add(a)
    s.commit()
    s.refresh(a)
    return announcement_out(a, "zh")


@router.put("/announcements/{aid}", dependencies=[Depends(require_admin)])
def update_announcement(aid: int, body: AnnouncementIn, s: Session = Depends(get_session)):
    a = s.get(Announcement, aid)
    if not a:
        raise HTTPException(404, "公告不存在")
    a.title_zh, a.title_en = body.title_zh, body.title_en
    a.body_zh, a.body_en = sanitize_html(body.body_zh), sanitize_html(body.body_en)
    a.image_url = body.image_url
    s.add(a)
    s.commit()
    return announcement_out(a, "zh")


@router.delete("/announcements/{aid}", dependencies=[Depends(require_admin)])
def delete_announcement(aid: int, s: Session = Depends(get_session)):
    a = s.get(Announcement, aid)
    if not a:
        raise HTTPException(404, "公告不存在")
    s.delete(a)
    s.commit()
    return {"ok": True}
