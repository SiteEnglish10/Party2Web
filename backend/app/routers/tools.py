from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlmodel import Session, select

from ..auth import require_admin
from ..db import get_session
from ..models import Category, Tool, ToolCategory, UsageEvent
from ..present import category_out, tool_out
from ..schemas import AssignIn, CategoryIn, ReorderIn, ToolIn
from ..util import dumps

router = APIRouter(prefix="/api", tags=["tools"])

_RANGE_DAYS = {"7d": 7, "30d": 30, "365d": 365}


def _usage_counts(s: Session, since: datetime | None = None) -> dict[int, int]:
    stmt = select(UsageEvent.tool_id, func.count(UsageEvent.id))
    if since is not None:
        stmt = stmt.where(UsageEvent.created_at >= since)
    stmt = stmt.group_by(UsageEvent.tool_id)
    return {tid: cnt for tid, cnt in s.exec(stmt).all()}


# ---------- 公共读取 ----------

@router.get("/categories")
def list_categories(lang: str = "zh", s: Session = Depends(get_session)):
    counts = _usage_counts(s)
    cats = s.exec(select(Category).order_by(Category.sort_order, Category.id)).all()
    out = []
    for c in cats:
        links = s.exec(
            select(ToolCategory)
            .where(ToolCategory.category_id == c.id)
            .order_by(ToolCategory.sort_order, ToolCategory.id)
        ).all()
        tools = []
        for link in links:
            t = s.get(Tool, link.tool_id)
            if t:
                tools.append(tool_out(t, lang, counts.get(t.id, 0)))
        out.append(category_out(c, lang, tools))
    return out


@router.get("/tools/recommended")
def recommended(lang: str = "zh", range: str = "all", s: Session = Depends(get_session)):
    since = None
    if range in _RANGE_DAYS:
        since = datetime.now(timezone.utc) - timedelta(days=_RANGE_DAYS[range])
    counts = _usage_counts(s, since)
    ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:10]
    out = []
    for tid, cnt in ranked:
        t = s.get(Tool, tid)
        if t:
            out.append(tool_out(t, lang, cnt))
    return out


@router.get("/tools/search")
def search(q: str = "", lang: str = "zh", s: Session = Depends(get_session)):
    q = q.strip()
    if not q:
        return []
    counts = _usage_counts(s)
    like = f"%{q}%"
    tools = s.exec(
        select(Tool).where(
            (Tool.name_zh.ilike(like))
            | (Tool.name_en.ilike(like))
            | (Tool.desc_zh.ilike(like))
            | (Tool.desc_en.ilike(like))
        )
    ).all()
    return [tool_out(t, lang, counts.get(t.id, 0)) for t in tools]


@router.post("/tools/{tool_id}/use")
def record_use(tool_id: int, s: Session = Depends(get_session)):
    t = s.get(Tool, tool_id)
    if not t:
        raise HTTPException(404, "工具不存在")
    s.add(UsageEvent(tool_id=tool_id))
    s.commit()
    cnt = s.exec(
        select(func.count(UsageEvent.id)).where(UsageEvent.tool_id == tool_id)
    ).one()
    return {"tool_id": tool_id, "usage": cnt}


# ---------- 管理员：分类 ----------

@router.post("/categories", dependencies=[Depends(require_admin)])
def create_category(body: CategoryIn, s: Session = Depends(get_session)):
    maxo = s.exec(select(func.max(Category.sort_order))).one() or 0
    c = Category(**body.model_dump(), sort_order=maxo + 1)
    s.add(c)
    s.commit()
    s.refresh(c)
    return category_out(c, "zh", [])


@router.put("/categories/{cid}", dependencies=[Depends(require_admin)])
def update_category(cid: int, body: CategoryIn, s: Session = Depends(get_session)):
    c = s.get(Category, cid)
    if not c:
        raise HTTPException(404, "分类不存在")
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    s.add(c)
    s.commit()
    return category_out(c, "zh", [])


