"""
data_service/routers/data.py
==============================
All data-management endpoints.  Data is stored in MongoDB; reads and
downloads are served as JSON or CSV on demand — no flat files on disk.

Route order matters in FastAPI.  Static paths and "sub-resource" paths
(/{category}/search, /{category}/download) are always declared BEFORE
the catch-all /{category}/{doc_id} pair.
"""
from ast import If
import io
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from data_service.database import get_data_db
from data_service.config import PREDEFINED_CATEGORIES
from data_service.dependencies import get_current_user, require_roles
from data_service.utils.file_handler import (
    upload_data,
    read_category_data,
    search_data,
    get_all_as_csv,
    update_document,
    delete_document,
    delete_category,
    list_categories,
    category_exists,
    get_field_names,
)

router = APIRouter(prefix="/data", tags=["Data Management"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DocUpdateRequest(BaseModel):
    """
    To update a document. The 'updates' field should contain the fields to update with their new values.

    Args:
        updates (dict): A dictionary containing the fields to update and their new values.

    Returns:
        DocUpdateRequest: An instance of the DocUpdateRequest class containing the updates.

    Raises:
        HTTPException: If the updates field is not provided or is not a dictionary.
    """
    updates: dict


class ChangeRequestCreate(BaseModel):
    """
    To create a change request. This is used when a salesperson wants to request an update or deletion of a document(database).

    Args:
        category (str): The category of the document to be changed.
        doc_id (str): The ID of the document to be changed.
        action (str): The type of change requested, either "update" or "delete".
        reason (str): The reason for the change request.
        new_data (Optional[dict]): The new data for the document if the action is "update". This field is required for update actions.

    Returns:
        ChangeRequestCreate: An instance of the ChangeRequestCreate class containing the change request details.

    Raises:
        HTTPException: If the action is not "update" or "delete", or if new_data is not provided for an update action.
    """
    category: str
    doc_id:   str          # MongoDB _id string (get it from /data/{category} or search)
    action:   str          # "update" | "delete"
    reason:   str
    new_data: Optional[dict] = None


class ResolveDecision(BaseModel):
    """
    To resolve a change request. This is used when a manager wants to approve or reject a change request.

    Args:
        decision (str): The decision for the change request, either "approved" or "rejected".

    Returns:
        ResolveDecision: An instance of the ResolveDecision class containing the decision for the change request.

    Raises:
        HTTPException: If the decision is not "approved" or "rejected".
    """
    decision: str          # "approved" | "rejected"


# ── Formatting helper ─────────────────────────────────────────────────────────

def _fmt_cr(r: dict) -> dict:
    return {
        "id":          str(r["_id"]),
        "requester":   r.get("requester_username", ""),
        "category":    r["category"],
        "doc_id":      r.get("doc_id", ""),
        "action":      r["action"],
        "new_data":    r.get("new_data"),
        "reason":      r.get("reason"),
        "status":      r["status"],
        "created_at":  str(r.get("created_at", "")),
        "resolved_at": str(r["resolved_at"]) if r.get("resolved_at") else None,
        "resolved_by": r.get("resolved_by"),
    }


# ══════════════════════════════════════════════════════════════════════════════
#  STATIC / FIXED-PATH ROUTES  (must come before parameterized ones)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/categories", summary="List predefined + existing categories")
def get_categories(current_user: dict = Depends(get_current_user)):
    """
    API endpoint to list predefined and existing categories.

    Args:
        current_user (dict): The currently authenticated user. HR can not see it.

    Returns:
        List of predefined categories, existing categories in the database, and a combined list of all categories.

    Raises:
        None.
    """
    existing = list_categories()
    return {
        "predefined": PREDEFINED_CATEGORIES,
        "existing":   existing,
        "all":        sorted(set(PREDEFINED_CATEGORIES + existing)),
        "note":       "Use category='others' + custom_category=<name> for a new category.",
    }


@router.get("/", summary="All categories with document counts")
def list_all_categories(current_user: dict = Depends(get_current_user)):
    """
    API endpoint to list all categories with document counts.

    Args:
        current_user (dict): The currently authenticated user. HR can not see it.

    Returns:
        A list of all categories with their document(rows) counts and fields.

    Raises:
        None.
    """
    result = []
    for cat in list_categories():
        # ← fixed: direct count_documents — never loads docs just to count
        total  = get_data_db()[cat].count_documents({})
        fields = get_field_names(cat)
        result.append({"category": cat, "document_count": total, "fields": fields})
    return {"categories": result, "total": len(result)}


# ── Change-request static routes ──────────────────────────────────────────────

@router.get(
    "/change-requests/all",
    summary="Manager: view all change requests",
)
def get_all_change_requests(
    status_filter: Optional[str] = Query(
        None, description="Filter by status: pending | approved | rejected"
    ),
    current_user: dict = Depends(require_roles("manager")),
):
    """
    API endpoint to get all change requests with optional status filtering.

    Args:
        status_filter (Optional[str]): Filter change requests by status (pending, approved, rejected).
        current_user (dict): The currently authenticated user, must have manager role.

    Returns:
        A list of change requests matching the filter criteria, sorted by creation date (newest first).

    Raises:
        None.
    """
    q: dict = {}
    if status_filter:
        q["status"] = status_filter
    rows = get_data_db().change_requests.find(q).sort("created_at", -1)
    return [_fmt_cr(r) for r in rows]


@router.get(
    "/change-requests/my",
    summary="Salesperson: view own change requests",
)
def get_my_change_requests(
    current_user: dict = Depends(require_roles("salesperson")),
):
    """
    list of all change request by current user

    Args:
        current_user (dict): The currently authenticated user, must have salesperson role.

    Returns:
        list: A list of formatted change request objects belonging to the current user.

    Raises:
        None.
    """
    rows = (
        get_data_db()
        .change_requests.find({"requester_username": current_user["username"]})
        .sort("created_at", -1)
    )
    return [_fmt_cr(r) for r in rows]


@router.post(
    "/change-requests/{request_id}/resolve",
    summary="Manager: approve or reject a change request",
)

def resolve_change_request(
    request_id: str,
    body: ResolveDecision,
    current_user: dict = Depends(require_roles("manager")),
):
    """
    API endpoint to approve or reject a change request.
    Args:
        request_id (str): Change request ID.
        current_user (dict): The currently authenticated user, must have manager role.
        body (ResolveDecision): The decision to approve or reject the change request.

    Returns:
        change_request (dict): Change request object.
        message (str): A message indicating the result of the operation.
        action_performed (str): The action that was performed if the request was approved (e.g., "update" or "delete").
        result (dict): The result of the action performed, such as the updated document or deleted

    Raises:
        HTTPException (400): Invalid request ID.
        HTTPException (404): Change request not found.
        HTTPException (409): Change request already resolved.

    """
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400,
                            detail="decision must be 'approved' or 'rejected'.")

    db = get_data_db()
    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID.")

    cr = db.change_requests.find_one({"_id": oid})
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found.")
    if cr["status"] != "pending":
        raise HTTPException(status_code=409,
                            detail=f"Request already '{cr['status']}'.")

    action_result = None
    if body.decision == "approved":
        try:
            if cr["action"] == "delete":
                action_result = delete_document(cr["category"], cr["doc_id"])
            elif cr["action"] == "update":
                action_result = update_document(
                    cr["category"], cr["doc_id"], cr.get("new_data", {})
                )
        except (ValueError, KeyError) as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    db.change_requests.update_one(
        {"_id": oid},
        {"$set": {
            "status":      body.decision,
            "resolved_at": datetime.utcnow(),
            "resolved_by": current_user["username"],
        }},
    )
    return {
        "message":          f"Request #{request_id} {body.decision}.",
        "action_performed": cr["action"] if body.decision == "approved" else None,
        "result":           action_result,
        "resolved_by":      current_user["username"],
    }


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/upload", summary="Upload CSV or Excel — data stored in MongoDB")
async def upload_file(
    category:        str           = Form(...),
    custom_category: Optional[str] = Form(None),
    file:            UploadFile    = File(...),
    current_user:    dict          = Depends(require_roles("manager", "salesperson")),
):
    """
    API endpoint to upload a CSV or Excel file and store its data in MongoDB.

    Args:
        category (str): The category for the uploaded data. Use 'others' to specify a custom category.
        custom_category (Optional[str]): The custom category name to use if category is 'others'.
        file (UploadFile): The file to be uploaded. Must be a CSV or Excel file.
        current_user (dict): The currently authenticated user, must have manager or salesperson role.

    Returns:
        dict: A dictionary containing a success message, details of the uploaded data, and information about the user who uploaded the file and their role.

    Raises:
        HTTPException (400): If the uploaded file is not a CSV or Excel file
        HTTPException (400): If the uploaded file is empty

    """
    if category.strip().lower() == "others":
        if not custom_category or not custom_category.strip():
            raise HTTPException(
                status_code=400,
                detail="'custom_category' is required when category='others'.",
            )
        final_category = custom_category.strip().lower().replace(" ", "_")
    else:
        final_category = category.strip().lower()

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in {"csv", "xlsx", "xls"}:
        raise HTTPException(status_code=400,
                            detail=f"Unsupported file type '.{ext}'.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = upload_data(
            content, file.filename or f"upload.{ext}",
            final_category,
            current_user["username"],
            current_user["role"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}")

    return {
        "message":     "Uploaded successfully — data saved to MongoDB.",
        **result,
        "uploaded_by": current_user["username"],
        "role":        current_user["role"],
    }


# ── Submit change request ─────────────────────────────────────────────────────

@router.post(
    "/change-request",
    summary="Salesperson: request an update or delete from a manager",
)
def submit_change_request(
    body:         ChangeRequestCreate,
    current_user: dict = Depends(require_roles("salesperson")),
):
    """
    API endpoint for salespeople to submit a change request for updating or deleting a document.

    Args:
        body (ChangeRequestCreate): The details of the change request, including category, document ID, action (update or delete), reason for the request, and new data if it's an update.
        current_user (dict): The currently authenticated user, must have salesperson role.

    Returns:
        dict: A dictionary containing a message confirming the submission of the change request, the ID of the created request, and details about the requested change.

    Raises:
        HTTPException (400): If the action is not 'update' or 'delete', or if new_data is not provided for an update action.
        HTTPException (404): If the specified category or document is not found.
        HTTPException (400): If the doc_id format is invalid.


    """
    if body.action not in ("delete", "update"):
        raise HTTPException(status_code=400,
                            detail="action must be 'delete' or 'update'.")
    if body.action == "update" and not body.new_data:
        raise HTTPException(status_code=400,
                            detail="'new_data' is required for an update request.")

    # ← fixed: normalize category the same way upload does
    normalized_category = body.category.strip().lower().replace(" ", "_")

    if not category_exists(normalized_category):
        raise HTTPException(status_code=404,
                            detail=f"Category '{body.category}' not found.")

    # Verify the document actually exists
    try:
        oid = ObjectId(body.doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid doc_id format.")

    # ← fixed: use normalized_category so it matches the actual collection name
    col = get_data_db()[normalized_category]
    if not col.find_one({"_id": oid}):
        raise HTTPException(
            status_code=404,
            detail=f"Document '{body.doc_id}' not found in '{normalized_category}'.",
        )

    doc = {
        "requester_username": current_user["username"],
        "category":           normalized_category,   # ← store normalized name
        "doc_id":             body.doc_id,
        "action":             body.action,
        "new_data":           body.new_data,
        "reason":             body.reason,
        "status":             "pending",
        "created_at":         datetime.utcnow(),
        "resolved_at":        None,
        "resolved_by":        None,
    }
    result = get_data_db().change_requests.insert_one(doc)
    return {
        "message":    "Change request submitted. A manager will review it.",
        "request_id": str(result.inserted_id),
        "category":   normalized_category,
        "doc_id":     body.doc_id,
        "action":     body.action,
        "status":     "pending",
    }


# ══════════════════════════════════════════════════════════════════════════════
#  CATEGORY-SCOPED ROUTES  — /{category}/...
#  Keep  /search  and  /download  ABOVE  /{doc_id}  to avoid shadowing.
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/{category}/search",
    summary="Search documents by any field (all roles)",
)
def search_category(
    category:  str,
    q:         str           = Query(..., description="Search term"),
    field:     Optional[str] = Query(
        None,
        description=(
            "Column to search in. "
            "Omit to search across ALL text fields (e.g. Business Name, client_name)."
        ),
    ),
    page:      int = Query(1,  ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(require_roles("manager", "salesperson", "hr")),
):
    """
    API endpoint to search documents in a specific category by any field.

    Args:
        category (str): The category to search within.
        q (str): The search term to look for in the specified field(s).
        field (Optional[str]): The specific field/column to search in. If omitted, the search will be performed across all text fields.
        page (int): The page number for pagination (default is 1).
        page_size (int): The number of results per page for pagination (default is 50, maximum is 500).
        current_user (dict): The currently authenticated user, must have manager, salesperson, or hr role.

    Returns:
        dict: A dictionary containing the search results(category,query, field searched, total matches found, pagination details, and the list of matching documents).

    Raises:
        HTTPException (404): If the specified category does not exist.
        HTTPException (400): If the search query is invalid or if the specified field does not exist in the category.
    """
    if not category_exists(category):
        raise HTTPException(
            status_code=404,
            detail=f"Category '{category}' not found. Upload a file first.",
        )

    skip = (page - 1) * page_size
    try:
        docs, total = search_data(category, q, field=field, skip=skip, limit=page_size)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "category":    category,
        "query":       q,
        "field":       field or "all text fields",
        "total_found": total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": -(-total // page_size) if total else 0,
        "data":        docs,
    }


@router.get(
    "/{category}/download",
    summary="Download full category as CSV (all roles)",
)
def download_category_csv(
    category:     str,
    current_user: dict = Depends(require_roles("manager", "salesperson", "hr")),
):
    """
    API endpoint to download all documents in a specific category as a CSV file.
    Args:
        category (str): The category to download.
        current_user (dict): The currently authenticated user, must have manager, salesperson, or hr role.

    Returns:
        StreamingResponse: A streaming response containing the CSV data, with appropriate headers for file download.

    Raises:
        HTTPException (404): If the specified category does not exist.
    """
    if not category_exists(category):
        raise HTTPException(
            status_code=404,
            detail=f"Category '{category}' not found.",
        )
    csv_str = get_all_as_csv(category)
    return StreamingResponse(
        io.StringIO(csv_str),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{category}.csv"'},
    )


@router.get(
    "/{category}/fields",
    summary="List available fields / columns in a category (all roles)",
)
def get_category_fields(
    category:     str,
    current_user: dict = Depends(get_current_user),
):
    """
    API endpoint to list available fields/columns in a specific category.

    Args:
        category (str): The category to list fields for.
        current_user (dict): The currently authenticated user.

    Returns:
        dict: A dictionary containing the category name and a list of available fields/columns in that category.

    Raises:
        HTTPException (404): If the specified category does not exist.
    """
    if not category_exists(category):
        raise HTTPException(status_code=404,
                            detail=f"Category '{category}' not found.")
    return {"category": category, "fields": get_field_names(category)}



@router.put(
    "/{category}/{doc_id}",
    summary="Manager: update a document by its ID",
)
def update_doc(
    category:     str,
    doc_id:       str,
    body:         DocUpdateRequest,
    current_user: dict = Depends(require_roles("manager")),
):
    """
    API endpoint to update a document by its ID.
    Args:
        category (str): The category of the document to update.
        doc_id (str): The ID of the document to update.
        body (DocUpdateRequest): The request body containing the fields to update and their new values.
        current_user (dict): The currently authenticated user, must have manager role.

    Returns:
        dict: A dictionary containing a message confirming the update, the document ID, and the updated document data.

    Raises:
        HTTPException (400): If the update data is invalid or if the document ID format is invalid.
        HTTPException (404): If the specified category or document is not found."""

    try:
        updated = update_document(category, doc_id, body.updates)
        return {"message": "Document updated.", "doc_id": doc_id, "data": updated}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete(
    "/{category}/{doc_id}",
    summary="Manager: delete a document by its ID",
)
def delete_doc(
    category:     str,
    doc_id:       str,
    current_user: dict = Depends(require_roles("manager")),
):
    """
    API endpoint to Delete a document by its ID

    Args:
        category (str): Category name
        doc_id (str): Document ID
        current_user (dict): Current user must be manager

    Returns:
        dict: message and  document with delete data

    Raises:
        HTTPException (400): Invalid values of doc_id or category
        HTTPException (404): Document not found
    """
    try:
        deleted = delete_document(category, doc_id)
        return {"message": "Document deleted.", "deleted_data": deleted}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    

@router.delete(
    "/{category}",
    summary="Manager: delete an entire category and all its documents",
)
def delete_entire_category(
    category:     str,
    current_user: dict = Depends(require_roles("manager")),
):
    """
    Permanently drop an entire category (MongoDB collection) and every document in it.

    Args:
        category (str): The category to delete.
        current_user (dict): Must have manager role.

    Returns:
        dict: Confirmation message, category, documents_deleted, deleted_by.

    Raises:
        HTTPException (404): Category not found.
    """
    if not category_exists(category):
        raise HTTPException(
            status_code=404,
            detail=f"Category '{category}' not found.",
        )
    try:
        result = delete_category(category)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return {
        "message":           f"Category '{category}' deleted successfully.",
        "category":          result["category"],
        "documents_deleted": result["documents_deleted"],
        "deleted_by":        current_user["username"],
    }