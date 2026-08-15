from typing import Any, List, Optional
from pydantic import BaseModel


class ApiResponse(BaseModel):
    success: bool = True
    data: Any = None
    message: Optional[str] = None


class MovieBase(BaseModel):
    id: int
    title_hant: Optional[str] = None
    title_hans: Optional[str] = None
    year: Optional[int] = None
    director: Optional[str] = None
    actors_hant: Optional[str] = None
    actors_hans: Optional[str] = None
    abstract_hant: Optional[str] = None
    abstract_hans: Optional[str] = None
    keywords_hant: Optional[str] = None
    keywords_hans: Optional[str] = None
    publisher_hant: Optional[str] = None
    publisher_hans: Optional[str] = None
    location_count: int = 0
    work_type: Optional[str] = "Film"
    thumbnail_url: Optional[str] = None
    work_post_url: Optional[str] = None

    class Config:
        from_attributes = True


class MovieDetail(MovieBase):
    locations: List[dict] = []


class LocationBase(BaseModel):
    id: str
    movie_id: int
    location_name: Optional[str] = None
    location_desc: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    district: Optional[str] = None
    scene_desc: Optional[str] = None
    thumbnail_url: Optional[str] = None
    scene_photo_url: Optional[str] = None

    class Config:
        from_attributes = True


class LocationDetail(LocationBase):
    movie: Optional[dict] = None


class FavoriteCreate(BaseModel):
    location_id: str


class FavoriteResponse(BaseModel):
    id: int
    user_id: str
    location_id: str
    status: int
    tags: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class CheckinCreate(BaseModel):
    location_id: str
    note: Optional[str] = None


class CheckinResponse(BaseModel):
    id: int
    user_id: str
    location_id: str
    photo_path: Optional[str] = None
    note: Optional[str] = None
    checkin_time: str
    weather: Optional[str] = None
    is_auto_detected: int
    geofence_radius: int
    created_at: str

    class Config:
        from_attributes = True
