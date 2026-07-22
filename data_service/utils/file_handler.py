"""
data_service/utils/file_handler.py
====================================
All CSV / Excel read-write operations backed by MongoDB.

Rules:
• Each category maps to a MongoDB collection in rbac_data_db
• Upload to existing category → appends documents
• Upload to new category      → creates collection implicitly
• Every uploaded document gets: added_by, added_by_role, uploaded_at
• Documents are identified by MongoDB _id (returned as string "id")
• Search by any field using regex (case-insensitive)
• Download converts collection → CSV in-memory (no file on disk)
"""
import io
import os
from datetime import datetime
from typing import Optional, List, Tuple          # ← fixed: use typing module for 3.8 compat

import pandas as pd
from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from data_service.database import get_data_db


# ── Internal helpers ──────────────────────────────────────────────────────────

def _col(category: str):
    """
    Convert category name to MongoDB collection, applying a safe naming convention.

    Args:
        category (str): The category name to convert

    Returns:
        MongoDB collection object corresponding to the category

    Raises:
        None
    """
    safe = category.lower().strip().replace(" ", "_")
    return get_data_db()[safe]


def _serialize(docs: List[dict]) -> List[dict]:   # ← fixed: List[dict] not list[dict]
    """
    Convert MongoDB documents to JSON-serializable dicts with 'id' instead of '_id'.

    Args:
        docs (List[dict]): List of MongoDB documents to serialize

    Returns:
        List[dict]: List of JSON-serializable dictionaries
    """
    for d in docs:
        d["id"] = str(d.pop("_id"))
        # float('nan') is not valid JSON — replace with None
        for k, v in list(d.items()):
            if isinstance(v, float) and v != v:   # NaN is the only float where v != v
                d[k] = None
    return docs


def _parse_oid(doc_id: str) -> ObjectId:
    """
    Convert a document ID string back to ObjectId, validating format.

    Args:
        doc_id (str): The document ID string to convert

    Returns:
        ObjectId: The corresponding ObjectId instance

    Raises:
        ValueError: If the provided doc_id is not a valid ObjectId string
    """
    try:
        return ObjectId(doc_id)
    except (InvalidId, TypeError):
        raise ValueError(f"Invalid document ID '{doc_id}'.")


# ── Category helpers ──────────────────────────────────────────────────────────

def list_categories() -> List[str]:               # ← fixed: List[str] not list[str]
    """
    List all category names by inspecting MongoDB collections.

    Args:
        None

    Returns:
        List[str]: A sorted list of category names (collection names)

    Raises:
        None
    """
    db = get_data_db()
    return sorted([
        name for name in db.list_collection_names()
        if name != "change_requests" and not name.startswith("system.")
    ])


def category_exists(category: str) -> bool:
    """
    Check if a category exists by verifying if its collection has any documents.

    Args:
        category (str): The category name to check

    Returns:
        bool: True if the category exists (has documents), False otherwise

    Raises:
        None"""
    return _col(category).count_documents({}) > 0


def get_field_names(category: str) -> List[str]:  # ← fixed: List[str] not list[str]
    """
    Get field names for a category by inspecting the first document.

    Args:
        category (str): The category name to inspect

    Returns:
        List[str]: A list of field names in the category (excluding metadata fields)

    Raises:
        KeyError: If the category does not exist or has no documents
    """
    doc = _col(category).find_one({}, {"_id": 0,
                                        "added_by": 0,
                                        "added_by_role": 0,
                                        "uploaded_at": 0})
    return list(doc.keys()) if doc else []


# ── Upload / Append ───────────────────────────────────────────────────────────

