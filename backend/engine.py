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

    # ------------------------------------------------------------------
    # International student data (overseas attrition/retention/success)
    # ------------------------------------------------------------------
    international = _compute_international(conn, institution_id)

    # ------------------------------------------------------------------
    # Course level mix (undergrad vs postgrad breakdown)
    # ------------------------------------------------------------------
    course_level = _compute_course_level(conn, institution_id)

    # ------------------------------------------------------------------
    # Student-staff ratios (teaching intensity signal)
    # ------------------------------------------------------------------
    staff_ratio = _compute_staff_ratio(conn, institution_id)

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
        "international": international,
        "course_level": course_level,
        "staff_ratio": staff_ratio,
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


def _compute_international(conn: sqlite3.Connection, inst_id: int) -> Optional[Dict[str, Any]]:
    """
    Compute international (overseas) student metrics for comparison with domestic.

    Returns overseas attrition, retention, success rates, national averages,
    and a 5-year attrition trend. Returns None if no overseas data exists.
    """
    # Check if this institution has any overseas data
    check = conn.execute(
        """SELECT COUNT(*) as c FROM attrition_retention
           WHERE institution_id = ? AND student_type = 'overseas'
             AND rate IS NOT NULL""",
        (inst_id,),
    ).fetchone()
    if not check or check["c"] == 0:
        return None

    # Latest overseas attrition
    attrition_row = conn.execute(
        """SELECT rate, year FROM attrition_retention
           WHERE institution_id = ? AND student_type = 'overseas'
             AND measure = 'attrition' AND rate IS NOT NULL
           ORDER BY year DESC LIMIT 1""",
        (inst_id,),
    ).fetchone()

    # Latest overseas retention
    retention_row = conn.execute(
        """SELECT rate, year FROM attrition_retention
           WHERE institution_id = ? AND student_type = 'overseas'
             AND measure = 'retention' AND rate IS NOT NULL
           ORDER BY year DESC LIMIT 1""",
        (inst_id,),
    ).fetchone()

    # Latest overseas success
    success_row = conn.execute(
        """SELECT rate, year FROM attrition_retention
           WHERE institution_id = ? AND student_type = 'overseas'
             AND measure = 'success' AND rate IS NOT NULL
           ORDER BY year DESC LIMIT 1""",
        (inst_id,),
    ).fetchone()

    # National averages for overseas students (same year as this institution)
    attrition_nat_avg = None
    retention_nat_avg = None
    success_nat_avg = None

    if attrition_row:
        avg = conn.execute(
            """SELECT AVG(ar.rate) as avg_rate FROM attrition_retention ar
               JOIN institutions i ON ar.institution_id = i.id
               WHERE ar.student_type = 'overseas' AND ar.measure = 'attrition'
                 AND ar.year = ? AND ar.rate IS NOT NULL
                 AND i.name NOT LIKE '%Total%' AND i.name NOT LIKE '%Provider%'""",
            (attrition_row["year"],),
        ).fetchone()
        if avg and avg["avg_rate"]:
            attrition_nat_avg = round(avg["avg_rate"], 2)

    if retention_row:
        avg = conn.execute(
            """SELECT AVG(ar.rate) as avg_rate FROM attrition_retention ar
               JOIN institutions i ON ar.institution_id = i.id
               WHERE ar.student_type = 'overseas' AND ar.measure = 'retention'
                 AND ar.year = ? AND ar.rate IS NOT NULL
                 AND i.name NOT LIKE '%Total%' AND i.name NOT LIKE '%Provider%'""",
            (retention_row["year"],),
        ).fetchone()
        if avg and avg["avg_rate"]:
            retention_nat_avg = round(avg["avg_rate"], 2)

    if success_row:
        avg = conn.execute(
            """SELECT AVG(ar.rate) as avg_rate FROM attrition_retention ar
               JOIN institutions i ON ar.institution_id = i.id
               WHERE ar.student_type = 'overseas' AND ar.measure = 'success'
                 AND ar.year = ? AND ar.rate IS NOT NULL
                 AND i.name NOT LIKE '%Total%' AND i.name NOT LIKE '%Provider%'""",
            (success_row["year"],),
        ).fetchone()
        if avg and avg["avg_rate"]:
            success_nat_avg = round(avg["avg_rate"], 2)

    # 5-year overseas attrition trend
    trend_rows = conn.execute(
        """SELECT year, rate FROM attrition_retention
           WHERE institution_id = ? AND student_type = 'overseas'
             AND measure = 'attrition' AND rate IS NOT NULL
           ORDER BY year DESC LIMIT 5""",
        (inst_id,),
    ).fetchall()
    trend = [{"year": r["year"], "rate": round(r["rate"], 2)} for r in reversed(trend_rows)]

    return {
        "attrition": {
            "rate": round(attrition_row["rate"], 2) if attrition_row else None,
            "year": attrition_row["year"] if attrition_row else None,
            "national_avg": attrition_nat_avg,
        },
        "retention": {
            "rate": round(retention_row["rate"], 2) if retention_row else None,
            "year": retention_row["year"] if retention_row else None,
            "national_avg": retention_nat_avg,
        },
        "success": {
            "rate": round(success_row["rate"], 2) if success_row else None,
            "year": success_row["year"] if success_row else None,
            "national_avg": success_nat_avg,
        },
        "trend": trend,
    }


