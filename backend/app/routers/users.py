from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import (
    create_user, get_users, get_user_by_email,
    update_user_credentials, update_user_status, delete_user
)

router = APIRouter()

class UserCreateRequest(BaseModel):
    email: str
    role: str = "employee"

class UserCredentialsRequest(BaseModel):
    google_client_id: str

class UserStatusRequest(BaseModel):
    status: str

@router.post("/users")
def register_user(data: UserCreateRequest):
    user = create_user(data.email, data.role)
    if not user:
        raise HTTPException(status_code=500, detail="Failed to create user")
    return {"message": "User created", "email": user.email, "role": user.role}

@router.get("/users")
def list_users():
    return get_users()

@router.get("/users/{email}")
def get_user(email: str):
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{email}/credentials")
def update_credentials(email: str, data: UserCredentialsRequest):
    success = update_user_credentials(email, data.google_client_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found or update failed")
    return {"message": "Credentials updated"}

@router.put("/users/{email}/status")
def change_user_status(email: str, data: UserStatusRequest):
    success = update_user_status(email, data.status)
    if not success:
        raise HTTPException(status_code=404, detail="User not found or status update failed")
    return {"message": "Status updated"}

@router.delete("/users/{email}")
def remove_user(email: str):
    success = delete_user(email)
    if not success:
        raise HTTPException(status_code=404, detail="User not found or delete failed")
    return {"message": "User deleted"}
