"""
Course Survival Probability Engine.

Computes completion probability, attrition risk, retention/success rates,
institutional trend, completion time profile, and field context from the
Higher Education Statistics database.
"""
from __future__ import annotations

import sqlite3
from typing import Any, Dict, List, Optional


def _linear_slope(xs: List[float], ys: List[float]) -> float:
    """Simple linear regression slope: Σ((x-x̄)(y-ȳ)) / Σ((x-x̄)²)."""
    n = len(xs)
    if n < 2:
        return 0.0
    x_mean = sum(xs) / n
    y_mean = sum(ys) / n
    num = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
    den = sum((x - x_mean) ** 2 for x in xs)
    if den == 0:
        return 0.0
    return num / den


def _percentile_rank(value: float, all_values: List[float]) -> float:
    """Compute percentile rank (0-100) of value within all_values."""
    if not all_values:
        return 50.0
    n_below = sum(1 for v in all_values if v < value)
    n_equal = sum(1 for v in all_values if v == value)
    return ((n_below + 0.5 * n_equal) / len(all_values)) * 100


def _risk_level(percentile: float) -> str:
    """Map attrition percentile to risk category."""
    if percentile < 25:
        return "Low"
    elif percentile < 50:
        return "Medium"
    elif percentile < 75:
        return "High"
    else:
        return "Very High"


def _trend_direction(slope: float) -> str:
    """Map slope to trend direction."""
    if slope < -0.3:
        return "improving"
    elif slope > 0.3:
        return "worsening"
    else:
        return "stable"


