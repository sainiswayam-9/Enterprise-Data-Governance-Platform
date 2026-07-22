"""
Users Router – /users/*
========================

All user management endpoints (CRUD) for the RBAC system.

Permissions:
  hr      → POST /         create user
             GET  /         list all users
             GET  /{id}     get one user
             PUT  /{id}     update email/password/role
             PATCH /{id}/toggle-active
  manager → GET  /         list all users (read-only)
             GET  /{id}     get one user (read-only)
"""
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_service.database import get_db
from auth_service.dependencies import get_password_hash, require_roles
from auth_service.config import VALID_ROLES

router = APIRouter(prefix="/users", tags=["User Management"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateUserRequest(BaseModel):
    """
    To create a new user account(Role - HR).

    Args:
        username (str): The username for the new user.
        email (str): The email for the new user.
        password (str): The password for the new user.
        role (str): The role for the new user.

    Returns:
        dict: A dictionary containing the details of the created user.

    Raises:
        HTTPException (400): If the role is invalid.
        HTTPException (409): If the username or email is already taken.
    """
    username: str
    email:    str
    password: str
    role:     str   # "manager" | "salesperson" | "hr"


class UpdateUserRequest(BaseModel):
    """
    To update an existing user's email, password, or role.

    Args:
        email (str, optional): The new email for the user.
        password (str, optional): The new password for the user.
        role (str, optional): The new role for the user.

    Returns:
        dict: A dictionary containing the details of the updated user.

    Raises:
        HTTPException (400): If the role is invalid.
        HTTPException (409): If the new email is already in use by another user.
        HTTPException (404): If the user to update does not exist.
    """
    email:    Optional[str] = None
    password: Optional[str] = None
    role:     Optional[str] = None


def _fmt(u: dict) -> dict:
    """
    Formating to json serializable dict for user document. Converts ObjectId to string.

    Args:
        u (dict): The user document from the database.

    Returns:
        dict: A formatted dictionary with string ID and user details.
        Id, username, email, role, is_active, created_by, created_at

    Raises:
        KeyError: If the user document is missing required fields.
    """
    return {
        "id":         str(u["_id"]),
        "username":   u["username"],
        "email":      u["email"],
        "role":       u["role"],
        "is_active":  u.get("is_active", True),
        "created_by": u.get("created_by"),
        "created_at": str(u.get("created_at", "")),
    }


def _oid(user_id: str) -> ObjectId:
    """
    Convert a user ID string to a MongoDB ObjectId, with error handling.

    Args:
        user_id (str): The user ID as a string.

    Returns:
        ObjectId: The corresponding ObjectId for the user ID.

    Raises:
        HTTPException(400): If the user ID format is invalid and cannot be converted to ObjectId.
    """
    try:
        return ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")


def _validate_role(role: str) -> None:
    """
    Validate that the provided role is one of the allowed roles.

    Args:
        role (str): The role to validate.

    Returns:
        None.

    Raises:
        HTTPException(400): If the role is not valid.
    """
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{role}'. Valid roles: {', '.join(VALID_ROLES)}"
        )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/", summary="HR: create a new user")
def create_user(
    body: CreateUserRequest,
    current_user: dict = Depends(require_roles("hr")),
):
    """
    Create a new user account. Only HR can perform this action.

    Args:
        Doc: username(str), email(str), password(str), role(str), is_active(bool, default True).

    Returns:
        dict: A dictionary containing the details of the created user.(json serializable dict).

    Raises:
        HTTPException(400): If the role is invalid.
        HTTPException(409): If the username or email is already taken.
    """
    db = get_db()
    
    # Validate role
    _validate_role(body.role)
    
    # Check username and email uniqueness
    if db.users.find_one({"username": body.username}):
        raise HTTPException(
            status_code=409,
            detail=f"Username '{body.username}' already taken."
        )
    if db.users.find_one({"email": body.email}):
        raise HTTPException(
            status_code=409,
            detail=f"Email '{body.email}' already registered."
        )

    # Create user document
    doc = {
        "username":        body.username,
        "email":           body.email,
        "hashed_password": get_password_hash(body.password),
        "role":            body.role,
        "is_active":       True,
        "created_at":      datetime.now(),
        "created_by":      current_user["username"],
    }
    result = db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _fmt(doc)


@router.get("/", summary="HR / Manager: list all users")
def list_users(current_user: dict = Depends(require_roles("hr", "manager"))):
    """
    List all users. HR and Manager roles can access this.

    Args:
        None.

    Returns:
        List[dict]: A list of dictionaries, each containing the details of a user.

    Raises:
        None.
    """
    return [_fmt(u) for u in get_db().users.find().sort("username", 1)]


@router.get("/{user_id}", summary="HR / Manager: get one user")
def get_user(
    user_id: str,
    current_user: dict = Depends(require_roles("hr", "manager")),
):
    """
    Get details of a single user by ID. HR and Manager roles can access this.

    Args:
        user_id (str): The ID of the user to retrieve.

    Returns:
        dict: A dictionary containing the details of the requested user.

    Raises:
        HTTPException(404): If the user is not found.
    """
    u = get_db().users.find_one({"_id": _oid(user_id)})
    if not u:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    return _fmt(u)


@router.patch("/{user_id}/toggle-active", summary="HR: activate or deactivate a user")
def toggle_active(
    user_id: str,
    current_user: dict = Depends(require_roles("hr")),
):
    """
    Toggle a user's active status. Only HR can perform this action.

    Args:
        user_id (str): The ID of the user to toggle active status for.

    Returns:
        dict: A message about the new status, the user ID, and the new active status.

    Raises:
        HTTPException(404): If the user is not found.
        HTTPException(400): If the user tries to deactivate their own account.
    """
    db = get_db()
    
    # Prevent self-deactivation
    if str(current_user["_id"]) == user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate your own account."
        )

    # Get user
    u = db.users.find_one({"_id": _oid(user_id)})
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")

    # Toggle active status
    new_status = not u.get("is_active", True)
    db.users.update_one(
        {"_id": _oid(user_id)},
        {"$set": {"is_active": new_status}}
    )
    return {
        "message":   f"User '{u['username']}' is now {'active' if new_status else 'inactive'}.",
        "user_id":   user_id,
        "is_active": new_status,
    }


@router.put("/{user_id}", summary="HR: update email, password, or role")
def update_user(
    user_id: str,
    body: UpdateUserRequest,
    current_user: dict = Depends(require_roles("hr")),
):
    """
    Update user email, password, or role. Only HR can perform this action.

    Args:
        user_id (str): The ID of the user to update.
        body (UpdateUserRequest): The fields to update (email, password, role).

    Returns:
        dict: A dictionary containing the details of the updated user. email(str), password(str), role(str).

    Raises:
        HTTPException(404): If the user is not found.
        HTTPException(409): If the email is already in use.
        HTTPException(400): If the role is invalid.
    """
    db  = get_db()
    oid = _oid(user_id)
    u   = db.users.find_one({"_id": oid})
    
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")

    updates = {}
    
    # Validate and update email
    if body.email:
        if db.users.find_one({"email": body.email, "_id": {"$ne": oid}}):
            raise HTTPException(status_code=409, detail="Email already in use.")
        updates["email"] = body.email
    
    # Update password
    if body.password:
        updates["hashed_password"] = get_password_hash(body.password)
    
    # Validate and update role
    if body.role:
        _validate_role(body.role)
        updates["role"] = body.role

    # Apply updates
    if updates:
        db.users.update_one({"_id": oid}, {"$set": updates})

    # Return updated user
    updated = db.users.find_one({"_id": oid})
    return _fmt(updated)
