from sqlmodel import Session, select

from .db import engine
from .models import Category, SiteConfig, Tool, ToolCategory

# (key, name_zh, name_en, desc_zh, desc_en, icon, runtime, tool_type)
_TOOLS = [
    # 文件格式转换
    ("pdf-merge", "PDF 合并", "Merge PDF",
     "把多个 PDF 合并成一个文件，可拖动排序。", "Combine multiple PDFs into one, reorderable.",
     "file-pdf", "front", "pdf-merge"),
    ("pdf-split", "PDF 拆分/删页", "Split / Remove PDF Pages",
     "提取或删除指定页面，导出新 PDF。", "Extract or remove selected pages.",
     "scissor", "front", "pdf-split"),
    ("word-to-pdf", "Word 转 PDF", "Word to PDF",
     "上传 .docx，由服务器转换为 PDF。", "Upload .docx, convert to PDF on server.",
     "file-word", "backend", "word-to-pdf"),
    ("ppt-to-pdf", "PPT 转 PDF", "PPT to PDF",
     "上传 .pptx，由服务器转换为 PDF。", "Upload .pptx, convert to PDF on server.",
     "file-ppt", "backend", "ppt-to-pdf"),
    ("excel-to-pdf", "Excel 转 PDF", "Excel to PDF",
     "上传 .xlsx，由服务器转换为 PDF。", "Upload .xlsx, convert to PDF on server.",
     "file-excel", "backend", "excel-to-pdf"),
    # 音频格式转换
    ("audio-convert", "音频格式转换", "Audio Converter",
     "MP3/WAV/OGG/M4A 等常见音频格式互转，浏览器内完成。",
     "Convert between MP3/WAV/OGG/M4A in your browser.",
     "audio", "front", "audio-convert"),
    # 视频格式转换
    ("mp4-to-gif", "MP4 转 GIF", "MP4 to GIF",
     "把视频片段转成 GIF 动图，浏览器内完成。", "Turn a video clip into a GIF, in your browser.",
     "gif", "front", "mp4-to-gif"),
    ("mp4-to-mp3", "MP4 转 MP3", "MP4 to MP3",
     "从视频中提取音频为 MP3，浏览器内完成。", "Extract audio from video as MP3, in your browser.",
     "video-camera", "front", "mp4-to-mp3"),
]

# key -> 分类名(zh)
_TOOL_CATEGORY = {
    "pdf-merge": "文件格式转换",
    "pdf-split": "文件格式转换",
    "word-to-pdf": "文件格式转换",
    "ppt-to-pdf": "文件格式转换",
    "excel-to-pdf": "文件格式转换",
    "audio-convert": "音频格式转换",
    "mp4-to-gif": "视频格式转换",
    "mp4-to-mp3": "视频格式转换",
}

_CATEGORIES = [
    ("文件格式转换", "File Conversion", "file-text"),
    ("音频格式转换", "Audio Conversion", "audio"),
    ("视频格式转换", "Video Conversion", "video-camera"),
]


def run_seed() -> None:
    with Session(engine) as s:
        if s.exec(select(SiteConfig)).first() is None:
            s.add(SiteConfig())

        cat_map: dict[str, Category] = {}
        for i, (zh, en, icon) in enumerate(_CATEGORIES):
            existing = s.exec(select(Category).where(Category.name_zh == zh)).first()
            if existing is None:
                existing = Category(name_zh=zh, name_en=en, icon=icon, sort_order=i)
                s.add(existing)
                s.commit()
                s.refresh(existing)
            cat_map[zh] = existing

        order_in_cat: dict[int, int] = {}
        for (key, nz, ne, dz, de, icon, runtime, ttype) in _TOOLS:
            tool = s.exec(select(Tool).where(Tool.key == key)).first()
            if tool is None:
                tool = Tool(key=key, name_zh=nz, name_en=ne, desc_zh=dz, desc_en=de,
                            icon=icon, runtime=runtime, tool_type=ttype)
                s.add(tool)
                s.commit()
                s.refresh(tool)
            cat = cat_map[_TOOL_CATEGORY[key]]
            link = s.exec(
                select(ToolCategory).where(
                    ToolCategory.tool_id == tool.id,
                    ToolCategory.category_id == cat.id,
                )
            ).first()
            if link is None:
                idx = order_in_cat.get(cat.id, 0)
                s.add(ToolCategory(tool_id=tool.id, category_id=cat.id, sort_order=idx))
                order_in_cat[cat.id] = idx + 1
        s.commit()
