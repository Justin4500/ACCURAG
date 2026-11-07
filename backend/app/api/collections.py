from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.collection_service import CollectionService
from app.schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionAddDocuments,
)
from app.schemas.document import DocumentResponse

router = APIRouter(prefix="/collections", tags=["Collections"])


def _to_collection_response(col) -> CollectionResponse:
    docs = [DocumentResponse.model_validate(d) for d in col.documents]
    return CollectionResponse(
        id=col.id,
        name=col.name,
        description=col.description,
        document_count=len(docs),
        documents=docs,
        created_at=col.created_at,
        updated_at=col.updated_at,
    )


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(
    col_in: CollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    col = CollectionService.create_collection(db, current_user.id, col_in)
    return _to_collection_response(col)


@router.get("", response_model=List[CollectionResponse])
def list_collections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cols = CollectionService.list_collections(db, current_user.id)
    return [_to_collection_response(c) for c in cols]


@router.get("/{collection_id}", response_model=CollectionResponse)
def get_collection(
    collection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    col = CollectionService.get_collection(db, current_user.id, collection_id)
    if not col:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
    return _to_collection_response(col)


@router.put("/{collection_id}", response_model=CollectionResponse)
def update_collection(
    collection_id: str,
    col_in: CollectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    col = CollectionService.update_collection(db, current_user.id, collection_id, col_in)
    if not col:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
    return _to_collection_response(col)


@router.delete("/{collection_id}")
def delete_collection(
    collection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = CollectionService.delete_collection(db, current_user.id, collection_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")
    return {"message": "Collection deleted successfully."}


@router.post("/{collection_id}/documents", response_model=CollectionResponse)
def add_documents_to_collection(
    collection_id: str,
    body: CollectionAddDocuments,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        col = CollectionService.add_documents_to_collection(
            db, current_user.id, collection_id, body.document_ids
        )
        return _to_collection_response(col)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@router.delete("/{collection_id}/documents/{document_id}", response_model=CollectionResponse)
def remove_document_from_collection(
    collection_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        col = CollectionService.remove_document_from_collection(
            db, current_user.id, collection_id, document_id
        )
        return _to_collection_response(col)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
