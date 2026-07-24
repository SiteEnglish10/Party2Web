from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import require_admin
from ..db import get_session
from ..models import Comment
from ..schemas import CommentIn
from ..util import sanitize_html

router = APIRouter(prefix="/api", tags=["comments"])


def _out(c: Comment) -> dict:
    return {
        "id": c.id,
        "author_name": c.author_name,
        "author_token": c.author_token,
        "body": c.body,
        "likes": c.likes,
        "created_at": c.created_at.isoformat(),
    }


@router.get("/comments")
def list_comments(s: Session = Depends(get_session)):
    rows = s.exec(
        select(Comment).order_by(Comment.likes.desc(), Comment.created_at.desc())
    ).all()
    return [_out(c) for c in rows]


@router.post("/comments")
def create_comment(body: CommentIn, s: Session = Depends(get_session)):
    clean = sanitize_html(body.body)
    if not clean.strip():
        raise HTTPException(400, "留言内容不能为空")
    c = Comment(
        author_token=body.author_token,
        author_name=(body.author_name or "匿名")[:40],
        body=clean,
    )
    s.add(c)
    s.commit()
    s.refresh(c)
    return _out(c)


@router.post("/comments/{cid}/like")
def like_comment(cid: int, s: Session = Depends(get_session)):
    c = s.get(Comment, cid)
    if not c:
        raise HTTPException(404, "留言不存在")
    c.likes += 1  # 需求：点赞不去重
    s.add(c)
    s.commit()
    return {"id": cid, "likes": c.likes}


@router.delete("/comments/{cid}", dependencies=[Depends(require_admin)])
def delete_comment(cid: int, s: Session = Depends(get_session)):
    c = s.get(Comment, cid)
    if not c:
        raise HTTPException(404, "留言不存在")
    s.delete(c)
    s.commit()
    return {"ok": True}
