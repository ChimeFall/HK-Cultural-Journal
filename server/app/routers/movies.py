from typing import Optional
from fastapi import APIRouter, Query
from app.database import query_one, query_all
from app.models import ApiResponse, MovieDetail

router = APIRouter()


@router.get("/movies")
def list_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
    district: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    work_type: Optional[str] = Query(None)
):
    offset = (page - 1) * limit
    conditions = []
    params = []

    if district:
        conditions.append("""
            EXISTS (
                SELECT 1 FROM locations l
                WHERE l.movie_id = m.id AND l.district = ?
            )
        """)
        params.append(district)

    if year:
        conditions.append("m.year = ?")
        params.append(year)

    if search:
        conditions.append("""
            (m.title_hant LIKE ? OR m.title_hans LIKE ? OR m.director LIKE ?)
        """)
        like = f"%{search}%"
        params.extend([like, like, like])

    if work_type:
        conditions.append("m.work_type = ?")
        params.append(work_type)

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    count_sql = f"SELECT COUNT(*) as total FROM movies m {where_clause}"
    count_result = query_one(count_sql, tuple(params))
    total = count_result["total"] if count_result else 0

    sql = f"""
        SELECT
            m.id, m.title_hant, m.title_hans, m.year, m.director,
            m.actors_hant, m.actors_hans, m.abstract_hant, m.abstract_hans,
            m.keywords_hant, m.keywords_hans, m.publisher_hant, m.publisher_hans,
            m.location_count, m.work_type, m.thumbnail_url, m.work_post_url
        FROM movies m
        {where_clause}
        ORDER BY m.year DESC, m.id
        LIMIT ? OFFSET ?
    """
    params_with_pagination = params + [limit, offset]
    rows = query_all(sql, tuple(params_with_pagination))

    return ApiResponse(
        data={
            "items": rows,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    )


@router.get("/movies/{movie_id}")
def get_movie(movie_id: int):
    movie = query_one(
        """
        SELECT
            id, title_hant, title_hans, year, director,
            actors_hant, actors_hans, abstract_hant, abstract_hans,
            keywords_hant, keywords_hans, publisher_hant, publisher_hans,
            location_count, work_type, thumbnail_url, work_post_url
        FROM movies WHERE id = ?
        """,
        (movie_id,)
    )
    if not movie:
        return ApiResponse(success=False, message="Movie not found", data=None)

    locations = query_all(
        """
        SELECT
            id, movie_id, location_name, location_desc,
            longitude, latitude, district, scene_desc,
            thumbnail_url, scene_photo_url
        FROM locations WHERE movie_id = ?
        """,
        (movie_id,)
    )

    movie["locations"] = locations
    return ApiResponse(data=movie)
