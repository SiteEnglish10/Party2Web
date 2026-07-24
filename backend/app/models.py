from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Category(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name_zh: str
    name_en: str
    icon: str = "folder"
    sort_order: int = 0


class Tool(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    key: str = Field(index=True)
    name_zh: str
    name_en: str
    desc_zh: str = ""
    desc_en: str = ""
    icon: str = "tool"
    runtime: str = "front"          # front | backend
    tool_type: str = ""             # pdf-merge / word-to-pdf / mp4-to-gif ...
    config: str = "{}"              # JSON 字符串


class ToolCategory(SQLModel, table=True):
    """工具-分类 多对多，支持一个工具属于多个分类（复制移动）。"""
    id: int | None = Field(default=None, primary_key=True)
    tool_id: int = Field(index=True, foreign_key="tool.id")
    category_id: int = Field(index=True, foreign_key="category.id")
    sort_order: int = 0


class UsageEvent(SQLModel, table=True):
    """每次成功使用记录一条，用于时间段 Top10。"""
    id: int | None = Field(default=None, primary_key=True)
    tool_id: int = Field(index=True, foreign_key="tool.id")
    created_at: datetime = Field(default_factory=utcnow, index=True)


class Announcement(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title_zh: str
    title_en: str
    body_zh: str = ""
    body_en: str = ""
    image_url: str | None = None
    sort_order: int = 0
    created_at: datetime = Field(default_factory=utcnow)


class FormDef(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title_zh: str
    title_en: str
    active: bool = True
    sort_order: int = 0


class FormField(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    form_id: int = Field(index=True, foreign_key="formdef.id")
    label_zh: str
    label_en: str
    field_type: str = "text"        # text | textarea | radio | checkbox
    options: str = "[]"             # JSON: [{value_zh,value_en}]
    required: bool = False
    sort_order: int = 0


class FormSubmission(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    form_id: int = Field(index=True, foreign_key="formdef.id")
    data: str = "{}"                # JSON: {field_id: value}
    created_at: datetime = Field(default_factory=utcnow)


class Comment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    author_token: str = Field(index=True)
    author_name: str = "匿名"
    body: str = ""                  # 富文本 HTML（后端做净化）
    likes: int = 0
    created_at: datetime = Field(default_factory=utcnow)


class SiteConfig(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    site_name: str = "便利工具站"
    location: str = ""
    sponsor_text_zh: str = "感谢大家的支持与使用 ❤️"
    sponsor_text_en: str = "Thank you for your support ❤️"
    sponsor_qr_url: str | None = None
    traffic_limit_gb: int = 300


class TrafficStat(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    year_month: str = Field(index=True)   # "2026-07"
    bytes_used: int = 0
