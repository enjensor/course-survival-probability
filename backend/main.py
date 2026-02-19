"""
FastAPI backend for the Course Survival Probability engine.

Run with:  uvicorn main:app --reload --port 8000

In production the built React frontend is served from ../frontend/dist.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response

from db import get_db
from engine import compute_report, compute_field_heatmap, compute_equity_report

app = FastAPI(
    title="Course Survival Probability Engine",
    description="Estimates completion probability for Australian higher education courses",
    version="1.0.0",
)

# CORS — only needed for local dev (Vite on :5173 → FastAPI on :8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# Cache control — data updates ~annually so API responses can be cached
@app.middleware("http")
async def add_cache_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/api/") and path != "/api/health":
        # Cache data endpoints for 1 hour; stale-while-revalidate for 24 hours
        response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    return response


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/institutions")
def list_institutions():
    """Return all institutions that have attrition data."""
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT DISTINCT i.id, i.name, i.state
            FROM institutions i
            JOIN attrition_retention ar ON ar.institution_id = i.id
            WHERE i.name NOT LIKE '%Total%'
              AND i.name NOT LIKE '%Provider%'
              AND LENGTH(i.name) >= 5
              AND i.name NOT GLOB '[0-9]*'
              AND i.name NOT GLOB '[0-9]*.[0-9]*'
              AND ar.measure = 'attrition'
              AND ar.student_type = 'domestic'
            ORDER BY i.name
        """).fetchall()
        return [{"id": r["id"], "name": r["name"], "state": r["state"]} for r in rows]
    finally:
        conn.close()


@app.get("/api/fields")
def list_fields():
    """Return all broad fields of education."""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, broad_field FROM fields_of_education ORDER BY broad_field"
        ).fetchall()
        return [{"id": r["id"], "name": r["broad_field"]} for r in rows]
    finally:
        conn.close()


@app.get("/api/report/{institution_id}")
def get_report(
    institution_id: int,
    field_id: Optional[int] = Query(default=None, description="Broad field of education ID"),
):
    """Compute and return the full Course Survival Report Card."""
    conn = get_db()
    try:
        report = compute_report(conn, institution_id, field_id=field_id)
        if report is None:
            raise HTTPException(status_code=404, detail="Institution not found")
        return report
    finally:
        conn.close()


@app.get("/api/heatmap")
def get_heatmap(
    field_id: int = Query(..., description="Broad field of education ID"),
):
    """
    Return all institutions ranked by composite attrition risk for a given field.

    Composite risk = attrition_rate * (1 - graduation_ratio/100).
    Sorted ascending by composite_risk (safest first).
    Fields 11, 12, 13 are excluded (insufficient data).
    """
    conn = get_db()
    try:
        data = compute_field_heatmap(conn, field_id)
        if data is None:
            raise HTTPException(
                status_code=404,
                detail=f"No heatmap data available for field_id={field_id}",
            )
        return data
    finally:
        conn.close()


@app.get("/api/equity/{institution_id}")
def get_equity_report(institution_id: int):
    """
    Return equity group performance analysis for an institution.

    Compares retention, success, and attainment rates for Low SES,
    Regional, Remote, First Nations, Disability, and NESB students
    against national averages.
    """
    conn = get_db()
    try:
        data = compute_equity_report(conn, institution_id)
        if data is None:
            raise HTTPException(
                status_code=404,
                detail="No equity data available for this institution",
            )
        return data
    finally:
        conn.close()


# ── Serve the React frontend (production only) ──────────────────────
# In production the build script runs `npm run build` and the output
# lands in ../frontend/dist.  We mount it as a catch-all so that the
# SPA's client-side routing works (any non-/api path returns index.html).

DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if DIST_DIR.is_dir():
    # Serve static assets (JS, CSS, images) at /assets/...
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    # Catch-all: return index.html for any non-API route (SPA routing)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If a real file exists in dist (e.g. favicon, vite.svg), serve it
        file_path = DIST_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        # Otherwise return index.html for client-side routing
        return FileResponse(DIST_DIR / "index.html")
