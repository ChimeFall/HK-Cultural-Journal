import os
import uuid
from typing import Optional
from fastapi import APIRouter, File, Form, Header, UploadFile
from app.database import query_one, query_all, execute
from app.models import ApiResponse
from app.routers.achievements import check_new_badges_after_checkin, find_nearby_locations

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_user_id(x_device_id: Optional[str] = Header(None)) -> str:
    return x_device_id or "anonymous"


def save_upload_file(upload_file: UploadFile) -> str:
    ext = os.path.splitext(upload_file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise ValueError("Invalid file type")
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(upload_file.file.read())
    return f"/uploads/{filename}"


@router.get("/checkins")
def get_checkins(x_device_id: Optional[str] = Header(None)):
    user_id = get_user_id(x_device_id)
    rows = query_all(
        """
        SELECT
            c.id, c.user_id, c.location_id, c.photo_path, c.note,
            c.checkin_time, c.weather, c.is_auto_detected, c.geofence_radius, c.created_at,
            l.location_name, l.latitude, l.longitude, l.district,
            m.title_hant as movie_title_hant,
            m.title_hans as movie_title_hans
        FROM user_checkins c
        JOIN locations l ON c.location_id = l.id
        JOIN movies m ON l.movie_id = m.id
        WHERE c.user_id = ?
        ORDER BY c.checkin_time DESC
        """,
        (user_id,)
    )
    return ApiResponse(data=rows)


@router.get("/checkins/{checkin_id}")
def get_checkin(checkin_id: int):
    row = query_one(
        """
        SELECT
            c.id, c.user_id, c.location_id, c.photo_path, c.note,
            c.checkin_time, c.weather, c.is_auto_detected, c.geofence_radius, c.created_at,
            l.location_name, l.latitude, l.longitude, l.district,
            m.title_hant as movie_title_hant,
            m.title_hans as movie_title_hans
        FROM user_checkins c
        JOIN locations l ON c.location_id = l.id
        JOIN movies m ON l.movie_id = m.id
        WHERE c.id = ?
        """,
        (checkin_id,)
    )
    if not row:
        return ApiResponse(success=False, message="Checkin not found", data=None)
    return ApiResponse(data=row)


@router.post("/checkins")
def create_checkin(
    location_id: str = Form(...),
    note: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    x_device_id: Optional[str] = Header(None)
):
    user_id = get_user_id(x_device_id)

    photo_path = None
    if photo:
        try:
            photo_path = save_upload_file(photo)
        except ValueError as e:
            return ApiResponse(success=False, message=str(e))

    checkin_id = execute(
        """
        INSERT INTO user_checkins (user_id, location_id, photo_path, note)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, location_id, photo_path, note)
    )

    newly_unlocked = check_new_badges_after_checkin(user_id, location_id)

    loc = query_one(
        "SELECT latitude, longitude FROM locations WHERE id = ?",
        (location_id,),
    )
    nearby = []
    if loc and loc["latitude"] and loc["longitude"]:
        nearby = find_nearby_locations(
            loc["latitude"], loc["longitude"], user_id, radius=500, limit=5
        )

    return ApiResponse(
        data={
            "checkin_id": checkin_id,
            "newly_unlocked_badges": newly_unlocked,
            "nearby_locations": nearby,
        },
        message="Checkin created",
    )


@router.delete("/checkins/{checkin_id}")
def delete_checkin(checkin_id: int, x_device_id: Optional[str] = Header(None)):
    user_id = get_user_id(x_device_id)
    row = query_one(
        "SELECT id FROM user_checkins WHERE id = ? AND user_id = ?",
        (checkin_id, user_id)
    )
    if not row:
        return ApiResponse(success=False, message="记录不存在或无权限")
    execute("DELETE FROM user_checkins WHERE id = ?", (checkin_id,))
    return ApiResponse(message="删除成功")
