from fastapi import APIRouter, Depends

from core.auth import get_current_user_id

router = APIRouter()


@router.get("/api/me")
async def me(user_id: str = Depends(get_current_user_id)):
    return {"user_id": user_id}
