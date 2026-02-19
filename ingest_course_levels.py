#!/usr/bin/env python3
"""
One-off ingestion: parse course-level enrolment and completion data
from the 2024 Section 2 and Section 14 Excel files, then insert into
a new `course_level_mix` table in he_stats.db.

Usage:
    python ingest_course_levels.py
"""
from __future__ import annotations

import re
import sqlite3
from pathlib import Path

import openpyxl

DB_PATH = Path(__file__).parent / "he_stats.db"
DATA_DIR = Path(__file__).parent / "_downloads" / "files"

# Files and sheets
ENROL_FILE = DATA_DIR / "2024_Section2_All_Students.xlsx"
ENROL_SHEET = "2.5"  # Table 2.5: All Students by State, HEI, Broad Level of Course
ENROL_YEAR = 2024

COMP_FILE = DATA_DIR / "2024_Section14_Award_Course_Completions.xlsx"
COMP_SHEET = "14.8"  # Table 14.8: Award Course Completions ... by Broad Level of Course
COMP_YEAR = 2024

# Column mappings — both files use the same broad categories in 2024
LEVEL_COLS = [
    "postgrad_research",
    "postgrad_coursework",
    "bachelor",
    "sub_bachelor",
]

DDL = """
CREATE TABLE IF NOT EXISTS course_level_mix (
    id              INTEGER PRIMARY KEY,
    institution_id  INTEGER NOT NULL REFERENCES institutions(id),
    year            INTEGER NOT NULL,
    measure         TEXT NOT NULL,  -- 'enrolment' or 'completion'
    postgrad_research   INTEGER,
    postgrad_coursework INTEGER,
    bachelor            INTEGER,
    sub_bachelor        INTEGER,
    total               INTEGER,
    source_file     TEXT,
    UNIQUE(institution_id, year, measure)
);
"""


def _clean_name(raw: str) -> str:
    """Normalise institution name for matching."""
    name = str(raw).strip()
    # Remove footnote markers like (1.03), (2.03)
    name = re.sub(r"\(\d+\.\d+\)", "", name).strip()
    # Remove trailing semicolons from names like "Whitehouse Institute of Design; Australia"
    name = name.rstrip(";").strip()
    return name


def _safe_int(v) -> int | None:
    """Convert a cell value to int, handling '<5' style suppressions."""
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if v.startswith("<") or v == "np" or v == "..":
            return 0  # suppressed small count
        try:
            return int(float(v))
        except ValueError:
            return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def _build_name_to_id(conn: sqlite3.Connection) -> dict[str, int]:
    """Build a lookup from institution name → id using institutions + aliases."""
    mapping: dict[str, int] = {}
    for row in conn.execute("SELECT id, name FROM institutions WHERE name IS NOT NULL"):
        mapping[row[0 + 1].strip().lower()] = row[0]
        # Also map the cleaned name
        mapping[_clean_name(row[1]).lower()] = row[0]
    for row in conn.execute(
        "SELECT alias, institution_id FROM institution_aliases"
    ):
        mapping[row[0].strip().lower()] = row[1]
    return mapping


def _parse_sheet(
    filepath: Path,
    sheet_name: str,
    year: int,
    measure: str,
    name_map: dict[str, int],
) -> list[tuple]:
    """Parse a sheet and return list of row tuples for insertion."""
    wb = openpyxl.load_workbook(filepath, read_only=True)
    ws = wb[sheet_name]

    rows_out: list[tuple] = []
    current_state = None

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        # Skip header rows (row 0-2 typically)
        if i < 3:
            continue

        cells = list(row)
        if len(cells) < 7:
            continue

        state_cell = cells[0]
        inst_cell = cells[1]

        # Track current state (it's only set on the first row of each state group)
        if state_cell and str(state_cell).strip():
            current_state = str(state_cell).strip()

        if not inst_cell or not str(inst_cell).strip():
            continue

        inst_name = _clean_name(str(inst_cell))

        # Skip aggregate rows
        skip_patterns = [
            "total", "sub-total", "subtotal", "all institutions",
            "non-university higher education", "national",
        ]
        if any(p in inst_name.lower() for p in skip_patterns):
            continue

        # Match institution
        inst_id = name_map.get(inst_name.lower())
        if not inst_id:
            # Try partial matching
            for db_name, db_id in name_map.items():
                if inst_name.lower() in db_name or db_name in inst_name.lower():
                    inst_id = db_id
                    break

        if not inst_id:
            print(f"  SKIP (no match): {inst_name}")
            continue

        pg_research = _safe_int(cells[2])
        pg_coursework = _safe_int(cells[3])
        bachelor = _safe_int(cells[4])
        sub_bachelor = _safe_int(cells[5])

        # Total is in cells[6] for completions (5 columns), cells[8] for enrolments (has enabling + non-award)
        # For enrolments: cols are [state, inst, pg_res, pg_cw, bach, sub_bach, enabling, non_award, total]
        # For completions: cols are [state, inst, pg_res, pg_cw, bach, sub_bach, total]
        if measure == "enrolment":
            total_val = _safe_int(cells[8]) if len(cells) > 8 else None
        else:
            total_val = _safe_int(cells[6]) if len(cells) > 6 else None

        # If total is missing, compute it
        if total_val is None:
            parts = [pg_research, pg_coursework, bachelor, sub_bachelor]
            if all(p is not None for p in parts):
                total_val = sum(parts)

        rows_out.append((
            inst_id, year, measure,
            pg_research, pg_coursework, bachelor, sub_bachelor, total_val,
            filepath.name,
        ))

    wb.close()
    return rows_out


def main():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(DDL)

    name_map = _build_name_to_id(conn)
    print(f"Loaded {len(name_map)} name→id mappings")

    # Parse enrolment data
    print(f"\nParsing enrolments from {ENROL_FILE.name}, sheet {ENROL_SHEET}...")
    enrol_rows = _parse_sheet(ENROL_FILE, ENROL_SHEET, ENROL_YEAR, "enrolment", name_map)
    print(f"  → {len(enrol_rows)} institution rows")

    # Parse completion data
    print(f"\nParsing completions from {COMP_FILE.name}, sheet {COMP_SHEET}...")
    comp_rows = _parse_sheet(COMP_FILE, COMP_SHEET, COMP_YEAR, "completion", name_map)
    print(f"  → {len(comp_rows)} institution rows")

    # Insert into database
    all_rows = enrol_rows + comp_rows
    print(f"\nInserting {len(all_rows)} total rows...")

    conn.execute("DELETE FROM course_level_mix")  # Clear any previous run
    conn.executemany(
        """INSERT OR REPLACE INTO course_level_mix
           (institution_id, year, measure, postgrad_research, postgrad_coursework,
            bachelor, sub_bachelor, total, source_file)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        all_rows,
    )
    conn.commit()

    # Verify
    count = conn.execute("SELECT COUNT(*) FROM course_level_mix").fetchone()[0]
    print(f"\nDone! {count} rows in course_level_mix table.")

    # Show a sample
    sample = conn.execute("""
        SELECT clm.*, i.name FROM course_level_mix clm
        JOIN institutions i ON clm.institution_id = i.id
        WHERE i.name LIKE '%Sydney%'
        ORDER BY clm.measure
    """).fetchall()
    for s in sample:
        print(f"  {s}")

    conn.close()


if __name__ == "__main__":
    main()
