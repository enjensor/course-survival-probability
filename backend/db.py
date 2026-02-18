"""SQLite connection manager for the Higher Education Statistics database."""
from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "he_stats.db"


def get_db() -> sqlite3.Connection:
    """Return a read-only SQLite connection with Row factory."""
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn
