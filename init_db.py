#!/usr/bin/env python3
"""
init_db.py
==========
Bootstrap MongoDB with default users.
Run once before starting the services:

    python init_db.py
"""
from datetime import datetime
from auth_service.database import get_db, ensure_indexes
from auth_service.dependencies import get_password_hash          # ← fixed: was auth_service.security
from auth_service.config import MONGODB_AUTH_DB_NAME, VALID_ROLES # ← fixed: VALID_ROLES lives here
from data_service.config import MONGODB_DATA_DB_NAME

DEFAULT_USERS = [
    {
        "username": "manager_admin",
        "email":    "manager@company.com",
        "password": "Manager@2024",
        "role":     "manager",
    },
    {
        "username": "hr_admin",
        "email":    "hr@company.com",
        "password": "HRAdmin@2024",
        "role":     "hr",
    },
    {
        "username": "sales_john",
        "email":    "john.sales@company.com",
        "password": "Sales@2024",
        "role":     "salesperson",
    },
]


def init():
    """
    Initialize MongoDB with default users and indexes.

    Args:
        None

    Returns:
        None
        
    Raises:
        pymongo.errors.ConnectionError: If the connection to MongoDB fails.
        pymongo.errors.PyMongoError: If there is an error creating indexes or inserting documents.
    """
    print("Connecting to MongoDB...")
    db = get_db()
    db.command("ping")
    print(f"Connected to auth database: '{db.name}'")

    print("\nCreating indexes...")
    ensure_indexes()
    print("Indexes ready.")

    print("\nSeeding default users...")
    for u in DEFAULT_USERS:
        if db.users.find_one({"username": u["username"]}):
            print(f"  [skip]  '{u['username']}' already exists")
            continue
        db.users.insert_one({
            "username":        u["username"],
            "email":           u["email"],
            "hashed_password": get_password_hash(u["password"]),
            "role":            u["role"],
            "is_active":       True,
            "created_at":      datetime.utcnow(),
            "created_by":      "system",
        })
        print(f"  [ok]    created '{u['username']}'  role={u['role']}")

    print("\n" + "=" * 50)
    print("  Default Credentials")
    print("=" * 50)
    for u in DEFAULT_USERS:
        print(f"  {u['role']:12s}  {u['username']:20s}  {u['password']}")
    print("=" * 50)
    print(f"\n  Auth DB : {MONGODB_AUTH_DB_NAME}")
    print(f"  Data DB : {MONGODB_DATA_DB_NAME}")
    print(f"  Collections: {db.list_collection_names()}")
    print("\nDone! Start the services:")
    print("  python run_auth.py   ← Terminal 1")
    print("  python run_data.py   ← Terminal 2")


if __name__ == "__main__":
    init()