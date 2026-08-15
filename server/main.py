import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import movies, locations, favorites, checkins, achievements

app = FastAPI(title="HK Culture Journal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(movies.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")
app.include_router(checkins.router, prefix="/api")
app.include_router(achievements.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "HK Culture Journal API"}
