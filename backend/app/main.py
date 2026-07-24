from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS, UPLOAD_DIR
from .db import init_db
from .routers import (
    announcements,
    auth_router,
    comments,
    convert,
    forms,
    site,
    sponsor,
    tools,
    uploads,
)
from .seed import run_seed
from .traffic import TrafficMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    run_seed()
    yield


app = FastAPI(title="便利工具站 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrafficMiddleware)

for r in (auth_router, site, tools, announcements, forms, comments,
          sponsor, uploads, convert):
    app.include_router(r.router)

# 上传文件静态服务
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/api/health")
def health():
    return {"ok": True}
