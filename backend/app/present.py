"""把模型对象转换为按语言本地化的输出字典。"""
from .models import Announcement, Category, SiteConfig, Tool
from .util import loads


def _pick(zh: str, en: str, lang: str) -> str:
    return en if lang == "en" else zh


def tool_out(t: Tool, lang: str, usage: int = 0) -> dict:
    return {
        "id": t.id,
        "key": t.key,
        "name": _pick(t.name_zh, t.name_en, lang),
        "name_zh": t.name_zh,
        "name_en": t.name_en,
        "desc": _pick(t.desc_zh, t.desc_en, lang),
        "desc_zh": t.desc_zh,
        "desc_en": t.desc_en,
        "icon": t.icon,
        "runtime": t.runtime,
        "tool_type": t.tool_type,
        "config": loads(t.config, {}),
        "usage": usage,
    }


def category_out(c: Category, lang: str, tools: list[dict]) -> dict:
    return {
        "id": c.id,
        "name": _pick(c.name_zh, c.name_en, lang),
        "name_zh": c.name_zh,
        "name_en": c.name_en,
        "icon": c.icon,
        "sort_order": c.sort_order,
        "tools": tools,
    }


def announcement_out(a: Announcement, lang: str) -> dict:
    return {
        "id": a.id,
        "title": _pick(a.title_zh, a.title_en, lang),
        "title_zh": a.title_zh,
        "title_en": a.title_en,
        "body": _pick(a.body_zh, a.body_en, lang),
        "body_zh": a.body_zh,
        "body_en": a.body_en,
        "image_url": a.image_url,
        "sort_order": a.sort_order,
        "created_at": a.created_at.isoformat(),
    }


def site_out(cfg: SiteConfig, lang: str) -> dict:
    return {
        "site_name": cfg.site_name,
        "location": cfg.location,
        "sponsor_text": _pick(cfg.sponsor_text_zh, cfg.sponsor_text_en, lang),
        "sponsor_text_zh": cfg.sponsor_text_zh,
        "sponsor_text_en": cfg.sponsor_text_en,
        "sponsor_qr_url": cfg.sponsor_qr_url,
        "traffic_limit_gb": cfg.traffic_limit_gb,
    }
