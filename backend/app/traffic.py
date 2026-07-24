from datetime import datetime, timezone

from sqlmodel import Session, select
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from .db import engine
from .models import TrafficStat


def _current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def add_traffic(nbytes: int) -> None:
    if nbytes <= 0:
        return
    ym = _current_month()
    with Session(engine) as s:
        stat = s.exec(select(TrafficStat).where(TrafficStat.year_month == ym)).first()
        if stat is None:
            stat = TrafficStat(year_month=ym, bytes_used=0)
        stat.bytes_used += nbytes
        s.add(stat)
        s.commit()


def get_month_usage() -> int:
    ym = _current_month()
    with Session(engine) as s:
        stat = s.exec(select(TrafficStat).where(TrafficStat.year_month == ym)).first()
        return stat.bytes_used if stat else 0


class TrafficMiddleware(BaseHTTPMiddleware):
    """累加经过后端的请求体 + 响应体字节，用于赞助页流量展示。
    浏览器端 WASM 工具不经过后端，天然不计入。"""

    async def dispatch(self, request: Request, call_next):
        req_len = int(request.headers.get("content-length", 0) or 0)
        response = await call_next(request)
        resp_len = int(response.headers.get("content-length", 0) or 0)
        try:
            add_traffic(req_len + resp_len)
        except Exception:
            pass
        return response
