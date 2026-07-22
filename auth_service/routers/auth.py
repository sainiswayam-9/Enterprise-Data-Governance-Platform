"""
Auth Router – /auth/*
======================

Core authentication endpoints (login, verify, get current user).
"""
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Query
from jose import JWTError

from auth_service.database import get_db
from auth_service.dependencies import verify_password, create_access_token, decode_token
from auth_service.config import ACCESS_TOKEN_EXPIRE_MINUTES
from auth_service.schemas import LoginRequest, TokenResponse, VerifyResponse, UserInfo

router = APIRouter(prefix="/auth", tags=["Authentication"])   # ← fixed: was /AUTH


# ── Helper ────────────────────────────────────────────────────────────────────

def _find_user(username: str) -> Optional[dict]:             # ← fixed: was dict | None
    """
    Helper function to find a user by username.

    Args:
        username (str): The username to search for in the database

    Returns:
        Optional(dict) | None: The user document if found, otherwise None
    """
    return get_db().users.find_one({"username": username})


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse, summary="Login and get JWT")
def login(credentials: LoginRequest):
    """
    API endpoint for login request and JWT tokens

    Args:
        username (str): username to login to JWT
        password (str): password to login to JWT

    Returns:
        str: jwt token  
        
    Raises:
        HttpException (401) : Invalid username or password.
        HTTPException (403) : User not found or inactive.
    """
    
    user = _find_user(credentials.username)

    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account deactivated. Contact HR.")

    token = create_access_token(
        data={
            "sub":     user["username"],
            "user_id": str(user["_id"]),
            "role":    user["role"],
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=token,
        username=user["username"],
        role=user["role"],
        user_id=str(user["_id"]),
    )


@router.get("/verify", response_model=VerifyResponse, summary="Verify a JWT")
def verify_token(token: str = Query(..., description="The JWT to verify")):
    """
    API endpoint to verify a JWT token and return user info if valid.

    Args:
        token (str): The JWT token to verify

    Returns:
        VerifyResponse(Object): valid(bool), username(str), user_id(str), role(str))

    Raises:
        HTTPException(401): wrong username or password
        HTTPException(401): If token is invalid / expired, or user not found/inactive
    """
    try:
        payload = decode_token(token)
        username = payload.get("sub", "")
        if not username:
            raise HTTPException(status_code=401, detail="Token missing 'sub'.")
        user = _find_user(username)
        if not user or not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="User not found or inactive.")
        return VerifyResponse(
            valid=True,
            username=user["username"],
            user_id=str(user["_id"]),
            role=user["role"],
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {exc}")


@router.get("/me", response_model=UserInfo, summary="Get current user info")
def get_me(token: str = Query(..., description="The JWT")):
    """
    API endpoint to get current user info from a valid JWT token.

    Args:
        token (str): The JWT token to decode and get user information

    Returns:
        UserInfo(Object): id(str), username(str), email(str), role(str), is_active(bool), created_by(str)
        
    Raises:
        HTTPException(404): If user is not found
        HTTPException(401): If token is invalid or expired
    """
    try:
        payload = decode_token(token)
        user = _find_user(payload.get("sub", ""))
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        return UserInfo(
            id=str(user["_id"]),
            username=user["username"],
            email=user["email"],
            role=user["role"],
            is_active=user.get("is_active", True),
            created_by=user.get("created_by"),
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token.")