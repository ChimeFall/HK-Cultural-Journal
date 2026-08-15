import sqlite3
import os
from typing import Any, Dict, List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "hk_journal.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def query_one(sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def query_all(sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def execute(sql: str, params: tuple = ()) -> int:
    conn = get_db_connection()
    try:
        cursor = conn.execute(sql, params)
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def execute_many(sql: str, params_list: List[tuple]) -> None:
    conn = get_db_connection()
    try:
        conn.executemany(sql, params_list)
        conn.commit()
    finally:
        conn.close()
