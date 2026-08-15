import math
from typing import Optional
from fastapi import APIRouter, Header
from app.database import query_all, query_one
from app.models import ApiResponse

router = APIRouter()


def get_user_id(x_device_id: Optional[str] = Header(None)) -> str:
    return x_device_id or "anonymous"


MILESTONE_BADGES = [
    {"threshold": 1, "name": "初次打卡", "description": "完成第一次打卡", "icon": "🎬"},
    {"threshold": 10, "name": "打卡达人", "description": "累计打卡 10 次", "icon": "🌟"},
    {"threshold": 50, "name": "文化探索家", "description": "累计打卡 50 次", "icon": "🏅"},
]


def get_checked_location_ids(user_id: str) -> set:
    rows = query_all(
        "SELECT DISTINCT location_id FROM user_checkins WHERE user_id = ?",
        (user_id,),
    )
    return {r["location_id"] for r in rows}


def get_total_checkins(user_id: str) -> int:
    row = query_one(
        "SELECT COUNT(*) as total FROM user_checkins WHERE user_id = ?",
        (user_id,),
    )
    return row["total"] if row else 0


def compute_milestone_badges(total_checkins: int) -> list:
    badges = []
    for m in MILESTONE_BADGES:
        badges.append({
            "id": f"milestone_{m['threshold']}",
            "type": "milestone",
            "name": m["name"],
            "description": m["description"],
            "icon": m["icon"],
            "unlocked": total_checkins >= m["threshold"],
            "progress": min(total_checkins, m["threshold"]),
            "target": m["threshold"],
        })
    return badges


def compute_district_badges(user_id: str) -> list:
    rows = query_all(
        """
        SELECT l.district,
               COUNT(l.id) as total,
               COUNT(CASE WHEN l.id IN (
                   SELECT DISTINCT location_id FROM user_checkins WHERE user_id = ?
               ) THEN 1 END) as checked
        FROM locations l
        WHERE l.district IS NOT NULL AND l.district != ''
        GROUP BY l.district
        """,
        (user_id,),
    )
    badges = []
    for r in rows:
        badges.append({
            "id": f"district_{r['district']}",
            "type": "district",
            "name": f"{r['district']}达人",
            "description": f"打卡{r['district']}全部 {r['total']} 个取景地",
            "icon": "📍",
            "unlocked": r["checked"] == r["total"],
            "progress": r["checked"],
            "target": r["total"],
        })
    return badges


def compute_director_badges(user_id: str) -> list:
    rows = query_all(
        """
        SELECT m.director,
               COUNT(l.id) as total,
               COUNT(CASE WHEN l.id IN (
                   SELECT DISTINCT location_id FROM user_checkins WHERE user_id = ?
               ) THEN 1 END) as checked
        FROM movies m
        JOIN locations l ON l.movie_id = m.id
        WHERE m.director IS NOT NULL AND m.director != ''
        GROUP BY m.director
        HAVING total >= 3
        """,
        (user_id,),
    )
    badges = []
    for r in rows:
        badges.append({
            "id": f"director_{r['director']}",
            "type": "director",
            "name": f"{r['director']}影迷",
            "description": f"打卡{r['director']}全部 {r['total']} 个取景地",
            "icon": "🎥",
            "unlocked": r["checked"] == r["total"],
            "progress": r["checked"],
            "target": r["total"],
        })
    return badges


def compute_music_badge(user_id: str) -> list:
    row = query_one(
        """
        SELECT COUNT(l.id) as total,
               COUNT(CASE WHEN l.id IN (
                   SELECT DISTINCT location_id FROM user_checkins WHERE user_id = ?
               ) THEN 1 END) as checked
        FROM locations l
        JOIN movies m ON l.movie_id = m.id
        WHERE m.work_type = 'Music'
        """,
        (user_id,),
    )
    if not row or row["total"] == 0:
        return []
    return [{
        "id": "music_all",
        "type": "music",
        "name": "音乐漫步",
        "description": f"打卡全部 {row['total']} 个音乐取景地",
        "icon": "🎵",
        "unlocked": row["checked"] == row["total"],
        "progress": row["checked"],
        "target": row["total"],
    }]


