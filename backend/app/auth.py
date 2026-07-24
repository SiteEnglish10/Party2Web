from fastapi import Depends, HTTPException, Request, status
from itsdangerous import BadSignature, URLSafeTimedSerializer

from .config import ADMIN_PASSWORD, ADMIN_USERNAME, SECRET_KEY

_serializer = URLSafeTimedSerializer(SECRET_KEY, salt="admin-session")
SESSION_MAX_AGE = 60 * 60 * 12  # 12 小时


def verify_credentials(username: str, password: str) -> bool:
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD


def make_token() -> str:
    return _serializer.dumps({"role": "admin"})


def _token_valid(token: str | None) -> bool:
    if not token:
        return False
    try:
        _serializer.loads(token, max_age=SESSION_MAX_AGE)
        return True
    except (BadSignature, Exception):
        return False


def is_admin(request: Request) -> bool:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    return _token_valid(token)


def require_admin(request: Request) -> None:
    if not is_admin(request):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要管理员权限",
        )


AdminDep = Depends(require_admin)
