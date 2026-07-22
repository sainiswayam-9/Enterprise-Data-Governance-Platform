"""
data_service/dependencies.py
=============================
JWT verification and role-based access control for data service.

  get_current_user   → decode Bearer JWT → return active user from auth MongoDB
  require_roles(...) → dependency factory that enforces role-based data access
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from data_service.database import get_auth_db
from data_service.config import SECRET_KEY, ALGORITHM

bearer_scheme = HTTPBearer()


def decode_token(token: str) -> dict:
    """
    Decode JWT token using the configured secret key and algorithm.

    Args:
        token (str): The JWT token to decode.

    Returns:
        dict: The decoded token payload.

    Raises:
        JWTError: If the token is invalid or expired."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Decode JWT token and return active user from MongoDB.

    Args:
        credentials (HTTPAuthorizationCredentials): The HTTP authorization credentials.

    Returns:
        dict: The active user from MongoDB.

    Raises:
        HTTPException(401): If the token is invalid/expired or the user is not found.
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

    user = get_auth_db().users.find_one({"username": username, "is_active": True})
    if not user:
        raise HTTPException(status_code=401, detail="User not found or deactivated.")
    return user


def require_roles(*roles: str):
    """
    Dependency factory to enforce role-based access control.

    Args:
        *roles (str): Allowed roles for the endpoint.

    Returns:
        Callable: A dependency function that checks the user's role.
        
    Raises:
        HTTPException(403): If the user's role is not in the allowed roles - access denied.
    """
    def checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. "
                    f"Required role(s): {', '.join(roles)}. "
                    f"Your role: {current_user['role']}."
                ),
            )
        return current_user

    return checker
