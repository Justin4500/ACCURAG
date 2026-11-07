import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.document import Collection, Document, CollectionDocument
from app.schemas.collection import CollectionCreate, CollectionUpdate


class CollectionService:
    @staticmethod
    def create_collection(db: Session, user_id: str, col_in: CollectionCreate) -> Collection:
        collection_id = str(uuid.uuid4())
        col = Collection(
            id=collection_id,
            user_id=user_id,
            name=col_in.name.strip(),
            description=col_in.description.strip() if col_in.description else None,
        )
        db.add(col)
        db.commit()
        db.refresh(col)
        return col

    @staticmethod
    def list_collections(db: Session, user_id: str) -> List[Collection]:
        return db.query(Collection).filter(Collection.user_id == user_id).order_by(Collection.created_at.desc()).all()

    @staticmethod
    def get_collection(db: Session, user_id: str, collection_id: str) -> Optional[Collection]:
        return db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()

    @staticmethod
    def update_collection(db: Session, user_id: str, collection_id: str, col_in: CollectionUpdate) -> Optional[Collection]:
        col = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
        if not col:
            return None
        if col_in.name is not None:
            col.name = col_in.name.strip()
        if col_in.description is not None:
            col.description = col_in.description.strip()
        db.commit()
        db.refresh(col)
        return col

    @staticmethod
    def delete_collection(db: Session, user_id: str, collection_id: str) -> bool:
        col = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
        if not col:
            return False
        db.delete(col)
        db.commit()
        return True

    @staticmethod
    def add_documents_to_collection(db: Session, user_id: str, collection_id: str, document_ids: List[str]) -> Collection:
        col = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
        if not col:
            raise ValueError("Collection not found.")

        # Ensure documents belong to this user
        docs = db.query(Document).filter(
            Document.id.in_(document_ids),
            Document.user_id == user_id
        ).all()

        existing_doc_ids = {d.id for d in col.documents}
        for d in docs:
            if d.id not in existing_doc_ids:
                col.documents.append(d)

        db.commit()
        db.refresh(col)
        return col

    @staticmethod
    def remove_document_from_collection(db: Session, user_id: str, collection_id: str, document_id: str) -> Collection:
        col = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
        if not col:
            raise ValueError("Collection not found.")

        col.documents = [d for d in col.documents if d.id != document_id]
        db.commit()
        db.refresh(col)
        return col
