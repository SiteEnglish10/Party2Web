from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..config import MAX_CONVERT_BYTES
from ..conversions import BACKEND_TOOLS, create_job, get_job, soffice_available

router = APIRouter(prefix="/api/convert", tags=["convert"])


@router.get("/capabilities")
def capabilities():
    return {"soffice": soffice_available(), "tools": list(BACKEND_TOOLS)}


@router.post("/{tool_type}")
async def submit(tool_type: str, file: UploadFile = File(...)):
    if tool_type not in BACKEND_TOOLS:
        raise HTTPException(404, "不支持的转换类型")
    content = await file.read()
    if len(content) > MAX_CONVERT_BYTES:
        raise HTTPException(413, "文件超过 100MB 限制")
    if not content:
        raise HTTPException(400, "空文件")
    job = create_job(tool_type, file.filename or "input", content)
    return {"job_id": job.id, "status": job.status}


@router.get("/jobs/{job_id}")
def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "任务不存在")
    return {
        "job_id": job.id,
        "status": job.status,
        "progress": job.progress,
        "error": job.error,
        "download_ready": job.status == "done",
    }


@router.get("/jobs/{job_id}/download")
def download(job_id: str):
    job = get_job(job_id)
    if not job or job.status != "done" or not job.out_path:
        raise HTTPException(404, "结果不可用")
    return FileResponse(
        job.out_path, media_type="application/pdf", filename=job.out_name
    )