def check_new_badges_after_checkin(user_id: str, location_id: str) -> list:
    """Check if a specific check-in just unlocked any new badges."""
    loc_info = query_one(
        """
        SELECT l.district, m.director, m.work_type
        FROM locations l JOIN movies m ON l.movie_id = m.id
        WHERE l.id = ?
        """,
        (location_id,),
    )
    if not loc_info:
        return []

    newly_unlocked = []

    total_checkins = get_total_checkins(user_id)
    for m in MILESTONE_BADGES:
        if total_checkins == m["threshold"]:
            newly_unlocked.append({
                "id": f"milestone_{m['threshold']}",
                "type": "milestone",
                "name": m["name"],
                "icon": m["icon"],
            })

    if loc_info["district"]:
        district = loc_info["district"]
        row = query_one(
            """
            SELECT COUNT(l.id) as total,
                   COUNT(CASE WHEN l.id IN (
                       SELECT DISTINCT location_id FROM user_checkins WHERE user_id = ?
                   ) THEN 1 END) as checked
            FROM locations l
            WHERE l.district = ?
            """,
            (user_id, district),
        )
        if row and row["checked"] == row["total"]:
            newly_unlocked.append({
                "id": f"district_{district}",
                "type": "district",
                "name": f"{district}达人",
                "icon": "📍",
            })

    if loc_info["director"]:
        director = loc_info["director"]
        row = query_one(
            """
            SELECT COUNT(l.id) as total,
                   COUNT(CASE WHEN l.id IN (
                       SELECT DISTINCT location_id FROM user_checkins WHERE user_id = ?
                   ) THEN 1 END) as checked
            FROM movies m
            JOIN locations l ON l.movie_id = m.id
            WHERE m.director = ?
            """,
            (user_id, director),
        )
        loc_count = query_one(
            "SELECT COUNT(l.id) as cnt FROM locations l JOIN movies m ON l.movie_id = m.id WHERE m.director = ?",
            (director,),
        )
        if row and row["checked"] == row["total"] and loc_count and loc_count["cnt"] >= 3:
            newly_unlocked.append({
                "id": f"director_{director}",
                "type": "director",
                "name": f"{director}影迷",
                "icon": "🎥",
            })

    if loc_info["work_type"] == "Music":
        row = query_one(
            """
            SELECT COUNT(l.id) as total,
                   COUNT(CASE WHEN l.id IN (
                       SELECT DISTINCT location_id FROM user_checkins WHERE user_id = ?
                   ) THEN 1 END) as checked
            FROM locations l
            JOIN movies m ON l.movie_id = m.id
            WHERE m.work_type = 'Music'
            """,
            (user_id,),
        )
        if row and row["checked"] == row["total"]:
            newly_unlocked.append({
                "id": "music_all",
                "type": "music",
                "name": "音乐漫步",
                "icon": "🎵",
            })

    return newly_unlocked


def find_nearby_locations(lat: float, lng: float, user_id: str, radius: float = 500, limit: int = 5) -> list:
    """Find unchecked locations within radius meters of the given coordinates."""
    delta_lat = radius / 111_000
    delta_lng = radius / (111_000 * math.cos(math.radians(lat)))

    rows = query_all(
        """
        SELECT l.id, l.movie_id, l.location_name, l.longitude, l.latitude,
               l.district, l.scene_desc,
               m.title_hant as movie_title_hant,
               m.title_hans as movie_title_hans,
               m.work_type
        FROM locations l
        JOIN movies m ON l.movie_id = m.id
        WHERE l.latitude BETWEEN ? AND ?
          AND l.longitude BETWEEN ? AND ?
          AND l.latitude IS NOT NULL
          AND l.longitude IS NOT NULL
          AND l.id NOT IN (
              SELECT DISTINCT location_id FROM user_checkins WHERE user_id = ?
          )
        """,
        (
            lat - delta_lat, lat + delta_lat,
            lng - delta_lng, lng + delta_lng,
            user_id,
        ),
    )

    results = []
    for r in rows:
        dist = haversine(lat, lng, r["latitude"], r["longitude"])
        if dist <= radius:
            item = dict(r)
            item["distance"] = round(dist)
            results.append(item)

    results.sort(key=lambda x: x["distance"])
    return results[:limit]


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("/achievements")
def get_achievements(x_device_id: Optional[str] = Header(None)):
    user_id = get_user_id(x_device_id)
    total_checkins = get_total_checkins(user_id)

    badges = []
    badges.extend(compute_milestone_badges(total_checkins))
    badges.extend(compute_district_badges(user_id))
    badges.extend(compute_director_badges(user_id))
    badges.extend(compute_music_badge(user_id))

    return ApiResponse(data={
        "total_checkins": total_checkins,
        "badges": badges,
    })