def compute_report(
    conn: sqlite3.Connection,
    institution_id: int,
    field_id: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Compute the full Course Survival Report Card for an institution.

    Returns None if the institution is not found.
    """
    # ------------------------------------------------------------------
    # Institution info
    # ------------------------------------------------------------------
    row = conn.execute(
        "SELECT id, name, state, provider_type FROM institutions WHERE id = ?",
        (institution_id,),
    ).fetchone()
    if not row:
        return None

    institution = {
        "id": row["id"],
        "name": row["name"],
        "state": row["state"],
        "provider_type": row["provider_type"],
    }

    # Field info (if requested)
    field_info = None
    if field_id is not None:
        frow = conn.execute(
            "SELECT id, broad_field FROM fields_of_education WHERE id = ?",
            (field_id,),
        ).fetchone()
        if frow:
            field_info = {"id": frow["id"], "name": frow["broad_field"]}

    # ------------------------------------------------------------------
    # Completion probability (from completion_rates table — institution-level only)
    # ------------------------------------------------------------------
    completion = _compute_completion(conn, institution_id)

    # ------------------------------------------------------------------
    # Attrition risk (institution-level only)
    # ------------------------------------------------------------------
    attrition = _compute_attrition(conn, institution_id)

    # ------------------------------------------------------------------
    # Retention and success (latest year — institution-level only)
    # ------------------------------------------------------------------
    retention = _latest_rate(conn, institution_id, "retention", "domestic")
    success = _latest_rate(conn, institution_id, "success", "domestic")

    # ------------------------------------------------------------------
    # Trend (8-year domestic attrition — institution-level only)
    # ------------------------------------------------------------------
    trend = _compute_trend(conn, institution_id)

    # ------------------------------------------------------------------
    # Completion time profile (institution-level only)
    # ------------------------------------------------------------------
    timeline = _compute_timeline(conn, institution_id)

    # ------------------------------------------------------------------
    # Field context (if field_id provided)
    # ------------------------------------------------------------------
    field_context = None
    if field_id is not None:
        field_context = _compute_field_context(conn, institution_id, field_id)

    return {
        "institution": institution,
        "field": field_info,
        "completion": completion,
        "attrition": attrition,
        "retention": retention,
        "success": success,
        "trend": trend,
        "completion_timeline": timeline,
        "field_context": field_context,
    }


# ======================================================================
# Internal computation functions
# ======================================================================


def _compute_completion(conn: sqlite3.Connection, inst_id: int) -> Dict[str, Any]:
    """Compute completion probability from completion_rates."""
    result: Dict[str, Any] = {
        "four_year_pct": None,
        "six_year_pct": None,
        "nine_year_pct": None,
        "national_avg_four_year": None,
        "cohort_period": None,
        "still_enrolled_pct": None,
        "dropped_out_pct": None,
        "never_returned_pct": None,
    }

    for duration in (4, 6, 9):
        if duration == 4:
            row = conn.execute(
                """SELECT completed_pct, still_enrolled_pct, dropped_out_pct, never_returned_pct, cohort_start, cohort_end
                   FROM completion_rates
                   WHERE institution_id = ? AND duration_years = ?
                     AND completed_pct IS NOT NULL
                   ORDER BY cohort_start DESC LIMIT 1""",
                (inst_id, duration),
            ).fetchone()
        else:
            row = conn.execute(
                """SELECT completed_pct, cohort_start, cohort_end
                   FROM completion_rates
                   WHERE institution_id = ? AND duration_years = ?
                     AND completed_pct IS NOT NULL
                   ORDER BY cohort_start DESC LIMIT 1""",
                (inst_id, duration),
            ).fetchone()

        if row:
            key = {4: "four_year_pct", 6: "six_year_pct", 9: "nine_year_pct"}[duration]
            result[key] = round(row["completed_pct"], 1)
            if duration == 4:
                result["cohort_period"] = f"{row['cohort_start']}-{row['cohort_end']}"
                if row["still_enrolled_pct"] is not None:
                    result["still_enrolled_pct"] = round(row["still_enrolled_pct"], 1)
                if row["dropped_out_pct"] is not None:
                    result["dropped_out_pct"] = round(row["dropped_out_pct"], 1)
                if row["never_returned_pct"] is not None:
                    result["never_returned_pct"] = round(row["never_returned_pct"], 1)

    # National average for 4-year completion (same cohort window)
    if result["cohort_period"]:
        parts = result["cohort_period"].split("-")
        if len(parts) == 2:
            avg_row = conn.execute(
                """SELECT AVG(completed_pct) as avg_pct
                   FROM completion_rates
                   WHERE duration_years = 4
                     AND cohort_start = ?
                     AND completed_pct IS NOT NULL""",
                (int(parts[0]),),
            ).fetchone()
            if avg_row and avg_row["avg_pct"]:
                result["national_avg_four_year"] = round(avg_row["avg_pct"], 1)

    # If no cohort period yet, get national avg from latest available
    if result["national_avg_four_year"] is None:
        avg_row = conn.execute(
            """SELECT AVG(completed_pct) as avg_pct, MAX(cohort_start) as latest
               FROM completion_rates
               WHERE duration_years = 4
                 AND completed_pct IS NOT NULL
                 AND cohort_start = (
                     SELECT MAX(cohort_start) FROM completion_rates
                     WHERE duration_years = 4 AND completed_pct IS NOT NULL
                 )"""
        ).fetchone()
        if avg_row and avg_row["avg_pct"]:
            result["national_avg_four_year"] = round(avg_row["avg_pct"], 1)

    return result


def _compute_attrition(conn: sqlite3.Connection, inst_id: int) -> Dict[str, Any]:
    """Compute attrition risk with national percentile ranking."""
    result: Dict[str, Any] = {
        "latest_rate": None,
        "latest_year": None,
        "national_avg": None,
        "percentile": None,
        "risk_level": None,
    }

    # This institution's latest domestic attrition rate
    row = conn.execute(
        """SELECT rate, year FROM attrition_retention
           WHERE institution_id = ? AND student_type = 'domestic'
             AND measure = 'attrition' AND rate IS NOT NULL
           ORDER BY year DESC LIMIT 1""",
        (inst_id,),
    ).fetchone()

    if not row:
        return result

    latest_rate = row["rate"]
    latest_year = row["year"]
    result["latest_rate"] = round(latest_rate, 2)
    result["latest_year"] = latest_year

    # All institutions' latest domestic attrition rates (for the same year)
    all_rows = conn.execute(
        """SELECT ar.rate FROM attrition_retention ar
           JOIN institutions i ON ar.institution_id = i.id
           WHERE ar.student_type = 'domestic' AND ar.measure = 'attrition'
             AND ar.year = ? AND ar.rate IS NOT NULL
             AND i.name NOT LIKE '%Total%' AND i.name NOT LIKE '%Provider%'""",
        (latest_year,),
    ).fetchall()

    all_rates = [r["rate"] for r in all_rows]

    if all_rates:
        result["national_avg"] = round(sum(all_rates) / len(all_rates), 2)
        result["percentile"] = round(_percentile_rank(latest_rate, all_rates), 1)
        result["risk_level"] = _risk_level(result["percentile"])

    return result


def _latest_rate(
    conn: sqlite3.Connection, inst_id: int, measure: str, student_type: str
) -> Dict[str, Any]:
    """Get the latest rate for a given measure and student type."""
    row = conn.execute(
        """SELECT rate, year FROM attrition_retention
           WHERE institution_id = ? AND student_type = ? AND measure = ?
             AND rate IS NOT NULL
           ORDER BY year DESC LIMIT 1""",
        (inst_id, student_type, measure),
    ).fetchone()

    if row:
        return {"rate": round(row["rate"], 2), "year": row["year"]}
    return {"rate": None, "year": None}


def _compute_trend(conn: sqlite3.Connection, inst_id: int) -> Dict[str, Any]:
    """Compute 5-year domestic attrition trend with linear regression."""
    rows = conn.execute(
        """SELECT year, rate FROM attrition_retention
           WHERE institution_id = ? AND student_type = 'domestic'
             AND measure = 'attrition' AND rate IS NOT NULL
           ORDER BY year DESC LIMIT 8""",
        (inst_id,),
    ).fetchall()

    if not rows:
        return {"years": [], "attrition_rates": [], "direction": "unknown", "slope": 0.0}

    # Take up to last 8 years for the chart, but compute slope on last 5
    years = [r["year"] for r in reversed(rows)]
    rates = [round(r["rate"], 2) for r in reversed(rows)]

    # Slope from last 5 data points
    slope_years = years[-5:] if len(years) >= 5 else years
    slope_rates = rates[-5:] if len(rates) >= 5 else rates

    slope = _linear_slope(
        [float(y) for y in slope_years],
        [float(r) for r in slope_rates],
    )

    return {
        "years": years,
        "attrition_rates": rates,
        "direction": _trend_direction(slope),
        "slope": round(slope, 3),
    }


def _compute_timeline(conn: sqlite3.Connection, inst_id: int) -> Dict[str, Any]:
    """Compute completion time profile (4/6/9 year windows)."""
    timeline: Dict[str, Any] = {}

    for duration, key in [(4, "four_year"), (6, "six_year"), (9, "nine_year")]:
        row = conn.execute(
            """SELECT completed_pct, cohort_start, cohort_end
               FROM completion_rates
               WHERE institution_id = ? AND duration_years = ?
                 AND completed_pct IS NOT NULL
               ORDER BY cohort_start DESC LIMIT 1""",
            (inst_id, duration),
        ).fetchone()

        # National average for this duration
        avg_row = conn.execute(
            """SELECT AVG(completed_pct) as avg_pct
               FROM completion_rates
               WHERE duration_years = ? AND completed_pct IS NOT NULL
                 AND cohort_start = (
                     SELECT MAX(cohort_start) FROM completion_rates
                     WHERE duration_years = ? AND completed_pct IS NOT NULL
                 )""",
            (duration, duration),
        ).fetchone()

        if row:
            timeline[key] = {
                "pct": round(row["completed_pct"], 1),
                "period": f"{row['cohort_start']}-{row['cohort_end']}",
                "national_avg": round(avg_row["avg_pct"], 1) if avg_row and avg_row["avg_pct"] else None,
            }
        else:
            timeline[key] = {"pct": None, "period": None, "national_avg": None}

    return timeline


def _compute_field_context(
    conn: sqlite3.Connection, inst_id: int, field_id: int
) -> Dict[str, Any]:
    """
    Compute field-specific metrics at this institution:
    - enrolment/share numbers
    - completions trend (graduates per year)
    - completions-to-enrolment ratio (proxy graduation efficiency)
    - year-over-year enrolment growth
    """
    # ── Latest year with enrolment data ──────────────────────────────
    year_row = conn.execute(
        """SELECT MAX(year) as yr FROM enrolments
           WHERE institution_id = ? AND headcount IS NOT NULL""",
        (inst_id,),
    ).fetchone()

    latest_year = year_row["yr"] if year_row else None
    if not latest_year:
        return {
            "enrolment": None, "total_enrolment": None,
            "field_share_pct": None, "year": None,
            "completions": None, "total_completions": None,
            "completion_ratio": None,
            "enrolment_trend": [], "completions_trend": [],
        }

    # ── Field enrolment (total enrolled students, not commencing) ────
    field_row = conn.execute(
        """SELECT MAX(headcount) as hc FROM enrolments
           WHERE institution_id = ? AND field_id = ? AND year = ?
             AND commencing = 0 AND headcount IS NOT NULL""",
        (inst_id, field_id, latest_year),
    ).fetchone()

    # ── Total enrolment across all fields ────────────────────────────
    total_row = conn.execute(
        """SELECT SUM(max_hc) as total FROM (
               SELECT field_id, MAX(headcount) as max_hc FROM enrolments
               WHERE institution_id = ? AND year = ?
                 AND commencing = 0 AND headcount IS NOT NULL
               GROUP BY field_id
           )""",
        (inst_id, latest_year),
    ).fetchone()

    field_hc = field_row["hc"] if field_row and field_row["hc"] else 0
    total_hc = total_row["total"] if total_row and total_row["total"] else 0

    # ── Field completions (graduates) for latest year ────────────────
    comp_row = conn.execute(
        """SELECT SUM(headcount) as hc FROM completions
           WHERE institution_id = ? AND field_id = ? AND year = ?
             AND headcount IS NOT NULL""",
        (inst_id, field_id, latest_year),
    ).fetchone()
    field_completions = comp_row["hc"] if comp_row and comp_row["hc"] else 0

    # Total completions across all fields
    total_comp_row = conn.execute(
        """SELECT SUM(headcount) as hc FROM completions
           WHERE institution_id = ? AND year = ?
             AND headcount IS NOT NULL""",
        (inst_id, latest_year),
    ).fetchone()
    total_completions = total_comp_row["hc"] if total_comp_row and total_comp_row["hc"] else 0

    # ── Completions-to-enrolment ratio ───────────────────────────────
    comp_ratio = round(field_completions / field_hc * 100, 1) if field_hc > 0 else None

    # ── Multi-year enrolment trend for this field ────────────────────
    enrol_trend_rows = conn.execute(
        """SELECT year, MAX(headcount) as hc FROM enrolments
           WHERE institution_id = ? AND field_id = ?
             AND commencing = 0 AND headcount IS NOT NULL
           GROUP BY year ORDER BY year""",
        (inst_id, field_id),
    ).fetchall()
    enrolment_trend = [{"year": r["year"], "value": r["hc"]} for r in enrol_trend_rows]

    # ── Multi-year completions trend for this field ──────────────────
    comp_trend_rows = conn.execute(
        """SELECT year, SUM(headcount) as hc FROM completions
           WHERE institution_id = ? AND field_id = ?
             AND headcount IS NOT NULL
           GROUP BY year ORDER BY year""",
        (inst_id, field_id),
    ).fetchall()
    completions_trend = [{"year": r["year"], "value": r["hc"]} for r in comp_trend_rows]

    # ── Field ranking across all institutions ────────────────────────
    ranking = _compute_field_ranking(conn, inst_id, field_id, latest_year)

    return {
        "enrolment": field_hc,
        "total_enrolment": total_hc,
        "field_share_pct": round(field_hc / total_hc * 100, 1) if total_hc > 0 else 0,
        "year": latest_year,
        "completions": field_completions,
        "total_completions": total_completions,
        "completion_ratio": comp_ratio,
        "enrolment_trend": enrolment_trend,
        "completions_trend": completions_trend,
        "ranking": ranking,
    }


def _compute_field_ranking(
    conn: sqlite3.Connection, inst_id: int, field_id: int, year: int
) -> Optional[Dict[str, Any]]:
    """
    Rank all institutions by graduation efficiency (completions / enrolments)
    for a given field in a given year.

    Returns top 5, bottom 5, current institution's position, and national avg.
    Excludes institutions with fewer than 50 enrolled students.
    """
    rows = conn.execute(
        """
        SELECT
            i.id,
            i.name,
            e.hc   AS enrolled,
            COALESCE(c.hc, 0) AS graduates
        FROM (
            SELECT institution_id, MAX(headcount) AS hc
            FROM enrolments
            WHERE field_id = ? AND year = ?
              AND commencing = 0 AND headcount IS NOT NULL
            GROUP BY institution_id
        ) e
        JOIN institutions i ON i.id = e.institution_id
        LEFT JOIN (
            SELECT institution_id, SUM(headcount) AS hc
            FROM completions
            WHERE field_id = ? AND year = ?
              AND headcount IS NOT NULL
            GROUP BY institution_id
        ) c ON c.institution_id = e.institution_id
        WHERE e.hc >= 50
          AND LENGTH(i.name) >= 5
          AND i.name NOT GLOB '[0-9]*'
          AND i.name NOT LIKE '%Total%'
          AND i.name NOT LIKE '%Provider%'
        ORDER BY i.name
        """,
        (field_id, year, field_id, year),
    ).fetchall()

    if not rows:
        return None

    # Build ranked list
    ranked = []
    for r in rows:
        enrolled = r["enrolled"]
        graduates = r["graduates"]
        ratio = round(graduates / enrolled * 100, 1) if enrolled > 0 else 0.0
        ranked.append({
            "id": r["id"],
            "name": r["name"],
            "enrolled": enrolled,
            "graduates": graduates,
            "ratio": ratio,
        })

    # Sort by ratio descending
    ranked.sort(key=lambda x: x["ratio"], reverse=True)

    # Assign ranks
    for i, entry in enumerate(ranked):
        entry["rank"] = i + 1

    # Find current institution
    this_entry = next((e for e in ranked if e["id"] == inst_id), None)

    # National average ratio
    total_grads = sum(e["graduates"] for e in ranked)
    total_enrolled = sum(e["enrolled"] for e in ranked)
    national_avg = round(total_grads / total_enrolled * 100, 1) if total_enrolled > 0 else 0.0

    # Top 5 and bottom 5
    top_5 = ranked[:5]
    bottom_5 = ranked[-5:] if len(ranked) > 5 else []

    return {
        "this_institution": {
            "rank": this_entry["rank"] if this_entry else None,
            "of": len(ranked),
            "ratio": this_entry["ratio"] if this_entry else None,
        },
        "top_5": top_5,
        "bottom_5": bottom_5,
        "national_avg_ratio": national_avg,
    }


# ======================================================================
# Heatmap: field-level risk comparison across all institutions
# ======================================================================

HEATMAP_RISK_THRESHOLDS = (10.0, 18.0)  # (low_max, medium_max)


def _heatmap_risk_tier(score: float) -> str:
    """Map composite risk score to a tier label."""
    low_max, medium_max = HEATMAP_RISK_THRESHOLDS
    if score < low_max:
        return "low"
    elif score < medium_max:
        return "medium"
    return "high"


def compute_field_heatmap(
    conn: sqlite3.Connection,
    field_id: int,
) -> Optional[Dict[str, Any]]:
    """
    Compute attrition risk heatmap for all institutions offering a given field.

    Returns institution rows ranked by composite risk score (ascending = safest first).
    Composite risk = attrition_rate * (1 - min(completions/enrolments, 1.0))

    Data sources:
    - Attrition: latest year available, student_type='all', measure='attrition'
    - Enrolments/Completions: year=2024, commencing=0
    - Excludes field_ids 11, 12, 13 (insufficient data)
    - Excludes institution-field pairs with fewer than 50 enrolled students
      (small cohorts produce unreliable graduation ratios)

    Returns None if field_id is invalid or no data exists.
    """
    EXCLUDED_FIELDS = {11, 12, 13}
    MIN_ENROLLED = 50  # matches _compute_field_ranking threshold
    ENROL_YEAR = 2024

    # Validate field
    if field_id in EXCLUDED_FIELDS:
        return None

    frow = conn.execute(
        "SELECT id, broad_field FROM fields_of_education WHERE id = ?",
        (field_id,),
    ).fetchone()
    if not frow:
        return None

    field_name = frow["broad_field"]

    # Find latest attrition year
    ayr_row = conn.execute(
        """SELECT MAX(year) as yr FROM attrition_retention
           WHERE measure = 'attrition' AND student_type = 'all'
             AND rate IS NOT NULL""",
    ).fetchone()
    if not ayr_row or not ayr_row["yr"]:
        return None
    attrition_year = ayr_row["yr"]

    # Main query: join attrition + enrolments + completions
    rows = conn.execute(
        """
        SELECT
            i.id        AS institution_id,
            i.name      AS institution_name,
            i.state,
            ar.rate     AS attrition_rate,
            e.hc        AS enrolled,
            COALESCE(c.hc, 0) AS completions
        FROM attrition_retention ar
        JOIN institutions i ON i.id = ar.institution_id
        JOIN (
            SELECT institution_id, MAX(headcount) AS hc
            FROM enrolments
            WHERE field_id = ? AND year = ?
              AND commencing = 0 AND headcount IS NOT NULL
            GROUP BY institution_id
        ) e ON e.institution_id = ar.institution_id
        LEFT JOIN (
            SELECT institution_id, SUM(headcount) AS hc
            FROM completions
            WHERE field_id = ? AND year = ?
              AND headcount IS NOT NULL
            GROUP BY institution_id
        ) c ON c.institution_id = ar.institution_id
        WHERE ar.year = ?
          AND ar.student_type = 'all'
          AND ar.measure = 'attrition'
          AND ar.rate IS NOT NULL
          AND e.hc >= ?
          AND i.name NOT LIKE '%Total%'
          AND i.name NOT LIKE '%Provider%'
          AND LENGTH(i.name) >= 5
          AND i.name NOT GLOB '[0-9]*'
        ORDER BY i.name
        """,
        (field_id, ENROL_YEAR, field_id, ENROL_YEAR, attrition_year, MIN_ENROLLED),
    ).fetchall()

    if not rows:
        return None

    entries = []
    for r in rows:
        enrolled = r["enrolled"]
        completions = r["completions"]
        attrition_rate = r["attrition_rate"]

        # Clamp graduation ratio to [0, 100]
        raw_ratio = (completions / enrolled * 100.0) if enrolled > 0 else 0.0
        grad_ratio = round(min(raw_ratio, 100.0), 1)

        composite_risk = round(attrition_rate * (1.0 - grad_ratio / 100.0), 2)

        entries.append({
            "institution_id": r["institution_id"],
            "institution_name": r["institution_name"],
            "state": r["state"] or "",
            "attrition_rate": round(attrition_rate, 2),
            "grad_ratio": grad_ratio,
            "composite_risk": composite_risk,
            "risk_tier": _heatmap_risk_tier(composite_risk),
        })

    # Sort by composite_risk ascending (safest first)
    entries.sort(key=lambda x: x["composite_risk"])

    # Summary statistics
    risks = [e["composite_risk"] for e in entries]
    avg_risk = round(sum(risks) / len(risks), 2)
    min_risk = round(min(risks), 2)
    max_risk = round(max(risks), 2)

    best_entry = entries[0]
    worst_entry = entries[-1]

    return {
        "field_id": field_id,
        "field_name": field_name,
        "entries": entries,
        "summary": {
            "num_institutions": len(entries),
            "avg_risk": avg_risk,
            "min_risk": min_risk,
            "max_risk": max_risk,
            "best_institution_name": best_entry["institution_name"],
            "worst_institution_name": worst_entry["institution_name"],
            "attrition_year": attrition_year,
            "enrolment_year": ENROL_YEAR,
        },
    }


# ======================================================================
# Equity Report: per-institution equity group performance
# ======================================================================

EQUITY_GROUPS = ["low_ses", "regional", "first_nations", "disability", "nesb", "remote"]
EQUITY_MEASURES = ["retention", "success", "attainment"]

EQUITY_GROUP_LABELS = {
    "all_domestic": "All Domestic Students",
    "low_ses": "Low Socioeconomic Status",
    "regional": "Regional Students",
    "remote": "Remote Students",
    "first_nations": "First Nations Students",
    "disability": "Students with Disability",
    "nesb": "Non-English Speaking Background",
}


def compute_equity_report(
    conn: sqlite3.Connection,
    institution_id: int,
) -> Optional[Dict[str, Any]]:
    """
    Compute equity support analysis for an institution.

    For each equity group and measure, returns:
    - institution rate
    - national average rate (across all institutions)
    - gap (institution - national avg, positive = better)
    - 5-year retention trend

    Also returns a summary score: how many equity groups does this
    institution outperform the national average in retention.
    """
    # Validate institution
    inst_row = conn.execute(
        "SELECT id, name, state FROM institutions WHERE id = ?",
        (institution_id,),
    ).fetchone()
    if not inst_row:
        return None

    # Check if institution has any equity data
    check = conn.execute(
        "SELECT COUNT(*) as c FROM equity_performance WHERE institution_id = ?",
        (institution_id,),
    ).fetchone()
    if not check or check["c"] == 0:
        return None

    # Find latest year for each measure
    latest_years: Dict[str, int] = {}
    for measure in EQUITY_MEASURES:
        yr_row = conn.execute(
            """SELECT MAX(year) as yr FROM equity_performance
               WHERE institution_id = ? AND measure = ? AND rate IS NOT NULL""",
            (institution_id, measure),
        ).fetchone()
        if yr_row and yr_row["yr"]:
            latest_years[measure] = yr_row["yr"]

    if not latest_years:
        return None

    # Compute national averages for each (measure, equity_group, year) combo
    # Uses the latest year for each measure
    national_avgs: Dict[str, Dict[str, float]] = {}  # measure -> group -> avg
    for measure, year in latest_years.items():
        national_avgs[measure] = {}
        avg_rows = conn.execute(
            """SELECT equity_group, AVG(rate) as avg_rate
               FROM equity_performance ep
               JOIN institutions i ON i.id = ep.institution_id
               WHERE ep.measure = ? AND ep.year = ? AND ep.rate IS NOT NULL
                 AND i.name NOT LIKE '%Total%'
                 AND i.name NOT LIKE '%Provider%'
                 AND LENGTH(i.name) >= 5
                 AND i.name NOT GLOB '[0-9]*'
               GROUP BY equity_group""",
            (measure, year),
        ).fetchall()
        for r in avg_rows:
            national_avgs[measure][r["equity_group"]] = round(r["avg_rate"], 2)

    # Build group data
    groups: Dict[str, Dict[str, Any]] = {}
    for group in EQUITY_GROUPS:
        group_data: Dict[str, Any] = {}
        for measure in EQUITY_MEASURES:
            year = latest_years.get(measure)
            if not year:
                group_data[measure] = {"rate": None, "national_avg": None, "gap": None}
                continue

            row = conn.execute(
                """SELECT rate FROM equity_performance
                   WHERE institution_id = ? AND measure = ? AND equity_group = ?
                     AND year = ? AND rate IS NOT NULL""",
                (institution_id, measure, group, year),
            ).fetchone()

            rate = round(row["rate"], 2) if row else None
            nat_avg = national_avgs.get(measure, {}).get(group)
            gap = round(rate - nat_avg, 2) if rate is not None and nat_avg is not None else None

            group_data[measure] = {
                "rate": rate,
                "national_avg": nat_avg,
                "gap": gap,
            }

        # Retention trend (last 5 years)
        trend_rows = conn.execute(
            """SELECT year, rate FROM equity_performance
               WHERE institution_id = ? AND measure = 'retention'
                 AND equity_group = ? AND rate IS NOT NULL
               ORDER BY year DESC LIMIT 5""",
            (institution_id, group),
        ).fetchall()
        group_data["trend"] = [
            {"year": r["year"], "retention": round(r["rate"], 2)}
            for r in reversed(trend_rows)
        ]

        groups[group] = group_data

    # All domestic baseline
    all_domestic: Dict[str, Any] = {}
    for measure in EQUITY_MEASURES:
        year = latest_years.get(measure)
        if not year:
            all_domestic[measure] = {"rate": None, "national_avg": None, "gap": None}
            continue
        row = conn.execute(
            """SELECT rate FROM equity_performance
               WHERE institution_id = ? AND measure = ? AND equity_group = 'all_domestic'
                 AND year = ? AND rate IS NOT NULL""",
            (institution_id, measure, year),
        ).fetchone()
        rate = round(row["rate"], 2) if row else None
        nat_avg = national_avgs.get(measure, {}).get("all_domestic")
        gap = round(rate - nat_avg, 2) if rate is not None and nat_avg is not None else None
        all_domestic[measure] = {"rate": rate, "national_avg": nat_avg, "gap": gap}

    # Support summary: count groups where retention gap is positive
    # Use retention as the primary measure for the summary score
    groups_above = 0
    groups_total = 0
    for group in EQUITY_GROUPS:
        ret_gap = groups[group].get("retention", {}).get("gap")
        if ret_gap is not None:
            groups_total += 1
            if ret_gap >= 0:
                groups_above += 1

    if groups_total == 0:
        label = "No Data"
    elif groups_above >= groups_total * 0.7:
        label = "Strong"
    elif groups_above >= groups_total * 0.4:
        label = "Mixed"
    else:
        label = "Weak"

    return {
        "institution": {
            "id": inst_row["id"],
            "name": inst_row["name"],
            "state": inst_row["state"] or "",
        },
        "latest_year": {m: y for m, y in latest_years.items()},
        "groups": groups,
        "all_domestic": all_domestic,
        "support_summary": {
            "groups_above_avg": groups_above,
            "groups_total": groups_total,
            "overall_label": label,
        },
    }