@router.delete("/categories/{cid}", dependencies=[Depends(require_admin)])
def delete_category(cid: int, s: Session = Depends(get_session)):
    c = s.get(Category, cid)
    if not c:
        raise HTTPException(404, "分类不存在")
    for link in s.exec(select(ToolCategory).where(ToolCategory.category_id == cid)).all():
        s.delete(link)
    s.delete(c)
    s.commit()
    return {"ok": True}


@router.put("/categories/reorder", dependencies=[Depends(require_admin)])
def reorder_categories(body: ReorderIn, s: Session = Depends(get_session)):
    for i, cid in enumerate(body.ordered_ids):
        c = s.get(Category, cid)
        if c:
            c.sort_order = i
            s.add(c)
    s.commit()
    return {"ok": True}


@router.put("/categories/{cid}/reorder-tools", dependencies=[Depends(require_admin)])
def reorder_tools(cid: int, body: ReorderIn, s: Session = Depends(get_session)):
    for i, tid in enumerate(body.ordered_ids):
        link = s.exec(
            select(ToolCategory).where(
                ToolCategory.category_id == cid, ToolCategory.tool_id == tid
            )
        ).first()
        if link:
            link.sort_order = i
            s.add(link)
    s.commit()
    return {"ok": True}


# ---------- 管理员：工具 ----------

@router.post("/tools", dependencies=[Depends(require_admin)])
def create_tool(body: ToolIn, s: Session = Depends(get_session)):
    data = body.model_dump()
    category_id = data.pop("category_id", None)
    if isinstance(data.get("config"), (dict, list)):
        data["config"] = dumps(data["config"])
    t = Tool(**data)
    s.add(t)
    s.commit()
    s.refresh(t)
    if category_id:
        maxo = s.exec(
            select(func.max(ToolCategory.sort_order)).where(
                ToolCategory.category_id == category_id
            )
        ).one() or 0
        s.add(ToolCategory(tool_id=t.id, category_id=category_id, sort_order=maxo + 1))
        s.commit()
    return tool_out(t, "zh", 0)


@router.put("/tools/{tid}", dependencies=[Depends(require_admin)])
def update_tool(tid: int, body: ToolIn, s: Session = Depends(get_session)):
    t = s.get(Tool, tid)
    if not t:
        raise HTTPException(404, "工具不存在")
    data = body.model_dump()
    data.pop("category_id", None)
    if isinstance(data.get("config"), (dict, list)):
        data["config"] = dumps(data["config"])
    for k, v in data.items():
        setattr(t, k, v)
    s.add(t)
    s.commit()
    return tool_out(t, "zh", 0)


@router.delete("/tools/{tid}", dependencies=[Depends(require_admin)])
def delete_tool(tid: int, s: Session = Depends(get_session)):
    t = s.get(Tool, tid)
    if not t:
        raise HTTPException(404, "工具不存在")
    for link in s.exec(select(ToolCategory).where(ToolCategory.tool_id == tid)).all():
        s.delete(link)
    s.delete(t)
    s.commit()
    return {"ok": True}


@router.post("/tools/{tid}/assign", dependencies=[Depends(require_admin)])
def assign_tool(tid: int, body: AssignIn, from_category: int | None = Query(None),
                s: Session = Depends(get_session)):
    """把工具移动/复制到目标分类。
    mode=move 且提供 from_category 时，从原分类移除。"""
    t = s.get(Tool, tid)
    if not t:
        raise HTTPException(404, "工具不存在")
    exists = s.exec(
        select(ToolCategory).where(
            ToolCategory.tool_id == tid, ToolCategory.category_id == body.category_id
        )
    ).first()
    if not exists:
        maxo = s.exec(
            select(func.max(ToolCategory.sort_order)).where(
                ToolCategory.category_id == body.category_id
            )
        ).one() or 0
        s.add(ToolCategory(tool_id=tid, category_id=body.category_id, sort_order=maxo + 1))
    if body.mode == "move" and from_category and from_category != body.category_id:
        old = s.exec(
            select(ToolCategory).where(
                ToolCategory.tool_id == tid, ToolCategory.category_id == from_category
            )
        ).first()
        if old:
            s.delete(old)
    s.commit()
    return {"ok": True}
