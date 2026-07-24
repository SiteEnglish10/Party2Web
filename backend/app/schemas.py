from pydantic import BaseModel


class LoginIn(BaseModel):
    username: str
    password: str


class SiteIn(BaseModel):
    site_name: str
    location: str = ""
    traffic_limit_gb: int = 300


class CategoryIn(BaseModel):
    name_zh: str
    name_en: str
    icon: str = "folder"


class ToolIn(BaseModel):
    key: str
    name_zh: str
    name_en: str
    desc_zh: str = ""
    desc_en: str = ""
    icon: str = "tool"
    runtime: str = "front"
    tool_type: str = ""
    config: str = "{}"
    category_id: int | None = None   # 创建时可直接归入某分类


class AssignIn(BaseModel):
    category_id: int
    mode: str = "move"               # move | copy


class ReorderIn(BaseModel):
    ordered_ids: list[int]


class AnnouncementIn(BaseModel):
    title_zh: str
    title_en: str
    body_zh: str = ""
    body_en: str = ""
    image_url: str | None = None


class FormFieldIn(BaseModel):
    label_zh: str
    label_en: str
    field_type: str = "text"
    options: list[dict] = []
    required: bool = False


class FormIn(BaseModel):
    title_zh: str
    title_en: str
    active: bool = True
    fields: list[FormFieldIn] = []


class SubmissionIn(BaseModel):
    data: dict


class CommentIn(BaseModel):
    author_token: str
    author_name: str = "匿名"
    body: str = ""


class SponsorIn(BaseModel):
    sponsor_text_zh: str
    sponsor_text_en: str
