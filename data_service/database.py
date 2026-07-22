"""data_service/database.py — MongoDB connections for both databases."""
from typing import Optional
from pymongo import MongoClient, ASCENDING
from pymongo.database import Database
from data_service.config import MONGODB_URL, MONGODB_AUTH_DB_NAME, MONGODB_DATA_DB_NAME

_client: Optional[MongoClient] = None


def _get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URL)
    return _client


def get_auth_db() -> Database:
    """
    auth_db — users + groups collections.
        
    Args:
        None

    Returns:
        Database: MongoDB database object for the auth database.

    Raises:
        pymongo.errors.ConnectionError: If the connection to MongoDB fails.
    """
    return _get_client()[MONGODB_AUTH_DB_NAME]


def get_data_db() -> Database:
    """
    data_db — change_requests collection.

    Args:
        None

    Returns:
        Database: MongoDB database object for the data database.

    Raises:
        pymongo.errors.ConnectionError: If the connection to MongoDB fails.
    """
    return _get_client()[MONGODB_DATA_DB_NAME]


def ensure_indexes() -> None:
    """
    Ensure indexes for the collections in both databases.
    
    Args:
        None

    Returns:
        None
        
    Raises:
        pymongo.errors.PyMongoError: If there is an error creating indexes.
    """
    get_data_db().change_requests.create_index([("status", ASCENDING)])
    get_data_db().change_requests.create_index([("requester_username", ASCENDING)])