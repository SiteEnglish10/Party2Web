from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..auth import require_admin
from ..db import get_session
from ..models import SiteConfig
from ..present import site_out
from ..schemas import SiteIn

router = APIRouter(prefix="/api", tags=["site"])


def _get_or_create(s: Session) -> SiteConfig:
    cfg = s.exec(select(SiteConfig)).first()
    if cfg is None:
        cfg = SiteConfig()
        s.add(cfg)
        s.commit()
        s.refresh(cfg)
    return cfg


@router.get("/site")
def get_site(lang: str = "zh", s: Session = Depends(get_session)):
    return site_out(_get_or_create(s), lang)


@router.put("/site", dependencies=[Depends(require_admin)])
def update_site(body: SiteIn, lang: str = "zh", s: Session = Depends(get_session)):
    cfg = _get_or_create(s)
    cfg.site_name = body.site_name
    cfg.location = body.location
    cfg.traffic_limit_gb = body.traffic_limit_gb
    s.add(cfg)
    s.commit()
    return site_out(cfg, lang)