def upload_data(
    file_content: bytes,
    filename: str,
    category: str,
    added_by: str,
    added_by_role: str,
) -> dict:
    """
    Upload a CSV or Excel file, appending its rows to the specified category.

    Args:
        file_content (bytes): The content of the uploaded file as bytes
        filename (str): The name of the uploaded file (used to determine format)
        category (str): The category to which the data should be appended
        added_by (str): The identifier of the user uploading the data
        added_by_role (str): The role of the user uploading the data

    Returns:
        dict: A summary of the upload action, (action, category, rows_added, total_rows).

    Raises:
        ValueError: If the file format is unsupported, the file has no data rows, or if there are issues with the data processing
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(io.BytesIO(file_content))
    elif ext in (".xlsx", ".xls"):
        df = pd.read_excel(io.BytesIO(file_content))
    else:
        raise ValueError(f"Unsupported format '{ext}'. Allowed: .csv, .xlsx, .xls")

    if df.empty:
        raise ValueError("Uploaded file has no data rows.")

    # Strip any pre-existing metadata columns
    meta = {"added_by", "added_by_role", "uploaded_at"}
    df = df.drop(columns=[c for c in meta if c in df.columns], errors="ignore")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    records = df.to_dict(orient="records")

    for rec in records:
        for k, v in list(rec.items()):
            if isinstance(v, float) and v != v:   # NaN is the only float where v != v
                rec[k] = None
        rec["added_by"]      = added_by
        rec["added_by_role"] = added_by_role
        rec["uploaded_at"]   = now

    col = _col(category)
    existing = col.count_documents({})
    col.insert_many(records)

    action = "appended" if existing > 0 else "created"
    return {
        "action":     action,
        "category":   category,
        "rows_added": len(records),
        "total_rows": existing + len(records),
    }


# ── Read (paginated) ──────────────────────────────────────────────────────────

def read_category_data(
    category: str,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[dict], int]:
    """
    Get a list of documents from a category, along with the total count.

    Args:
        category (str): The category name to read from
        skip (int): The number of documents to skip for pagination
        limit (int): The maximum number of documents to return

    Returns:
        Tuple[List[dict], int]: A tuple containing a list of serialized documents and the total document count

    Raises:
        None
    """
    col = _col(category)
    total = col.count_documents({})
    docs  = list(col.find({}).skip(skip).limit(limit))
    return _serialize(docs), total


# ── Search ────────────────────────────────────────────────────────────────────

def search_data(
    category: str,
    q: str,
    field: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[dict], int]:
    """
    Search for documents in a category matching a query string, with optional field targeting.

    Args:
        category (str): The category name to search within
        q (str): The query string to search for (case-insensitive regex)
        field (Optional[str]): The specific field to search in; if None, searches all string fields
        skip (int): The number of documents to skip for pagination
        limit (int): The maximum number of documents to return

    Returns:
        Tuple[List[dict], int]: A tuple containing a list of serialized documents matching the search and the total count of matches

    Raises:
        None
    """
    col = _col(category)

    if field:
        query: dict = {field: {"$regex": q, "$options": "i"}}
    else:
        # Auto-detect string fields from first document
        sample = col.find_one({})
        if not sample:
            return [], 0
        text_fields = [
            k for k, v in sample.items()
            if k != "_id" and isinstance(v, str)
        ]
        if not text_fields:
            return [], 0
        query = {"$or": [{f: {"$regex": q, "$options": "i"}} for f in text_fields]}

    total = col.count_documents(query)
    docs  = list(col.find(query).skip(skip).limit(limit))
    return _serialize(docs), total


# ── Download as CSV ───────────────────────────────────────────────────────────

def get_all_as_csv(category: str) -> str:
    """
    Get all documents in a category as a CSV string.

    Args:
        category (str): The category name to export

    Returns:
        str: A CSV string representing all documents in the category, or an empty string if no documents exist

    Raises:
        None
    """
    docs = list(_col(category).find({}))
    if not docs:
        return ""
    for d in docs:
        d.pop("_id")
    df = pd.DataFrame(docs)
    return df.to_csv(index=False)


# ── Update ────────────────────────────────────────────────────────────────────

def update_document(category: str, doc_id: str, updates: dict) -> dict:
    """
    Update a single document with new values, returning the updated document.

    Args:
        category (str): The category of the document to update
        doc_id (str): The ID of the document to update
        updates (dict): A dictionary of fields to update with their new values

    Returns:
        dict: The updated document after applying the changes

    Raises:
        ValueError: If no valid fields are provided for update (all fields are protected)
        KeyError: If the document with the specified ID does not exist in the category
    """
    protected = {"_id", "id", "added_by", "added_by_role", "uploaded_at"}
    clean = {k: v for k, v in updates.items() if k not in protected}
    if not clean:
        raise ValueError("No valid fields to update (protected fields were filtered out).")

    col     = _col(category)
    oid     = _parse_oid(doc_id)
    updated = col.find_one_and_update(
        {"_id": oid},
        {"$set": clean},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise KeyError(f"Document '{doc_id}' not found in category '{category}'.")
    return _serialize([updated])[0]


# ── Delete ────────────────────────────────────────────────────────────────────

def delete_document(category: str, doc_id: str) -> dict:
    """
    Delete a single document and return it.

    Args:
        category (str): The category to delete
        doc_id (str): The document to delete

    Returns:
        dict: The serialized deleted document

    Raises:
        KeyError: If document does not exist in category
    """
    col = _col(category)
    oid = _parse_oid(doc_id)
    doc = col.find_one({"_id": oid})
    if doc is None:
        raise KeyError(f"Document '{doc_id}' not found in category '{category}'.")
    col.delete_one({"_id": oid})
    return _serialize([doc])[0]


# ── Delete entire category ────────────────────────────────────────────────────────────────────

def delete_category(category: str) -> dict:
    """
    Drop an entire category (MongoDB collection) and return a summary.
 
    Args:
        category (str): The category name to delete.
 
    Returns:
        dict: Summary with category name and count of documents deleted.
 
    Raises:
        KeyError: If the category does not exist.
    """
    col = _col(category)
    total = col.count_documents({})
    if total == 0 and category not in list_categories():
        raise KeyError(f"Category '{category}' not found.")
 
    count = col.count_documents({})
    get_data_db().drop_collection(col.name)
    return {
        "category":        category,
        "documents_deleted": count,
    }