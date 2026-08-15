PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS user_checkins;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS movies;

CREATE TABLE movies (
    id INTEGER PRIMARY KEY,
    title_hant TEXT,
    title_hans TEXT,
    year INTEGER,
    director TEXT,
    actors_hant TEXT,
    actors_hans TEXT,
    abstract_hant TEXT,
    abstract_hans TEXT,
    keywords_hant TEXT,
    keywords_hans TEXT,
    publisher_hant TEXT,
    publisher_hans TEXT,
    location_count INTEGER DEFAULT 0,
    work_type TEXT DEFAULT 'Film',
    thumbnail_url TEXT,
    work_post_url TEXT
);

CREATE TABLE locations (
    id TEXT PRIMARY KEY,
    movie_id INTEGER NOT NULL,
    location_name TEXT,
    location_desc TEXT,
    longitude REAL,
    latitude REAL,
    district TEXT,
    scene_desc TEXT,
    thumbnail_url TEXT,
    scene_photo_url TEXT,
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);

CREATE TABLE user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    status INTEGER DEFAULT 1,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    UNIQUE(user_id, location_id)
);

CREATE TABLE user_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    photo_path TEXT,
    note TEXT,
    checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    weather TEXT,
    is_auto_detected INTEGER DEFAULT 0,
    geofence_radius INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX idx_locations_movie ON locations(movie_id);
CREATE INDEX idx_locations_district ON locations(district);
CREATE INDEX idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX idx_favorites_user ON user_favorites(user_id);
