from typing import Optional
from fastapi import APIRouter, Header, Query
from app.database import query_one, query_all
from app.models import ApiResponse
from app.routers.achievements import find_nearby_locations

router = APIRouter()


@router.get("/locations")
def list_locations(
    movie_id: Optional[int] = Query(None),
    district: Optional[str] = Query(None)
):
    conditions = []
    params = []

    if movie_id:
        conditions.append("l.movie_id = ?")
        params.append(movie_id)

    if district:
        conditions.append("l.district = ?")
        params.append(district)

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    sql = f"""
        SELECT
            l.id, l.movie_id, l.location_name, l.location_desc,
            l.longitude, l.latitude, l.district, l.scene_desc,
            l.thumbnail_url, l.scene_photo_url,
            m.title_hant as movie_title_hant,
            m.title_hans as movie_title_hans,
            m.year as movie_year
        FROM locations l
        JOIN movies m ON l.movie_id = m.id
        {where_clause}
        ORDER BY l.district, l.id
    """
    rows = query_all(sql, tuple(params))
    return ApiResponse(data=rows)


@router.get("/locations/nearby")
def nearby_locations(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(500),
    limit: int = Query(5),
    x_device_id: Optional[str] = Header(None),
):
    user_id = x_device_id or "anonymous"
    results = find_nearby_locations(lat, lng, user_id, radius, limit)
    return ApiResponse(data=results)


@router.get("/locations/{location_id}")
def get_location(location_id: str):
    location = query_one(
        """
        SELECT
            l.id, l.movie_id, l.location_name, l.location_desc,
            l.longitude, l.latitude, l.district, l.scene_desc,
            l.thumbnail_url, l.scene_photo_url,
            m.title_hant as movie_title_hant,
            m.title_hans as movie_title_hans,
            m.year as movie_year,
            m.director as movie_director,
            m.actors_hant as movie_actors_hant,
            m.actors_hans as movie_actors_hans
        FROM locations l
        JOIN movies m ON l.movie_id = m.id
        WHERE l.id = ?
        """,
        (location_id,)
    )
    if not location:
        return ApiResponse(success=False, message="Location not found", data=None)

    return ApiResponse(data=location)


@router.get("/districts")
def list_districts():
    rows = query_all(
        """
        SELECT district, COUNT(*) as location_count
        FROM locations
        WHERE district IS NOT NULL AND district != ''
        GROUP BY district
        ORDER BY location_count DESC
        """
    )
    return ApiResponse(data=rows)