def _compute_course_level(conn: sqlite3.Connection, inst_id: int) -> Optional[Dict[str, Any]]:
    """
    Compute course-level mix (undergrad vs postgrad breakdown).

    Returns enrolment and completion counts by broad course level, along with
    percentage shares and national averages for comparison.
    Returns None if no course-level data exists for this institution.
    """
    enrol = conn.execute(
        """SELECT postgrad_research, postgrad_coursework, bachelor, sub_bachelor, total, year
           FROM course_level_mix
           WHERE institution_id = ? AND measure = 'enrolment'
           ORDER BY year DESC LIMIT 1""",
        (inst_id,),
    ).fetchone()

    comp = conn.execute(
        """SELECT postgrad_research, postgrad_coursework, bachelor, sub_bachelor, total, year
           FROM course_level_mix
           WHERE institution_id = ? AND measure = 'completion'
           ORDER BY year DESC LIMIT 1""",
        (inst_id,),
    ).fetchone()

    if not enrol and not comp:
        return None

    def _to_pcts(row) -> Dict[str, Any]:
        """Convert raw counts to a dict with counts and percentages.

        Percentages are computed from the sum of the four displayed
        categories (not the grand total, which may include enabling
        courses and non-award/microcredentials).  This ensures the
        stacked bar always fills to 100%.
        """
        if not row:
            return None
        total = row["total"] or 0
        if total == 0:
            return None
        pr = row["postgrad_research"] or 0
        pc = row["postgrad_coursework"] or 0
        ba = row["bachelor"] or 0
        sb = row["sub_bachelor"] or 0
        displayed_sum = pr + pc + ba + sb
        denom = displayed_sum if displayed_sum > 0 else 1
        return {
            "postgrad_research": pr,
            "postgrad_coursework": pc,
            "bachelor": ba,
            "sub_bachelor": sb,
            "total": total,
            "year": row["year"],
            "pct_postgrad_research": round(pr / denom * 100, 1),
            "pct_postgrad_coursework": round(pc / denom * 100, 1),
            "pct_bachelor": round(ba / denom * 100, 1),
            "pct_sub_bachelor": round(sb / denom * 100, 1),
        }

    enrol_data = _to_pcts(enrol)
    comp_data = _to_pcts(comp)

    # Compute national averages for enrolment percentages
    nat_enrol = conn.execute(
        """SELECT SUM(postgrad_research) as pr, SUM(postgrad_coursework) as pc,
                  SUM(bachelor) as ba, SUM(sub_bachelor) as sb, SUM(total) as t
           FROM course_level_mix
           WHERE measure = 'enrolment' AND year = (
               SELECT MAX(year) FROM course_level_mix WHERE measure = 'enrolment'
           )""",
    ).fetchone()

    nat_enrol_pcts = None
    if nat_enrol and nat_enrol["t"] and nat_enrol["t"] > 0:
        # Use four-category sum as denominator so national bar also fills to 100%
        n_pr = nat_enrol["pr"] or 0
        n_pc = nat_enrol["pc"] or 0
        n_ba = nat_enrol["ba"] or 0
        n_sb = nat_enrol["sb"] or 0
        n_denom = n_pr + n_pc + n_ba + n_sb
        if n_denom > 0:
            nat_enrol_pcts = {
                "pct_postgrad_research": round(n_pr / n_denom * 100, 1),
                "pct_postgrad_coursework": round(n_pc / n_denom * 100, 1),
                "pct_bachelor": round(n_ba / n_denom * 100, 1),
                "pct_sub_bachelor": round(n_sb / n_denom * 100, 1),
            }

    # Compute a simple "completion efficiency" per level:
    # completions / enrolments as a ratio — how many completions per student enrolled
    efficiency = None
    if enrol_data and comp_data and enrol_data["total"] > 0:
        levels = ["postgrad_research", "postgrad_coursework", "bachelor", "sub_bachelor"]
        eff = {}
        for lev in levels:
            e = enrol_data.get(lev) or 0
            c = comp_data.get(lev) or 0
            eff[lev] = round(c / e * 100, 1) if e > 0 else None
        # Overall
        eff["overall"] = round(comp_data["total"] / enrol_data["total"] * 100, 1)
        efficiency = eff

    return {
        "enrolment": enrol_data,
        "completion": comp_data,
        "national_avg_enrolment": nat_enrol_pcts,
        "efficiency": efficiency,
    }


