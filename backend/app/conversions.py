"""Office → PDF 后端异步转换（LibreOffice headless）。

任务保存在内存字典中，结果文件落盘到 JOB_DIR。生产可换成 Redis/RQ 等队列。
"""
import shutil
import subprocess
import threading
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from .config import JOB_DIR

# 支持的后端转换类型 → 目标扩展名
BACKEND_TOOLS: dict[str, str] = {
    "ppt-to-pdf": "pdf",
    "word-to-pdf": "pdf",
    "excel-to-pdf": "pdf",
}


@dataclass
class Job:
    id: str
    tool_type: str
    status: str = "queued"          # queued | running | done | error
    progress: int = 0
    error: str = ""
    src_path: Path | None = None
    out_path: Path | None = None
    out_name: str = "result.pdf"
    _lock: threading.Lock = field(default_factory=threading.Lock)


_jobs: dict[str, Job] = {}


def soffice_available() -> bool:
    return shutil.which("soffice") is not None or shutil.which("libreoffice") is not None


def _soffice_bin() -> str:
    return shutil.which("soffice") or shutil.which("libreoffice") or "soffice"


def create_job(tool_type: str, filename: str, content: bytes) -> Job:
    job_id = uuid.uuid4().hex[:12]
    workdir = JOB_DIR / job_id
    workdir.mkdir(parents=True, exist_ok=True)
    src = workdir / filename
    src.write_bytes(content)
    stem = Path(filename).stem
    job = Job(
        id=job_id,
        tool_type=tool_type,
        src_path=src,
        out_name=f"{stem}.pdf",
    )
    _jobs[job_id] = job
    threading.Thread(target=_run_job, args=(job,), daemon=True).start()
    return job


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


def _run_job(job: Job) -> None:
    with job._lock:
        job.status = "running"
        job.progress = 10
    if not soffice_available():
        job.status = "error"
        job.error = "服务器未安装 LibreOffice（soffice），无法进行 Office→PDF 转换。"
        return
    try:
        workdir = job.src_path.parent
        job.progress = 40
        result = subprocess.run(
            [
                _soffice_bin(), "--headless", "--norestore",
                "--convert-to", "pdf", "--outdir", str(workdir),
                str(job.src_path),
            ],
            capture_output=True,
            timeout=180,
        )
        out = workdir / f"{job.src_path.stem}.pdf"
        if result.returncode != 0 or not out.exists():
            job.status = "error"
            job.error = (result.stderr or b"").decode(errors="ignore")[:500] or "转换失败"
            return
        job.out_path = out
        job.progress = 100
        job.status = "done"
    except subprocess.TimeoutExpired:
        job.status = "error"
        job.error = "转换超时"
    except Exception as e:  # noqa: BLE001
        job.status = "error"
        job.error = str(e)[:500]
