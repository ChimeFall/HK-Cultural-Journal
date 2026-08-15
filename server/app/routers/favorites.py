from typing import Optional
from fastapi import APIRouter, Header
from app.database import query_one, query_all, execute
from app.models import ApiResponse, FavoriteCreate

router = APIRouter()


def get_user_id(x_device_id: Optional[str] = Header(None)) -> str:
    return x_device_id or "anonymous"


@router.get("/favorites")
def get_favorites(x_device_id: Optional[str] = Header(None)):
    user_id = get_user_id(x_device_id)
    rows = query_all(
        """
        SELECT
            f.id, f.user_id, f.location_id, f.status, f.tags, f.created_at,
            l.location_name, l.latitude, l.longitude, l.district,
            m.title_hant as movie_title_hant,
            m.title_hans as movie_title_hans
        FROM user_favorites f
        JOIN locations l ON f.location_id = l.id
        JOIN movies m ON l.movie_id = m.id
        WHERE f.user_id = ? AND f.status = 1
        ORDER BY f.created_at DESC
        """,
        (user_id,)
    )
    return ApiResponse(data=rows)


@router.post("/favorites")
def add_favorite(
    body: FavoriteCreate,
    x_device_id: Optional[str] = Header(None)
):
    user_id = get_user_id(x_device_id)

    existing = query_one(
        "SELECT id, status FROM user_favorites WHERE user_id = ? AND location_id = ?",
        (user_id, body.location_id)
    )
    if existing:
        if existing["status"] == 1:
            return ApiResponse(success=False, message="Already favorited", data=None)
        execute(
            "UPDATE user_favorites SET status = 1 WHERE user_id = ? AND location_id = ?",
            (user_id, body.location_id)
        )
        return ApiResponse(message="Favorite restored")

    execute(
        "INSERT INTO user_favorites (user_id, location_id, status) VALUES (?, ?, 1)",
        (user_id, body.location_id)
    )
    return ApiResponse(message="Favorite added")


@router.delete("/favorites/{location_id}")
def remove_favorite(location_id: str, x_device_id: Optional[str] = Header(None)):
    user_id = get_user_id(x_device_id)
    execute(
        "UPDATE user_favorites SET status = 0 WHERE user_id = ? AND location_id = ?",
        (user_id, location_id)
    )
    return ApiResponse(message="Favorite removed")
