from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..auth import require_admin
from ..db import get_session
from ..models import SiteConfig
from ..present import site_out
from ..schemas import SponsorIn
from ..traffic import get_month_usage
from ..util import sanitize_html

router = APIRouter(prefix="/api", tags=["sponsor"])


def _cfg(s: Session) -> SiteConfig:
    cfg = s.exec(select(SiteConfig)).first()
    if cfg is None:
        cfg = SiteConfig()
        s.add(cfg)
        s.commit()
        s.refresh(cfg)
    return cfg


@router.get("/sponsor")
def get_sponsor(lang: str = "zh", s: Session = Depends(get_session)):
    cfg = _cfg(s)
    used = get_month_usage()
    limit_bytes = cfg.traffic_limit_gb * 1024 ** 3
    data = site_out(cfg, lang)
    data["traffic"] = {
        "used_bytes": used,
        "limit_bytes": limit_bytes,
        "remaining_bytes": max(0, limit_bytes - used),
        "limit_gb": cfg.traffic_limit_gb,
    }
    return data


@router.put("/sponsor", dependencies=[Depends(require_admin)])
def update_sponsor(body: SponsorIn, lang: str = "zh", s: Session = Depends(get_session)):
    cfg = _cfg(s)
    cfg.sponsor_text_zh = sanitize_html(body.sponsor_text_zh)
    cfg.sponsor_text_en = sanitize_html(body.sponsor_text_en)
    s.add(cfg)
    s.commit()
    return site_out(cfg, lang)
