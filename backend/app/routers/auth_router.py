from fastapi import APIRouter, HTTPException, Request

from ..auth import is_admin, make_token, verify_credentials
from ..schemas import LoginIn

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginIn):
    if not verify_credentials(body.username, body.password):
        raise HTTPException(401, "账号或密码错误")
    return {"token": make_token(), "role": "admin"}


@router.get("/me")
def me(request: Request):
    return {"is_admin": is_admin(request)}
