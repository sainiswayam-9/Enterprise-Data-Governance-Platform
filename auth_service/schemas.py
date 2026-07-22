from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    user_id: str          # MongoDB ObjectId as string


class VerifyResponse(BaseModel):
    valid: bool
    username: str
    user_id: str
    role: str


class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    role: str
    is_active: bool
    created_by: Optional[str] = None
