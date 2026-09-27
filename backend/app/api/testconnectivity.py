from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import TestConnectivity

router = APIRouter(tags=["Test Connectivity"])


@router.get("/api/testconnectivity")
def toggle_testconnectivity(db: Session = Depends(get_db)):
    row = db.query(TestConnectivity).first()
    if not row:
        row = TestConnectivity(ischeck=0)
        db.add(row)
        db.flush()

    row.ischeck = 0 if row.ischeck == 1 else 1
    db.commit()
    db.refresh(row)

    return {"success": True, "ischeck": row.ischeck}
