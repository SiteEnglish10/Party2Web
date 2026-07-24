# 便利工具站后端镜像：内置 LibreOffice(Office→PDF) 与 ffmpeg
FROM python:3.12-slim

# 系统依赖：LibreOffice 无头转换 + ffmpeg + 中文字体
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer libreoffice-calc libreoffice-impress \
    ffmpeg fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev

COPY app ./app

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
