import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
JOB_DIR = DATA_DIR / "jobs"

for _d in (DATA_DIR, UPLOAD_DIR, JOB_DIR):
    _d.mkdir(parents=True, exist_ok=True)

DB_URL = f"sqlite:///{(DATA_DIR / 'app.db').as_posix()}"


def _load_dotenv() -> None:
    """极简 .env 加载：把 backend/.env 里的 KEY=VALUE 注入环境变量（不覆盖已存在的）。
    生产用 docker-compose 传环境变量；本地开发用 backend/.env（已被 .gitignore 排除）。"""
    envf = BASE_DIR / ".env"
    if not envf.exists():
        return
    for line in envf.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()

# 管理员凭据与会话密钥：从环境变量读取。
# 默认值仅供本地开发，切勿用于生产 —— 生产请通过 .env / 环境变量设置强口令与随机密钥。
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "root")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-not-for-production")

# 上传限制
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB
MAX_CONVERT_BYTES = 100 * 1024 * 1024  # 100MB

# 允许的前端来源
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
