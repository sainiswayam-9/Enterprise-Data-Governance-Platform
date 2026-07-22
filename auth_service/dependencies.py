"""
auth_service/dependencies.py
=============================
JWT security utilities, token management, and role-based access control.

Functions:
  verify_password()     → verify plain text password against hash
  get_password_hash()   → hash password using bcrypt
  create_access_token() → create signed JWT token
  decode_token()        → decode and validate JWT token
  get_current_user()    → FastAPI dependency for JWT authentication
  require_roles()       → FastAPI dependency for role-based access control
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext

from auth_service.database import get_db
from auth_service.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# ── Password Hashing ──────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a plain text password against a hashed password.

    Args:
        plain (str): The plain text password to verify.
        hashed (str): The hashed password to compare against.

    Returns:
        bool: True if the password is correct, False otherwise.
    
    Raises:
        None
    """
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    """
    Hash a plain text password using bcrypt.

    Args:
        password (str): The plain text password to hash.

    Returns:
        str: The hashed password.

    Raises:
        None
    """
    return pwd_context.hash(password)


# ── JWT Token Management ──────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token with an optional expiration time.

    Args:
        None.

    Returns:
        str: The signed JWT token.

    Raises:
        None
    """
    payload = data.copy()
    payload["exp"] = datetime.now() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.

    Args:
        token (str): The JWT token to decode.

    Returns:
        dict: The decoded token payload.

    Raises:
        JWTError: If the token is invalid or expired.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# ── FastAPI Dependencies ──────────────────────────────────────────────────────

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency to get the current user from a JWT token in the Authorization header.
    
    Args:
        credentials (HTTPAuthorizationCredentials): The credentials extracted from the Authorization header.

    Returns:
        dict: The user document from the database corresponding to the token's "sub" claim.

    Raises:
        HTTPException(401): If the token is invalid, expired, or the user is not found/inactive.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Token missing 'sub' claim.")
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_db().users.find_one({"username": username, "is_active": True})
    if not user:
        raise HTTPException(status_code=401, detail="User not found or deactivated.")
    return user


def require_roles(*roles: str):
    """
    Checks if the current user's role is allowed i.e manager, hr, employee.

    Args:
        roles (str): Variable length argument list of allowed roles.

    Returns:
        A FastAPI dependency function that checks the user's role against the allowed roles.
        dict: The current user document if the role is allowed.

    Raises:
        HTTPException(403): If the user's role is not in the allowed roles.
    """
    def checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{current_user['role']}' not permitted. Required: {', '.join(roles)}",
            )
        return current_user

    return checker