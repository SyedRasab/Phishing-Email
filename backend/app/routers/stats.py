from fastapi import APIRouter
from typing import Optional

from app.database import get_stats

router = APIRouter()

@router.get("/stats")
def scan_stats(user_email: Optional[str] = None):
    return get_stats(user_email)
