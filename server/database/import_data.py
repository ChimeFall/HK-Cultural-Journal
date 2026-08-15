import os
import sqlite3
import pandas as pd

DB_PATH = os.path.join(os.path.dirname(__file__), "hk_journal.db")
CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "hk_cultural_journal.csv")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def clean_value(val):
    if pd.isna(val):
        return None
    if isinstance(val, str):
        val = val.strip()
        if val == "":
            return None
    return val


def init_schema():
    conn = sqlite3.connect(DB_PATH)
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    print("Schema initialized.")


def import_data():
    if not os.path.exists(CSV_PATH):
        print(f"CSV not found: {CSV_PATH}")
        return

    df = pd.read_csv(CSV_PATH)
    df = df.drop_duplicates(subset=['id'], keep='first')
    print(f"CSV loaded: {len(df)} rows (after dedup)")

    # 保存 work_type 映射（在列名映射之前，使用 work_id 作为 key）
    work_type_map = {}
    if "work_type" in df.columns:
        seen = set()
        for _, row in df.iterrows():
            wid = int(row["work_id"])
            if wid not in seen:
                work_type_map[wid] = clean_value(row.get("work_type", "Film"))
                seen.add(wid)
        print(f"work_type 映射: {len(work_type_map)} 个作品")
    else:
        print("警告: CSV 中未找到 work_type 列，将默认使用 'Film'")

    # 列名映射：新列名 → 旧列名（兼容后续代码）
    df.rename(columns={
        "work_id":          "movie_id",
        "work_title_hant":  "movie_title_hant",
        "work_title_hans":  "movie_title_hans",
    }, inplace=True)

    movies_df = df.groupby("movie_id").first().reset_index()
    location_counts = df.groupby("movie_id").size().to_dict()

    # 收集每个作品的第一个有效缩略图作为海报
    # 优先使用 work_post_url，其次 thumbnail_url，最后回退到 scene_photo_url
    thumbnail_map = {}
    work_post_map = {}
    for _, row in df.iterrows():
        mid = int(row["movie_id"])
        if mid not in thumbnail_map:
            url = clean_value(row.get("thumbnail_url")) or clean_value(row.get("scene_photo_url"))
            if url:
                thumbnail_map[mid] = url
        if mid not in work_post_map:
            post_url = clean_value(row.get("work_post_url"))
            if post_url:
                work_post_map[mid] = post_url
    print(f"thumbnail 映射: {len(thumbnail_map)} 个作品有海报")
    print(f"work_post_url 映射: {len(work_post_map)} 个作品有海报链接")

    movie_rows = []
    for _, row in movies_df.iterrows():
        movie_id = int(row["movie_id"])
        movie_rows.append((
            movie_id,
            clean_value(row.get("movie_title_hant")),
            clean_value(row.get("movie_title_hans")),
            clean_value(row.get("year")),
            clean_value(row.get("director")),
            clean_value(row.get("actors_hant")),
            clean_value(row.get("actors_hans")),
            clean_value(row.get("abstract_hant")),
            clean_value(row.get("abstract_hans")),
            clean_value(row.get("keywords_hant")),
            clean_value(row.get("keywords_hans")),
            clean_value(row.get("publisher_hant")),
            clean_value(row.get("publisher_hans")),
            location_counts.get(movie_id, 0),
            clean_value(work_type_map.get(movie_id, "Film")),
            thumbnail_map.get(movie_id, None),
            work_post_map.get(movie_id, None),
        ))

    location_rows = []
    for _, row in df.iterrows():
        location_rows.append((
            clean_value(row.get("id")),
            int(row["movie_id"]),
            clean_value(row.get("location_name")),
            clean_value(row.get("location_desc")),
            clean_value(row.get("longitude")),
            clean_value(row.get("latitude")),
            clean_value(row.get("district")),
            clean_value(row.get("scene_desc")),
            clean_value(row.get("thumbnail_url")),
            clean_value(row.get("scene_photo_url"))
        ))

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    conn.execute("DELETE FROM locations")
    conn.execute("DELETE FROM movies")

    conn.executemany(
        """
        INSERT INTO movies (
            id, title_hant, title_hans, year, director,
            actors_hant, actors_hans, abstract_hant, abstract_hans,
            keywords_hant, keywords_hans, publisher_hant, publisher_hans,
            location_count, work_type, thumbnail_url, work_post_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        movie_rows
    )

    conn.executemany(
        """
        INSERT INTO locations (
            id, movie_id, location_name, location_desc, longitude, latitude,
            district, scene_desc, thumbnail_url, scene_photo_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        location_rows
    )

    conn.commit()

    movie_count = conn.execute("SELECT COUNT(*) FROM movies").fetchone()[0]
    location_count = conn.execute("SELECT COUNT(*) FROM locations").fetchone()[0]
    district_counts = conn.execute(
        "SELECT district, COUNT(*) FROM locations GROUP BY district ORDER BY COUNT(*) DESC"
    ).fetchall()

    conn.close()

    print(f"Import complete!")
    print(f"  Movies: {movie_count}")
    print(f"  Locations: {location_count}")
    print("  Districts:")
    for district, count in district_counts:
        print(f"    {district}: {count}")


if __name__ == "__main__":
    init_schema()
    import_data()
