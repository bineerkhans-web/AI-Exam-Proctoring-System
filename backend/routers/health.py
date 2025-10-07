from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def health() -> dict:
    return {"status": "ok"}




