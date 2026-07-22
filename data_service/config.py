"""data_service/config.py — reads .env for the data service."""
from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY                  = os.getenv("SECRET_KEY")
ALGORITHM                   = os.getenv("ALGORITHM", "HS256")
MONGODB_URL                 = os.getenv("MONGODB_URL")
MONGODB_AUTH_DB_NAME        = os.getenv("MONGODB_AUTH_DB_NAME")   # users collection
MONGODB_DATA_DB_NAME        = os.getenv("MONGODB_DATA_DB_NAME")   # change_requests collection
DATA_SERVICE_PORT           = int(os.getenv("DATA_SERVICE_PORT", "8000"))

_missing = [k for k, v in {
    "SECRET_KEY": SECRET_KEY, "MONGODB_URL": MONGODB_URL,
    "MONGODB_AUTH_DB_NAME": MONGODB_AUTH_DB_NAME,
    "MONGODB_DATA_DB_NAME": MONGODB_DATA_DB_NAME,
}.items() if not v]
if _missing:
    raise RuntimeError(f"Missing env vars: {', '.join(_missing)}")

# App constants
DATA_DIR              = BASE_DIR / "data"
PREDEFINED_CATEGORIES = ["salon", "supermarket", "restaurant", "pharmacy", "electronics"]