def _compute_staff_ratio(conn: sqlite3.Connection, inst_id: int) -> Optional[Dict[str, Any]]:
    """
    Compute student-staff ratio data for an institution.

    Returns the latest year's ratio, national average, percentile rank,
    and a 10-year trend. Returns None if no data exists.
    """
    # Latest year's data for this institution
    latest = conn.execute(
        """SELECT year, academic_ratio, non_academic_ratio,
                  eftsl, academic_fte, non_academic_fte
           FROM student_staff_ratios
           WHERE institution_id = ? AND academic_ratio IS NOT NULL
           ORDER BY year DESC LIMIT 1""",
        (inst_id,),
    ).fetchone()

    if not latest:
        return None

    yr = latest["year"]
    acad_ratio = latest["academic_ratio"]

    # National average for the same year (exclude outliers: ratios < 3 are specialty institutions)
    nat_avg_row = conn.execute(
        """SELECT AVG(s.academic_ratio) as avg_ratio,
                  AVG(s.non_academic_ratio) as avg_non_acad
           FROM student_staff_ratios s
           JOIN institutions i ON s.institution_id = i.id
           WHERE s.year = ? AND s.academic_ratio IS NOT NULL
             AND s.academic_ratio >= 3
             AND i.name NOT LIKE '%Total%'""",
        (yr,),
    ).fetchone()

    nat_avg_academic = round(nat_avg_row["avg_ratio"], 1) if nat_avg_row and nat_avg_row["avg_ratio"] else None
    nat_avg_non_acad = round(nat_avg_row["avg_non_acad"], 1) if nat_avg_row and nat_avg_row["avg_non_acad"] else None

    # Percentile rank (lower ratio = better, so invert: lower ratio = lower percentile)
    all_ratios = conn.execute(
        """SELECT s.academic_ratio FROM student_staff_ratios s
           JOIN institutions i ON s.institution_id = i.id
           WHERE s.year = ? AND s.academic_ratio IS NOT NULL
             AND s.academic_ratio >= 3
             AND i.name NOT LIKE '%Total%'""",
        (yr,),
    ).fetchall()
    all_vals = [r["academic_ratio"] for r in all_ratios]
    percentile = round(_percentile_rank(acad_ratio, all_vals), 1)

    # Intensity label (lower ratio = more intensive teaching)
    if percentile < 25:
        intensity = "Very High"
    elif percentile < 50:
        intensity = "High"
    elif percentile < 75:
        intensity = "Moderate"
    else:
        intensity = "Low"

    # Full trend (all years available for this institution)
    trend_rows = conn.execute(
        """SELECT year, academic_ratio, non_academic_ratio
           FROM student_staff_ratios
           WHERE institution_id = ? AND academic_ratio IS NOT NULL
           ORDER BY year ASC""",
        (inst_id,),
    ).fetchall()
    trend = [
        {
            "year": r["year"],
            "academic": round(r["academic_ratio"], 1),
            "non_academic": round(r["non_academic_ratio"], 1) if r["non_academic_ratio"] else None,
        }
        for r in trend_rows
    ]

    # Trend direction (is the ratio increasing or decreasing?)
    if len(trend) >= 3:
        recent = trend[-5:] if len(trend) >= 5 else trend
        xs = [float(t["year"]) for t in recent]
        ys = [float(t["academic"]) for t in recent]
        slope = _linear_slope(xs, ys)
        if slope > 0.3:
            trend_dir = "increasing"    # getting worse (more students per staff)
        elif slope < -0.3:
            trend_dir = "decreasing"    # getting better (fewer students per staff)
        else:
            trend_dir = "stable"
    else:
        slope = 0.0
        trend_dir = "stable"

    return {
        "year": yr,
        "academic_ratio": acad_ratio,
        "non_academic_ratio": latest["non_academic_ratio"],
        "eftsl": latest["eftsl"],
        "academic_fte": latest["academic_fte"],
        "non_academic_fte": latest["non_academic_fte"],
        "national_avg_academic": nat_avg_academic,
        "national_avg_non_academic": nat_avg_non_acad,
        "percentile": percentile,
        "intensity": intensity,
        "trend": trend,
        "trend_direction": trend_dir,
        "trend_slope": round(slope, 3),
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


# ── ATAR & Course Data (UAC) ───────────────────────────────────────

ATAR_SENTINELS = frozenset({
    "NO", "NC", "NS", "NR", "NP", "NN", "N/A", "N/P", "<5", "--", "",
})

COURSE_LEVEL_LABELS = {
    "TBP": "Bachelor",
    "TBH": "Bachelor (Honours)",
    "TBG": "Bachelor (Grad Entry)",
    "TCM": "Bachelor/Master",
    "TAB": "Associate Degree",
    "TXD": "Diploma",
    "TZD": "Advanced Diploma",
    "TOA": "Undergraduate Certificate",
    "TEN": "Enabling/Preparation",
    "TNA": "Bridging",
    "TGC": "Graduate Certificate",
    "TGD": "Graduate Diploma",
    "TRM": "Research Masters",
    "TMC": "Masters (Coursework)",
}

FEE_TYPE_LABELS = {
    "CSP": "Commonwealth Supported",
    "DFEE": "Domestic Full Fee",
    "INT": "International",
    "ADF": "Australian Defence Force",
    "CBF": "Contract-Based",
    "VET": "VET FEE-HELP",
    "ENA": "Enabling",
    "OTH": "Other",
}


# ── Field of study classification (ASCED broad fields) ──────────────

FIELD_KEYWORDS = [
    # Order matters: more specific fields checked first to avoid false matches
    ("Education", [
        "education", "teaching", "teach ", "pedagogy", "tesol", "childhood",
        "classroom", "curriculum",
    ]),
    ("Health", [
        "nursing", "medicine", "medical", "health", "pharmacy", "physiotherapy",
        "occupational therapy", "speech pathology", "dentistry", "dental",
        "nutrition", "dietetics", "midwifery", "paramedic", "rehabilitation",
        "exercise science", "exercise physiology", "public health", "chiropractic",
        "podiatry", "optometry", "vision science", "clinical", "biomedical science",
        "anatomy", "surgical", "medical radiation", "aged care", "disability",
        "sonography", "epidemiology", "infectious disease", "allergic disease",
        "occupational hygiene", "cardiac", "autism", "neurodivergent",
    ]),
    ("Engineering and Related Technologies", [
        "engineering", "mechatronic", "aerospace", "aviation", "telecommunications",
        "remotely piloted",
    ]),
    ("Information Technology", [
        "information technology", "computer science", "computing", "cyber security",
        "cybersecurity", "data science", "artificial intelligence",
        "information systems", "game development", "game design",
        "games development", "interactive media", "interactive technology",
    ]),
    ("Management and Commerce", [
        "business", "commerce", "accounting", "finance", "marketing",
        "economics", "banking", "actuarial", "entrepreneurship",
        "human resource", "supply chain", "logistics", "property",
        "tourism", "hotel", "event management", "sport management",
        "sports management", "aviation management", "football",
        "financial technology", "coaching", "high performance sport",
        "sport ", "master of management", "bachelor of management",
        "diploma of management", "certificate in management",
        "project management", "start up", "startup",
    ]),
    ("Creative Arts", [
        "design", "music", "film", "animation", "photography", "creative",
        "visual art", "fine art", "performing art", "theatre", "graphic design",
        "interior design", "fashion", "media production", "screen", "audio",
        "digital media", "illustration", "sound production", "dance",
        "communication design", " art ",
    ]),
    ("Natural and Physical Sciences", [
        "science", "physics", "chemistry", "biology", "mathematics", "geology",
        "environmental science", "marine", "earth science", "astronomy",
        "biochemistry", "biotechnology", "genetics", "microbiology", "zoology",
        "ecology", "conservation biology", "neuroscience", "statistics",
        "mathematical", "forensic", "scientific",
    ]),
    ("Society and Culture", [
        "law", "juris doctor", "legal", "criminology", "psychology",
        "social work", "social science", "sociology", "anthropology",
        "political", "international studies", "international relations",
        "philosophy", "history", "historical", "languages", "linguistics",
        "communication", "journalism", "media", "theology", "theological",
        "ministry", "divinity", "counselling", "human services",
        "security studies", "justice", "liberal arts", "liberal studies",
        "development studies", "gender studies", "indigenous", "aboriginal",
        "policing", "human rights", "archaeology", "welfare", "youth work",
        "interpreting", "translation", "intelligence", "strategy and security",
        "public policy", "policy", "catholic thought", "modern slavery",
        "bioethics", "ethics", "bachelor of arts", "diploma of arts",
    ]),
    ("Architecture and Building", [
        "architecture", "architectural", "building", "construction",
        "built environment", "landscape arch", "urban planning", "planning",
        "surveying", "quantity surveying", "bushfire protection",
    ]),
    ("Agriculture, Environmental and Related Studies", [
        "agriculture", "agricultural", "veterinary", "horticulture", "forestry",
        "environmental management", "natural resource", "wildlife",
        "animal science", "sustainability", "sustainable development",
        "environmental studies", "environment",
    ]),
    ("Food, Hospitality and Personal Services", [
        "culinary", "food science", "food technology", "cookery",
    ]),
]

# Short labels for display
FIELD_OF_STUDY_LABELS = {
    "Agriculture, Environmental and Related Studies": "Agriculture & Environment",
    "Architecture and Building": "Architecture & Building",
    "Creative Arts": "Creative Arts",
    "Education": "Education",
    "Engineering and Related Technologies": "Engineering",
    "Food, Hospitality and Personal Services": "Food & Hospitality",
    "Health": "Health",
    "Information Technology": "IT",
    "Management and Commerce": "Management & Commerce",
    "Mixed Field Programs": "Mixed / Other",
    "Natural and Physical Sciences": "Sciences",
    "Society and Culture": "Society & Culture",
}

# Patterns that indicate enabling/preparation courses
_ENABLING_PATTERNS = frozenset({
    "uniready", "open foundation", "foundation studies", "empowered",
    "university preparation", "enabling program", "entrance program",
})


def _classify_field(title, areas_of_study):
    """Classify a course into an ASCED broad field based on title and areas text.

    Strategy: check the title first (highly reliable), then fall back to
    areas_of_study text.  The title alone resolves >95 % of courses.
    """
    t = (title or "").lower()

    # Enabling/preparation courses → Mixed Field Programs
    for pat in _ENABLING_PATTERNS:
        if pat in t:
            return "Mixed Field Programs"

    # Try classification on title only first
    for field, keywords in FIELD_KEYWORDS:
        for kw in keywords:
            if kw in t:
                return field

    # Fall back to areas_of_study (may contain generic terms, so still
    # useful for courses with uninformative titles like "Diploma of …")
    a = (areas_of_study or "").lower()
    if a:
        for field, keywords in FIELD_KEYWORDS:
            for kw in keywords:
                if kw in a:
                    return field

    return "Mixed Field Programs"


def _parse_atar(val):
    """Parse ATAR text to float, returning None for sentinel values."""
    if not val or str(val).strip().upper() in ATAR_SENTINELS:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def compute_courses_report(conn, institution_id):
    """
    Return UAC course listings with ATAR profiles and entry requirements
    for a given institution.  Returns None if no UAC data exists.
    """
    # Validate institution
    inst_row = conn.execute(
        "SELECT id, name, state FROM institutions WHERE id = ?",
        (institution_id,),
    ).fetchone()
    if not inst_row:
        return None

    # Fetch all current courses for this institution
    rows = conn.execute("""
        SELECT
            uc.course_code, uc.level, uc.title,
            uc.course_level, uc.fee_type, uc.duration,
            uc.mode_of_attendance, uc.campus_code,
            uc.campus_location, camp.name_short AS campus_name,
            uc.atar_year, uc.atar_lowest, uc.atar_median, uc.atar_highest,
            uc.selection_rank_lowest, uc.selection_rank_median,
            uc.selection_rank_highest,
            uc.student_profile_year, uc.total_students,
            uc.pct_atar_based, uc.pct_higher_ed, uc.pct_vet,
            uc.pct_work_life, uc.pct_international,
            ucd.about, ucd.assumed_knowledge,
            ucd.admission_criteria, ucd.career_opportunities,
            ucd.areas_of_study,
            ucd.practical_experience, ucd.professional_recognition,
            ucd.further_info_url,
            uc.start_months
        FROM uac_courses uc
        LEFT JOIN uac_course_details ucd
            ON ucd.course_code = uc.course_code AND ucd.level = uc.level
        LEFT JOIN uac_campuses camp
            ON camp.campus_location_code = uc.campus_location
        WHERE uc.institution_id = ?
          AND uc.course_status = 'C'
        ORDER BY uc.level, uc.title
    """, (institution_id,)).fetchall()

    if not rows:
        return None

    # Deduplicate by (course_code, campus_code) — merge level variants,
    # preferring undergraduate row for ATAR display
    LEVEL_PRIORITY = {"undergraduate": 0, "international": 1, "postgraduate": 2}
    seen = {}

    for r in rows:
        key = (r["course_code"], r["campus_code"])
        level = r["level"]
        priority = LEVEL_PRIORITY.get(level, 9)

        if key not in seen or priority < seen[key]["_priority"]:
            seen[key] = {
                "_priority": priority,
                "course_code": r["course_code"],
                "title": r["title"],
                "levels": [level],
                "course_level": r["course_level"],
                "course_level_label": COURSE_LEVEL_LABELS.get(
                    r["course_level"], r["course_level"]
                ),
                "fee_type": r["fee_type"],
                "fee_type_label": FEE_TYPE_LABELS.get(
                    r["fee_type"], r["fee_type"]
                ),
                "duration": r["duration"],
                "mode_of_attendance": r["mode_of_attendance"],
                "campus_name": r["campus_name"] or r["campus_code"],
                "atar_year": r["atar_year"],
                "atar_lowest": r["atar_lowest"],
                "atar_median": r["atar_median"],
                "atar_highest": r["atar_highest"],
                "atar_lowest_num": _parse_atar(r["atar_lowest"]),
                "atar_median_num": _parse_atar(r["atar_median"]),
                "selection_rank_lowest": r["selection_rank_lowest"],
                "selection_rank_median": r["selection_rank_median"],
                "selection_rank_highest": r["selection_rank_highest"],
                "student_profile_year": r["student_profile_year"],
                "total_students": r["total_students"],
                "pct_atar_based": r["pct_atar_based"],
                "pct_higher_ed": r["pct_higher_ed"],
                "pct_vet": r["pct_vet"],
                "pct_work_life": r["pct_work_life"],
                "pct_international": r["pct_international"],
                "about": r["about"],
                "assumed_knowledge": r["assumed_knowledge"],
                "admission_criteria": r["admission_criteria"],
                "career_opportunities": r["career_opportunities"],
                "practical_experience": r["practical_experience"],
                "professional_recognition": r["professional_recognition"],
                "further_info_url": r["further_info_url"],
                "start_months": r["start_months"],
                "field_of_study": _classify_field(
                    r["title"], r["areas_of_study"]
                ),
            }
        else:
            # Merge level into existing entry
            if level not in seen[key]["levels"]:
                seen[key]["levels"].append(level)

    # Build raw course list, dropping internal _priority field and adding labels
    raw_courses = []
    for entry in seen.values():
        entry.pop("_priority", None)
        fos = entry.get("field_of_study", "Mixed Field Programs")
        entry["field_of_study_label"] = FIELD_OF_STUDY_LABELS.get(fos, fos)
        raw_courses.append(entry)

    # ── Group multi-campus variants of the same course ────────────────
    # UAC assigns separate course_codes to each campus offering of the
    # same programme (e.g. Nursing at Campbelltown, Parramatta, etc.).
    # We group by (title, course_level) and present one card per group,
    # with a campuses[] array showing per-campus ATAR detail.
    from collections import defaultdict

    campus_groups = defaultdict(list)
    for entry in raw_courses:
        group_key = (entry["title"], entry["course_level"])
        campus_groups[group_key].append(entry)

    courses = []
    # Map: every course_code in a group -> primary course_code
    # (used later to merge ATAR trend data)
    _course_code_to_primary = {}

    for group_key, group_entries in campus_groups.items():
        # Sort: prefer entries with valid numeric ATAR, then by course_code
        group_entries.sort(
            key=lambda e: (
                0 if e["atar_lowest_num"] is not None else 1,
                -(e["atar_lowest_num"] or 0),
                e["course_code"],
            )
        )

        # Build campuses array from all entries
        campuses = []
        for e in group_entries:
            campuses.append({
                "campus_name": e["campus_name"],
                "course_code": e["course_code"],
                "atar_lowest": e["atar_lowest"],
                "atar_lowest_num": e["atar_lowest_num"],
                "selection_rank_lowest": e["selection_rank_lowest"],
                "selection_rank_median": e["selection_rank_median"],
                "further_info_url": e["further_info_url"],
            })

        # Sort campuses by ATAR ascending (nulls last)
        campuses.sort(
            key=lambda c: (
                0 if c["atar_lowest_num"] is not None else 1,
                c["atar_lowest_num"] or 999,
            )
        )

        # Pick the primary entry — the one with the lowest valid ATAR
        # (representing the easiest entry point for prospective students)
        primary = None
        for e in group_entries:
            if e["atar_lowest_num"] is not None:
                if primary is None or e["atar_lowest_num"] < primary["atar_lowest_num"]:
                    primary = e
        if primary is None:
            primary = group_entries[0]

        # Track code mapping for ATAR trends
        for e in group_entries:
            _course_code_to_primary[e["course_code"]] = primary["course_code"]

        primary["campuses"] = campuses
        primary["campus_count"] = len(campuses)

        if len(campuses) > 1:
            # Set ATAR to the lowest across campuses (easiest entry)
            valid_atars = [c["atar_lowest_num"] for c in campuses if c["atar_lowest_num"] is not None]
            if valid_atars:
                lowest = min(valid_atars)
                # Find the campus entry with this lowest ATAR for raw string
                for c in campuses:
                    if c["atar_lowest_num"] == lowest:
                        primary["atar_lowest"] = c["atar_lowest"]
                        primary["atar_lowest_num"] = lowest
                        break
            primary["campus_name"] = None  # multiple campuses
        # else: single campus, keep campus_name as-is

        courses.append(primary)

    # Sort by title
    courses.sort(key=lambda c: c["title"])

    # Compute summary statistics
    numeric_atars = [
        c["atar_lowest_num"] for c in courses if c["atar_lowest_num"] is not None
    ]
    atar_year = None
    for c in courses:
        if c["atar_year"]:
            atar_year = c["atar_year"]
            break

    by_level = {}
    by_fee = {}
    by_field = {}
    for c in courses:
        cl = c["course_level"] or "Unknown"
        by_level[cl] = by_level.get(cl, 0) + 1
        ft = c["fee_type"] or "Unknown"
        by_fee[ft] = by_fee.get(ft, 0) + 1
        fos = c["field_of_study"] or "Mixed Field Programs"
        by_field[fos] = by_field.get(fos, 0) + 1

    summary = {
        "total_courses": len(courses),
        "courses_with_atar": len(numeric_atars),
        "atar_range": {
            "low": min(numeric_atars),
            "high": max(numeric_atars),
        } if numeric_atars else None,
        "by_course_level": by_level,
        "by_fee_type": by_fee,
        "by_field_of_study": by_field,
        "atar_year": atar_year,
    }

    # ── Cross-institution ATAR comparison by discipline ─────────────
    # For each of this institution's courses, find similar courses at
    # OTHER institutions using discipline-level title matching.
    # Previous approach matched by broad field (e.g. "Society & Culture")
    # which was misleading — Law at 84 would be compared against an
    # Arts degree at 49 because both fall under Society & Culture.
    # Now we extract discipline keywords from titles and match like-for-like.

    # Discipline keywords: extracted from course title for matching.
    # Order matters — first match wins, so more specific before general.
    _DISCIPLINE_KEYWORDS = [
        ("Law", ["law", "legal"]),
        ("Nursing", ["nursing", "midwifery"]),
        ("Medicine", ["medicine", "medical science", "clinical science"]),
        ("Pharmacy", ["pharmacy", "pharmaceutical"]),
        ("Physiotherapy", ["physiotherapy", "physical therapy"]),
        ("Occupational Therapy", ["occupational therapy"]),
        ("Speech Pathology", ["speech pathol"]),
        ("Dentistry", ["dentistry", "dental", "oral health"]),
        ("Psychology", ["psychology", "psychological"]),
        ("Social Work", ["social work"]),
        ("Criminology", ["criminolog", "criminal justice", "policing"]),
        ("Engineering", ["engineering", "mechatronic"]),
        ("Architecture", ["architecture", "built environment", "interior architecture"]),
        ("Computer Science", ["computer science", "software", "cyber", "information technology"]),
        ("Data Science", ["data science", "data analytics"]),
        ("Education", ["education", "teaching"]),
        ("Accounting", ["accounting"]),
        ("Commerce", ["commerce", "business"]),
        ("Economics", ["economics", "actuarial"]),
        ("Science", ["science"]),
        ("Arts", ["arts"]),
        ("Communication", ["communication", "media", "journalism"]),
        ("Design", ["design"]),
        ("Music", ["music", "conservatorium"]),
    ]

    def _extract_discipline(title):
        """Extract a discipline tag from a course title for cross-institution matching."""
        t = (title or "").lower()
        for discipline, keywords in _DISCIPLINE_KEYWORDS:
            for kw in keywords:
                if kw in t:
                    return discipline
        return None

    def _extract_all_disciplines(title):
        """Extract ALL matching discipline tags (for indexing double-degrees)."""
        t = (title or "").lower()
        found = []
        for discipline, keywords in _DISCIPLINE_KEYWORDS:
            for kw in keywords:
                if kw in t:
                    found.append(discipline)
                    break
        return found

    # Tag each course with its discipline (used by frontend for comparison label)
    for c in courses:
        c["discipline"] = _extract_discipline(c["title"])

    # Build set of (discipline, field_of_study) pairs from our courses
    our_courses_by_discipline = {}
    for c in courses:
        fos = c.get("field_of_study")
        if not fos or fos == "Mixed Field Programs":
            continue
        disc = _extract_discipline(c["title"])
        if disc:
            our_courses_by_discipline.setdefault(disc, []).append(c)

    field_comparison = {}  # keyed by course_code -> {inst_name -> best entry}
    if our_courses_by_discipline:
        # Get all current *bachelor-level* courses across other institutions.
        all_rows = conn.execute("""
            SELECT uc.course_code, uc.title, uc.institution_id,
                   i.name AS institution_name,
                   uc.atar_lowest, uc.pct_atar_based,
                   ucd.areas_of_study
            FROM uac_courses uc
            JOIN uac_course_details ucd
                ON ucd.course_code = uc.course_code AND ucd.level = uc.level
            JOIN institutions i ON i.id = uc.institution_id
            WHERE uc.course_status = 'C'
              AND uc.atar_lowest IS NOT NULL
              AND uc.institution_id != ?
              AND uc.course_level = 'TBP'
        """, (institution_id,)).fetchall()

        # Index external courses by discipline
        external_by_discipline = {}
        for ar in all_rows:
            atar_num = _parse_atar(ar["atar_lowest"])
            if atar_num is None or atar_num < 1:
                continue
            pct_raw = ar["pct_atar_based"]
            if pct_raw in (None, "", "0", "<5", "N/P", "NP", "NN", "N/A"):
                continue
            try:
                pct_atar = float(pct_raw)
            except (ValueError, TypeError):
                continue
            if pct_atar < 25:
                continue
            discs = _extract_all_disciplines(ar["title"])
            entry = {
                "course_code": ar["course_code"],
                "title": ar["title"],
                "institution_name": ar["institution_name"],
                "atar_num": atar_num,
            }
            for disc in discs:
                external_by_discipline.setdefault(disc, []).append(entry)

        # For each of our courses, find discipline-matched comparisons
        for disc, our_list in our_courses_by_discipline.items():
            ext_list = external_by_discipline.get(disc, [])

            # Build best-per-institution map for this discipline
            inst_best = {}
            for ext in ext_list:
                inst = ext["institution_name"]
                if inst not in inst_best or ext["atar_num"] < inst_best[inst]["atar"]:
                    inst_best[inst] = {
                        "atar": ext["atar_num"],
                        "title": ext["title"],
                        "course_code": ext["course_code"],
                    }

            # Assign this comparison to each of our courses in this discipline.
            # Even when inst_best is empty, mark the course so it does NOT fall
            # through to the broad field-level fallback (which would be misleading).
            for c in our_list:
                cc = c["course_code"]
                field_comparison[cc] = inst_best

    # Also keep a field-level fallback for courses with no discipline match
    # (i.e. courses where _extract_discipline returns None)
    field_level_comparison = {}
    for c in courses:
        cc = c["course_code"]
        if cc in field_comparison:
            continue  # already has discipline match
        fos = c.get("field_of_study")
        if not fos or fos == "Mixed Field Programs":
            continue
        # This course has no discipline match; build a field-level one
        if fos not in field_level_comparison:
            # Compute field-level comparison on demand
            all_rows_for_field = conn.execute("""
                SELECT uc.course_code, uc.title, uc.institution_id,
                       i.name AS institution_name,
                       uc.atar_lowest, uc.pct_atar_based,
                       ucd.areas_of_study
                FROM uac_courses uc
                JOIN uac_course_details ucd
                    ON ucd.course_code = uc.course_code AND ucd.level = uc.level
                JOIN institutions i ON i.id = uc.institution_id
                WHERE uc.course_status = 'C'
                  AND uc.atar_lowest IS NOT NULL
                  AND uc.institution_id != ?
                  AND uc.course_level = 'TBP'
            """, (institution_id,)).fetchall()
            inst_best = {}
            for ar in all_rows_for_field:
                ar_fos = _classify_field(ar["title"], ar["areas_of_study"])
                if ar_fos != fos:
                    continue
                atar_num = _parse_atar(ar["atar_lowest"])
                if atar_num is None or atar_num < 1:
                    continue
                pct_raw = ar["pct_atar_based"]
                if pct_raw in (None, "", "0", "<5", "N/P", "NP", "NN", "N/A"):
                    continue
                try:
                    pct_atar = float(pct_raw)
                except (ValueError, TypeError):
                    continue
                if pct_atar < 25:
                    continue
                inst = ar["institution_name"]
                if inst not in inst_best or atar_num < inst_best[inst]["atar"]:
                    inst_best[inst] = {
                        "atar": atar_num,
                        "title": ar["title"],
                        "course_code": ar["course_code"],
                    }
            field_level_comparison[fos] = inst_best
        field_comparison[cc] = field_level_comparison[fos]

    # Convert to sorted list format per course_code
    field_comparison_out = {}
    for cc, inst_map in field_comparison.items():
        entries = sorted(
            [{"institution": k, "atar": v["atar"], "title": v["title"], "course_code": v["course_code"]}
             for k, v in inst_map.items()],
            key=lambda x: x["atar"],
        )
        field_comparison_out[cc] = entries

    # ── Historical ATAR trend per course ──────────────────────────────
    # Grab all historical ATAR data for this institution's courses
    hist_rows = conn.execute("""
        SELECT course_code, atar_year, atar_lowest
        FROM uac_courses
        WHERE institution_id = ?
          AND atar_year > 0
          AND atar_lowest IS NOT NULL
          AND course_status = 'C'
        ORDER BY course_code, atar_year
    """, (institution_id,)).fetchall()

    atar_trends_raw = {}
    for hr in hist_rows:
        cc = hr["course_code"]
        atar_num = _parse_atar(hr["atar_lowest"])
        if atar_num is None:
            continue
        if cc not in atar_trends_raw:
            atar_trends_raw[cc] = []
        atar_trends_raw[cc].append({
            "year": hr["atar_year"],
            "atar": atar_num,
        })

    # Merge ATAR trend data for campus variants under the primary code.
    # When multiple campus codes share trends, keep the one with the
    # most data points (usually they're identical anyway).
    atar_trends = {}
    for cc, points in atar_trends_raw.items():
        primary_cc = _course_code_to_primary.get(cc, cc)
        if primary_cc not in atar_trends or len(points) > len(atar_trends[primary_cc]):
            atar_trends[primary_cc] = points

    # Only keep courses that have 2+ data points
    atar_trends = {k: v for k, v in atar_trends.items() if len(v) >= 2}

    return {
        "institution": {
            "id": inst_row["id"],
            "name": inst_row["name"],
            "state": inst_row["state"] or "",
        },
        "uac_region_note": (
            "Course data covers NSW and ACT institutions only "
            "(sourced from UAC). Other states have separate admission "
            "centres which will be integrated in future updates."
        ),
        "courses": courses,
        "summary": summary,
        "field_comparison": field_comparison_out,
        "atar_trends": atar_trends,
    }


def compute_sector_admission_profile(conn):
    """
    Aggregate student admission profile data across all UAC institutions
    (NSW/ACT sector-wide).  Returns weighted averages of how students were
    admitted, plus total student count.
    """
    rows = conn.execute("""
        SELECT
            uc.student_profile_year,
            uc.total_students,
            uc.pct_atar_based,
            uc.pct_higher_ed,
            uc.pct_vet,
            uc.pct_work_life,
            uc.pct_international
        FROM uac_courses uc
        WHERE uc.course_status = 'C'
          AND uc.level = 'undergraduate'
          AND uc.total_students IS NOT NULL
          AND uc.pct_atar_based IS NOT NULL
    """).fetchall()

    if not rows:
        return None

    def _safe_float(val):
        if not val or str(val).strip().startswith("<"):
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    def _safe_int(val):
        if not val:
            return None
        try:
            return int(str(val).replace(",", ""))
        except (ValueError, TypeError):
            return None

    total_students = 0
    weighted = {
        "atar_based": 0.0,
        "higher_ed": 0.0,
        "vet": 0.0,
        "work_life": 0.0,
        "international": 0.0,
    }

    # UAC duplicates the same student profile across campus/variant
    # listings.  Deduplicate by the full profile signature so each
    # cohort is counted only once.
    seen_profiles = set()

    profile_year = None
    for r in rows:
        n = _safe_int(r["total_students"])
        if not n or n <= 0:
            continue

        pct_atar = _safe_float(r["pct_atar_based"])
        pct_he = _safe_float(r["pct_higher_ed"])
        pct_vet = _safe_float(r["pct_vet"])
        pct_wl = _safe_float(r["pct_work_life"])
        pct_int = _safe_float(r["pct_international"])

        if pct_atar is None:
            continue

        # Dedup key: identical total + identical % breakdown = same cohort
        key = (
            r["total_students"],
            r["pct_atar_based"],
            r["pct_higher_ed"],
            r["pct_vet"],
            r["pct_work_life"],
            r["pct_international"],
        )
        if key in seen_profiles:
            continue
        seen_profiles.add(key)

        total_students += n
        weighted["atar_based"] += (pct_atar or 0) * n
        weighted["higher_ed"] += (pct_he or 0) * n
        weighted["vet"] += (pct_vet or 0) * n
        weighted["work_life"] += (pct_wl or 0) * n
        weighted["international"] += (pct_int or 0) * n

        if not profile_year and r["student_profile_year"]:
            profile_year = r["student_profile_year"]

    if total_students == 0:
        return None

    return {
        "profile_year": profile_year,
        "total_students": total_students,
        "pct_atar_based": round(weighted["atar_based"] / total_students, 1),
        "pct_higher_ed": round(weighted["higher_ed"] / total_students, 1),
        "pct_vet": round(weighted["vet"] / total_students, 1),
        "pct_work_life": round(weighted["work_life"] / total_students, 1),
        "pct_international": round(weighted["international"] / total_students, 1),
    }
