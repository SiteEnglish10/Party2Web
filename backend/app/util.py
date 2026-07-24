import json

import nh3

# 允许的富文本标签（留言/公告）
_ALLOWED_TAGS = {
    "p", "br", "b", "strong", "i", "em", "u", "s", "a", "ul", "ol", "li",
    "blockquote", "code", "pre", "h1", "h2", "h3", "h4", "span", "div",
    "img", "iframe", "figure",
}
_ALLOWED_ATTRS = {
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "width", "height"},
    "iframe": {"src", "width", "height", "allowfullscreen", "frameborder"},
    "span": {"style"},
    "div": {"style"},
}


def sanitize_html(html: str) -> str:
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRS,
        url_schemes={"http", "https", "data", "mailto"},
        link_rel="noopener noreferrer nofollow",
    )


def dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False)


def loads(s: str, default=None):
    try:
        return json.loads(s) if s else default
    except (json.JSONDecodeError, TypeError):
        return default
