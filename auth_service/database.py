"""auth_service/database.py — MongoDB connection for rbac_auth_db."""
from typing import Optional
from pymongo import MongoClient, ASCENDING
from pymongo.database import Database
from auth_service.config import MONGODB_URL, MONGODB_AUTH_DB_NAME

_client: Optional[MongoClient] = None


def get_db() -> Database:
    """
    Get the MongoDB database. Build connection.

    Args:
        None

    Returns:
        Database: The MongoDB database instance for rbac_auth_db.

    Raises:
        Exception: If there is an error connecting to the database.
    """
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URL)
    return _client[MONGODB_AUTH_DB_NAME]


def ensure_indexes() -> None:
    """
    Ensure that the necessary indexes exist on the users collection.

    Args:
        None

    Returns:
        None
        
    Raises:
        Exception: If there is an error creating indexes.
    """
    db = get_db()
    for idx in ("username_1", "email_1"):
        try:
            db.users.drop_index(idx)
        except Exception:
            pass
    db.users.create_index(
        [("username", ASCENDING)], unique=True, sparse=True, name="username_1"
    )
    db.users.create_index(
        [("email", ASCENDING)], unique=True, sparse=True, name="email_1"
    )