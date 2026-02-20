#!/usr/bin/env python3
"""
UAC Course Data Fetcher & Ingester
===================================
Fetches course data from the UAC CourseHub API and ingests it into he_stats.db.

Data source: https://coursehub.uac.edu.au/backend/course-search/api/
Covers NSW and ACT institutions (UAC region).

Tables created:
  - uac_providers        : UAC provider/institution mapping
  - uac_campuses         : Campus locations
  - uac_courses          : Course listings with ATAR profiles
  - uac_course_details   : Extended course information (about, admission, careers)
"""

import json
import math
import os
import sqlite3
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("Installing requests...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "https://coursehub.uac.edu.au/backend/course-search/api"
PROVIDER_WEBSITES_URL = "https://www.uac.edu.au/course-search/search/providerWebsites.json"
DB_PATH = Path(__file__).resolve().parent.parent / "he_stats.db"

LEVELS = ["undergraduate", "postgraduate", "international"]
PAGE_SIZE = 500  # max tested working size

# Rate limiting: be respectful
REQUEST_DELAY = 0.3  # seconds between requests
DETAIL_DELAY = 0.15  # seconds between detail fetches

# Cache directory for raw JSON responses
CACHE_DIR = Path(__file__).resolve().parent.parent / "_uac_cache"

# ---------------------------------------------------------------------------
# UAC provider code -> he_stats.db institution name mapping
# ---------------------------------------------------------------------------

UAC_TO_INSTITUTION = {
    "ACU": "Australian Catholic University",
    "ACAP": "Australian College of Applied Psychology",
    "ACPE": "The Australian College of Physical Education",
    "AIE": "Academy of Information Technology",
    "ACHW_AD": "Australasian College of Health and Wellness",
    "AIM": "Australian Institute of Music",
    "AIT": "Academy of Information Technology",
    "AIEAD_AD": "Academy of Information Technology",
    "AMPA_AD": "Australian Academy of Music and Performing Arts",
    "ANU": "The Australian National University",
    "AVON": "Avondale University",
    "CAM": "Campion College",
    "CDU": "Charles Darwin University",
    "CQU": "CQUniversity",
    "CSU": "Charles Sturt University",
    "CUR": "Curtin University",
    "DEA": "Deakin University",
    "ECU": "Edith Cowan University",
    "CIHE_AD": "Crown Institute of Higher Education",
    "EXC": "Excelsia College",
    "EXLSI": "Excelsia College",
    "FED": "Federation University Australia",
    "FLI": "Flinders University",
    "GU": "Griffith University",
    "ICMS": "International College of Management, Sydney",
    "JCU": "James Cook University",
    "JMC": "JMC Academy",
    "KBS": "Kaplan Business School",
    "LTU": "La Trobe University",
    "MAC": "Macleay College",
    "MON": "Monash University",
    "MIT": "Melbourne Institute of Technology",
    "MQ": "Macquarie University",
    "MUR": "Murdoch University",
    "NAS": "National Art School",
    "NIDA": "The National Institute of Dramatic Art",
    "NU": "The University of Newcastle",
    "UON": "The University of Newcastle",
    "QUT": "Queensland University of Technology",
    "RMIT": "RMIT University",
    "SAE": "SAE Creative Media Institute",
    "SCU": "Southern Cross University",
    "SPJ": "S P Jain School of Global Management",
    "SPJGM": "S P Jain School of Global Management",
    "SWI": "Swinburne University of Technology",
    "TAFENSW": "TAFE NSW",
    "TOR": "Torrens University Australia",
    "TUA": "Torrens University Australia",
    "UAD": "The University of Adelaide",
    "UC": "University of Canberra",
    "UND": "The University of Notre Dame Australia",
    "UNDA": "The University of Notre Dame Australia",
    "UNE": "The University of New England",
    "UNSW": "University of New South Wales",
    "UNSWC": "University of New South Wales",
    "UOW": "University of Wollongong",
    "UQ": "The University of Queensland",
    "USQ": "University of Southern Queensland",
    "USYD": "The University of Sydney",
    "UTAS": "University of Tasmania",
    "UTS": "University of Technology Sydney",
    "VU": "Victoria University",
    "WS": "Western Sydney University",
    "WSU": "Western Sydney University",
    "WSUONL": "Western Sydney University",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fetch_json(url, params=None, retries=3):
    """Fetch JSON from URL with retries."""
    for attempt in range(retries):
        try:
            resp = requests.get(url, params=params, timeout=30,
                                headers={"User-Agent": "CourseAnalytics/1.0 (research)"})
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, json.JSONDecodeError) as e:
            if attempt < retries - 1:
                wait = 2 ** attempt
                print(f"  Retry {attempt+1}/{retries} after error: {e} (waiting {wait}s)")
                time.sleep(wait)
            else:
                print(f"  FAILED after {retries} attempts: {e}")
                return None


def strip_html(html_str):
    """Crude HTML tag removal for plain text storage."""
    if not html_str:
        return None
    import re
    text = re.sub(r'<[^>]+>', ' ', html_str)
    text = re.sub(r'\s+', ' ', text).strip()
    return text if text else None


def parse_duration(dur_list):
    """Parse UAC duration list like ['3_y_f'] into (value, unit, mode) string."""
    if not dur_list:
        return None
    parts = []
    for d in dur_list:
        segs = d.split("_")
        if len(segs) >= 3:
            val, unit, mode = segs[0], segs[1], segs[2]
            unit_str = {"y": "years", "m": "months", "w": "weeks", "s": "semesters"}.get(unit, unit)
            mode_str = {"f": "full-time", "p": "part-time", "eqp": "equiv part-time"}.get(mode, mode)
            parts.append(f"{val} {unit_str} {mode_str}")
        else:
            parts.append(d)
    return "; ".join(parts)


# ---------------------------------------------------------------------------
# Schema creation
# ---------------------------------------------------------------------------

def create_tables(conn):
    """Create UAC-specific tables."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS uac_providers (
            provider_id     TEXT PRIMARY KEY,
            provider_name   TEXT NOT NULL,
            website         TEXT,
            institution_id  INTEGER REFERENCES institutions(id)
        );

        CREATE TABLE IF NOT EXISTS uac_campuses (
            campus_location_code TEXT PRIMARY KEY,
            provider_id     TEXT NOT NULL,
            campus_code     TEXT,
            name_short      TEXT,
            name_long       TEXT
        );

        CREATE TABLE IF NOT EXISTS uac_courses (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            course_code     TEXT NOT NULL,
            level           TEXT NOT NULL,           -- undergraduate/postgraduate/international
            title           TEXT NOT NULL,
            provider_id     TEXT NOT NULL,
            campus_code     TEXT,
            campus_location TEXT,
            course_level    TEXT,                     -- TBP, TBH, etc.
            course_status   TEXT,                     -- C=current, W=withdrawn
            fee_type        TEXT,                     -- CSP, DFEE, INT, etc.
            field_of_study  TEXT,
            duration        TEXT,                     -- parsed human-readable
            duration_total  INTEGER,                  -- raw numeric
            mode_of_attendance TEXT,                  -- comma-separated
            start_months    TEXT,                     -- comma-separated
            cricos_course_code TEXT,
            -- ATAR profile (most recent year)
            atar_year       INTEGER,
            atar_lowest     TEXT,
            atar_median     TEXT,
            atar_highest    TEXT,
            selection_rank_lowest  TEXT,              -- LSR
            selection_rank_median  TEXT,              -- MSR
            selection_rank_highest TEXT,              -- HSR
            atar_profile_code TEXT,
            -- PLSR
            plsr            TEXT,
            -- Student profile
            student_profile_year    INTEGER,
            total_students          TEXT,
            pct_atar_based          TEXT,
            pct_atar_plus           TEXT,
            pct_recent_secondary_other TEXT,
            pct_higher_ed           TEXT,
            pct_vet                 TEXT,
            pct_work_life           TEXT,
            pct_international       TEXT,
            -- Offerings
            next_start_date TEXT,
            final_closing   TEXT,
            -- Linkage
            institution_id  INTEGER REFERENCES institutions(id),
            -- Metadata
            channel_id      TEXT,
            admission_year  TEXT,
            fetched_at      TEXT DEFAULT (datetime('now')),
            UNIQUE(course_code, level, campus_code, channel_id)
        );

        CREATE TABLE IF NOT EXISTS uac_course_details (
            course_code     TEXT NOT NULL,
            level           TEXT NOT NULL,
            title           TEXT,
            provider_id     TEXT,
            -- Content
            about           TEXT,
            areas_of_study  TEXT,
            career_opportunities TEXT,
            practical_experience TEXT,
            professional_recognition TEXT,
            honours         TEXT,
            admission_criteria TEXT,
            assumed_knowledge TEXT,
            all_applicants  TEXT,
            other_applicants TEXT,
            secondary_admission TEXT,
            fees_and_charges TEXT,
            further_info_url TEXT,
            -- Provider IDs
            cricos_provider_id TEXT,
            teqsa_id        TEXT,
            -- Metadata
            views_30_days   INTEGER,
            fetched_at      TEXT DEFAULT (datetime('now')),
            PRIMARY KEY(course_code, level)
        );

        CREATE INDEX IF NOT EXISTS idx_uac_courses_provider
            ON uac_courses(provider_id);
        CREATE INDEX IF NOT EXISTS idx_uac_courses_inst
            ON uac_courses(institution_id);
        CREATE INDEX IF NOT EXISTS idx_uac_courses_level
            ON uac_courses(level);
        CREATE INDEX IF NOT EXISTS idx_uac_courses_code
            ON uac_courses(course_code);
    """)
    conn.commit()
    print("Schema created/verified.")


# ---------------------------------------------------------------------------
# Step 1: Fetch campus data
# ---------------------------------------------------------------------------

def fetch_campuses():
    """Fetch all campus locations."""
    print("\n--- Fetching campuses ---")
    cache_file = CACHE_DIR / "campuses.json"
    if cache_file.exists():
        print(f"  Using cached: {cache_file}")
        return json.loads(cache_file.read_text())

    data = fetch_json(f"{BASE_URL}/campus")
    if data:
        cache_file.write_text(json.dumps(data, indent=2))
        print(f"  Fetched {len(data)} campuses")
    return data


# ---------------------------------------------------------------------------
# Step 2: Fetch provider websites
# ---------------------------------------------------------------------------

def fetch_provider_websites():
    """Fetch provider website mapping."""
    print("\n--- Fetching provider websites ---")
    cache_file = CACHE_DIR / "provider_websites.json"
    if cache_file.exists():
        print(f"  Using cached: {cache_file}")
        return json.loads(cache_file.read_text())

    data = fetch_json(PROVIDER_WEBSITES_URL)
    if data:
        cache_file.write_text(json.dumps(data, indent=2))
        print(f"  Fetched {len(data)} providers")
    return data


# ---------------------------------------------------------------------------
# Step 3: Fetch filters (to get provider list with names)
# ---------------------------------------------------------------------------

def fetch_filters():
    """Fetch filter data for all levels to build complete provider list."""
    print("\n--- Fetching filters ---")
    all_providers = {}
    for level in LEVELS:
        cache_file = CACHE_DIR / f"filters_{level}.json"
        if cache_file.exists():
            data = json.loads(cache_file.read_text())
        else:
            data = fetch_json(f"{BASE_URL}/filters", params={"level": level})
            if data:
                cache_file.write_text(json.dumps(data, indent=2))
            time.sleep(REQUEST_DELAY)

        if data and "providers" in data:
            for p in data["providers"]:
                all_providers[p["key"]] = p.get("name", p["key"])

    print(f"  Found {len(all_providers)} unique providers across all levels")
    return all_providers


# ---------------------------------------------------------------------------
# Step 4: Fetch all courses via search endpoint
# ---------------------------------------------------------------------------

def fetch_all_courses():
    """Fetch all courses across all levels."""
    print("\n--- Fetching all courses ---")
    all_courses = {}

    for level in LEVELS:
        cache_file = CACHE_DIR / f"courses_{level}.json"
        if cache_file.exists():
            courses = json.loads(cache_file.read_text())
            print(f"  {level}: Using cached ({len(courses)} courses)")
            all_courses[level] = courses
            continue

        courses = []
        page = 1
        total = None

        while True:
            params = {"page": page, "size": PAGE_SIZE, "sort": "alphabetical-az"}
            data = fetch_json(f"{BASE_URL}/search/{level}", params=params)

            if not data or "results" not in data:
                print(f"  {level}: Failed on page {page}")
                break

            results = data["results"]
            stats = data.get("stats", {})
            total = stats.get("total", 0)
            courses.extend(results)

            print(f"  {level}: page {page}, got {len(results)} (total: {total})")

            if len(courses) >= total:
                break
            page += 1
            time.sleep(REQUEST_DELAY)

        cache_file.write_text(json.dumps(courses, indent=2))
        print(f"  {level}: {len(courses)} courses fetched")
        all_courses[level] = courses

    return all_courses


# ---------------------------------------------------------------------------
# Step 5: Fetch course details
# ---------------------------------------------------------------------------

def fetch_course_details(all_courses):
    """Fetch detailed info for each unique course."""
    print("\n--- Fetching course details ---")
    details_dir = CACHE_DIR / "details"
    details_dir.mkdir(exist_ok=True)

    # Build unique (level, courseUrl) pairs
    to_fetch = set()
    for level, courses in all_courses.items():
        for c in courses:
            course_url = c.get("courseUrl", c.get("courseCode"))
            to_fetch.add((level, course_url))

    print(f"  {len(to_fetch)} unique course detail pages to fetch")

    fetched = 0
    skipped = 0
    failed = 0

    for level, code in sorted(to_fetch):
        cache_file = details_dir / f"{level}_{code}.json"
        if cache_file.exists():
            skipped += 1
            continue

        data = fetch_json(f"{BASE_URL}/details/{level}/course/{code}")
        if data:
            cache_file.write_text(json.dumps(data, indent=2))
            fetched += 1
        else:
            failed += 1

        if (fetched + failed) % 50 == 0:
            print(f"  Progress: {fetched} fetched, {skipped} cached, {failed} failed")
        time.sleep(DETAIL_DELAY)

    print(f"  Done: {fetched} fetched, {skipped} cached, {failed} failed")
    return details_dir


# ---------------------------------------------------------------------------
# Step 6: Resolve institution IDs
# ---------------------------------------------------------------------------

def build_institution_lookup(conn):
    """Build a lookup from institution name -> id using existing DB data."""
    lookup = {}
    rows = conn.execute("SELECT id, name FROM institutions WHERE id >= 1138 ORDER BY id").fetchall()
    for row in rows:
        inst_id, name = row
        # Skip noise entries (State Total, categories, etc.)
        if any(skip in name for skip in [
            "State Total", "TOTAL", "Course Level", "Mode of",
            "Type of", "Gender", "Age", "Basis for", "Indigenous",
            "Non-English", "Socio-Economic", "Regional", "Liability",
            "Broad Field", "Study Areas", "Table A", "Comparison",
            "Metro", "First Nations", "Disability", "< ", "np",
            "Commonwealth", "Non-"
        ]):
            continue
        # Normalise name for matching (strip footnote markers)
        import re
        clean = re.sub(r'\([a-h]\)$', '', name).strip()
        clean = re.sub(r'€$', '', clean).strip()
        lookup[clean.lower()] = inst_id
        lookup[name.lower()] = inst_id

    return lookup


def resolve_institution_id(provider_id, inst_lookup):
    """Map a UAC provider code to a he_stats institution id."""
    mapped_name = UAC_TO_INSTITUTION.get(provider_id)
    if mapped_name:
        key = mapped_name.lower()
        if key in inst_lookup:
            return inst_lookup[key]
    return None


# ---------------------------------------------------------------------------
# Step 7: Ingest into database
# ---------------------------------------------------------------------------

def ingest_providers(conn, provider_names, websites, inst_lookup):
    """Ingest UAC providers."""
    print("\n--- Ingesting providers ---")
    count = 0
    for pid, name in provider_names.items():
        website = websites.get(pid)
        inst_id = resolve_institution_id(pid, inst_lookup)
        conn.execute("""
            INSERT OR REPLACE INTO uac_providers
            (provider_id, provider_name, website, institution_id)
            VALUES (?, ?, ?, ?)
        """, (pid, name, website, inst_id))
        count += 1
        if inst_id:
            pass  # linked
        else:
            pass  # unlinked (minor providers)

    conn.commit()
    linked = conn.execute("SELECT COUNT(*) FROM uac_providers WHERE institution_id IS NOT NULL").fetchone()[0]
    print(f"  Ingested {count} providers ({linked} linked to institutions)")


def ingest_campuses(conn, campuses):
    """Ingest campus data."""
    print("\n--- Ingesting campuses ---")
    for c in campuses:
        conn.execute("""
            INSERT OR REPLACE INTO uac_campuses
            (campus_location_code, provider_id, campus_code, name_short, name_long)
            VALUES (?, ?, ?, ?, ?)
        """, (
            c["campusLocationCode"],
            c["providerId"],
            c["campusCode"],
            c.get("nameShort"),
            c.get("nameLong"),
        ))
    conn.commit()
    print(f"  Ingested {len(campuses)} campuses")


def ingest_courses(conn, all_courses, inst_lookup):
    """Ingest course listing data."""
    print("\n--- Ingesting courses ---")
    total = 0
    for level, courses in all_courses.items():
        count = 0
        for c in courses:
            provider_id = c.get("providerId", "")
            inst_id = resolve_institution_id(provider_id, inst_lookup)

            # ATAR profile
            atar = c.get("atarProfile")
            atar_year = atar_lowest = atar_median = atar_highest = None
            lsr = msr = hsr = atar_code = None
            if atar and atar.get("AtarProfiles"):
                ap = atar["AtarProfiles"][0]
                atar_year = int(ap.get("year", 0)) if ap.get("year") else None
                atar_lowest = ap.get("lowestAtar")
                atar_median = ap.get("medianAtar")
                atar_highest = ap.get("highestAtar")
                lsr = ap.get("lsr")
                msr = ap.get("msr")
                hsr = ap.get("hsr")
                atar_code = ap.get("atarProfileCode")

            # Offerings
            offerings = c.get("offerings") or []
            next_start = offerings[0].get("startDate") if offerings else None
            final_close = offerings[0].get("finalClosing") if offerings else None

            # Channel
            channel = c.get("channel", {})
            channel_id = channel.get("id", "")
            admission_year = channel.get("subtype", "")

            # Mode of attendance
            moa = c.get("modeOfAttendance") or []
            moa_str = ", ".join(moa) if moa else None

            # Start months
            sm = c.get("startMonths") or []
            sm_str = ", ".join(sm) if sm else None

            conn.execute("""
                INSERT OR REPLACE INTO uac_courses (
                    course_code, level, title, provider_id,
                    campus_code, campus_location, course_level, course_status,
                    fee_type, field_of_study, duration, duration_total,
                    mode_of_attendance, start_months, cricos_course_code,
                    atar_year, atar_lowest, atar_median, atar_highest,
                    selection_rank_lowest, selection_rank_median, selection_rank_highest,
                    atar_profile_code, plsr,
                    student_profile_year, total_students,
                    pct_atar_based, pct_atar_plus, pct_recent_secondary_other,
                    pct_higher_ed, pct_vet, pct_work_life, pct_international,
                    next_start_date, final_closing,
                    institution_id, channel_id, admission_year
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?
                )
            """, (
                c.get("courseCode", ""),
                level,
                c.get("title", ""),
                provider_id,
                c.get("campusCode"),
                c.get("campusLocation"),
                c.get("courseLevel"),
                c.get("courseStatus", c.get("status")),
                None,  # fee_type comes from details
                None,  # field_of_study comes from filters
                parse_duration(c.get("duration")),
                c.get("durationTotal"),
                moa_str,
                sm_str,
                None,  # cricos from details
                atar_year, atar_lowest, atar_median, atar_highest,
                lsr, msr, hsr,
                atar_code,
                None,  # plsr from details
                None, None,  # student profile from details
                None, None, None,
                None, None, None, None,
                next_start,
                final_close,
                inst_id,
                channel_id,
                admission_year,
            ))
            count += 1

        total += count
        print(f"  {level}: {count} courses ingested")

    conn.commit()
    print(f"  Total: {total} courses")


def ingest_course_details(conn, details_dir):
    """Ingest course detail data and update courses with additional fields."""
    print("\n--- Ingesting course details ---")
    detail_files = sorted(details_dir.glob("*.json"))
    count = 0
    updated = 0

    for f in detail_files:
        try:
            data = json.loads(f.read_text())
        except json.JSONDecodeError:
            continue

        parts = f.stem.split("_", 1)
        if len(parts) != 2:
            continue
        level, code = parts

        course_info = data.get("course", {})
        course_doc = data.get("courseDoc", {})
        content = data.get("contentJson") or course_doc.get("marketingContent", {}) or {}
        course_list = data.get("courseList", [])

        # Extract marketing content
        about_details = content.get("aboutDetails", {})
        secondary = content.get("secondaryAdmission", {})

        conn.execute("""
            INSERT OR REPLACE INTO uac_course_details (
                course_code, level, title, provider_id,
                about, areas_of_study, career_opportunities,
                practical_experience, professional_recognition, honours,
                admission_criteria, assumed_knowledge,
                all_applicants, other_applicants, secondary_admission,
                fees_and_charges, further_info_url,
                cricos_provider_id, teqsa_id, views_30_days
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            code,
            level,
            course_doc.get("title") or course_info.get("title"),
            course_doc.get("providerId") or course_info.get("providerId"),
            strip_html(content.get("aboutIntro")),
            strip_html(about_details.get("areasOfStudy")),
            strip_html(about_details.get("careerOpportunities")),
            strip_html(about_details.get("practicalExperience")),
            strip_html(about_details.get("professionalRecognition")),
            strip_html(about_details.get("honours")),
            strip_html(content.get("admissionCriteria")),
            strip_html(secondary.get("assumedKnowledge")) if secondary else None,
            strip_html(content.get("allApplicants")),
            strip_html(content.get("otherApplicants")),
            strip_html(secondary.get("rankInfoHeading")) if secondary else None,
            strip_html(course_info.get("feesAndCharges")),
            content.get("furtherInfo", {}).get("url") if content.get("furtherInfo") else None,
            course_info.get("providerCriscosId"),
            course_info.get("providerTeqsaId"),
            data.get("viewsLast30Days"),
        ))
        count += 1

        # Update courses with data from courseList variants
        for variant in course_list:
            v_code = variant.get("courseCode", code)
            v_campus = variant.get("campusCode")
            fee_type = variant.get("feeType")
            cricos = variant.get("cricosCourseCode")
            plsr = variant.get("plsr")

            # Student profile
            sp = variant.get("studentProfile")
            sp_year = sp_total = None
            sp_atar = sp_atar_plus = sp_other = None
            sp_he = sp_vet = sp_wl = sp_intl = None
            if sp and sp.get("StudentProfiles"):
                spp = sp["StudentProfiles"][0]
                sp_year = int(spp.get("year", 0)) if spp.get("year") else None
                sp_total = spp.get("totalStudents")
                sp_atar = spp.get("percentRecentSecondaryAtar")
                sp_atar_plus = spp.get("percentRecentSecondaryAtarPlus")
                sp_other = spp.get("percentRecentSecondaryOther")
                sp_he = spp.get("percentHigherEducationStudy")
                sp_vet = spp.get("percentVetStudy")
                sp_wl = spp.get("percentWorkAndLifeExperience")
                sp_intl = spp.get("percentInternationalStudents")

            # ATAR from variant (may differ from search result)
            v_atar = variant.get("atarProfile")
            if v_atar and v_atar.get("AtarProfiles"):
                vap = v_atar["AtarProfiles"][0]
                v_atar_year = int(vap.get("year", 0)) if vap.get("year") else None
                v_atar_lowest = vap.get("lowestAtar")
                v_atar_median = vap.get("medianAtar")
                v_atar_highest = vap.get("highestAtar")
                v_lsr = vap.get("lsr")
                v_msr = vap.get("msr")
                v_hsr = vap.get("hsr")
            else:
                v_atar_year = v_atar_lowest = v_atar_median = v_atar_highest = None
                v_lsr = v_msr = v_hsr = None

            # Update matching course rows with additional detail data
            result = conn.execute("""
                UPDATE uac_courses SET
                    fee_type = COALESCE(?, fee_type),
                    cricos_course_code = COALESCE(?, cricos_course_code),
                    plsr = COALESCE(?, plsr),
                    student_profile_year = COALESCE(?, student_profile_year),
                    total_students = COALESCE(?, total_students),
                    pct_atar_based = COALESCE(?, pct_atar_based),
                    pct_atar_plus = COALESCE(?, pct_atar_plus),
                    pct_recent_secondary_other = COALESCE(?, pct_recent_secondary_other),
                    pct_higher_ed = COALESCE(?, pct_higher_ed),
                    pct_vet = COALESCE(?, pct_vet),
                    pct_work_life = COALESCE(?, pct_work_life),
                    pct_international = COALESCE(?, pct_international),
                    atar_year = COALESCE(?, atar_year),
                    atar_lowest = COALESCE(?, atar_lowest),
                    atar_median = COALESCE(?, atar_median),
                    atar_highest = COALESCE(?, atar_highest),
                    selection_rank_lowest = COALESCE(?, selection_rank_lowest),
                    selection_rank_median = COALESCE(?, selection_rank_median),
                    selection_rank_highest = COALESCE(?, selection_rank_highest)
                WHERE course_code = ? AND level = ? AND campus_code = ?
            """, (
                fee_type, cricos, plsr,
                sp_year, sp_total,
                sp_atar, sp_atar_plus, sp_other,
                sp_he, sp_vet, sp_wl, sp_intl,
                v_atar_year, v_atar_lowest, v_atar_median, v_atar_highest,
                v_lsr, v_msr, v_hsr,
                v_code, level, v_campus,
            ))
            if result.rowcount > 0:
                updated += 1

    conn.commit()
    print(f"  Ingested {count} detail pages, updated {updated} course rows")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("UAC Course Data Fetcher & Ingester")
    print("=" * 60)

    # Ensure cache directory exists
    CACHE_DIR.mkdir(exist_ok=True)

    # Phase 1: Fetch all data from API
    campuses = fetch_campuses()
    websites = fetch_provider_websites()
    provider_names = fetch_filters()
    all_courses = fetch_all_courses()
    details_dir = fetch_course_details(all_courses)

    # Phase 2: Ingest into database
    print("\n" + "=" * 60)
    print("Ingesting into database...")
    print("=" * 60)

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    create_tables(conn)
    inst_lookup = build_institution_lookup(conn)
    print(f"  Institution lookup: {len(inst_lookup)} entries")

    ingest_providers(conn, provider_names, websites or {}, inst_lookup)
    ingest_campuses(conn, campuses or [])
    ingest_courses(conn, all_courses, inst_lookup)
    ingest_course_details(conn, details_dir)

    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)

    for table in ["uac_providers", "uac_campuses", "uac_courses", "uac_course_details"]:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count} rows")

    # ATAR coverage
    atar_count = conn.execute(
        "SELECT COUNT(*) FROM uac_courses WHERE atar_lowest IS NOT NULL"
    ).fetchone()[0]
    total_courses = conn.execute("SELECT COUNT(*) FROM uac_courses").fetchone()[0]
    print(f"\n  ATAR data: {atar_count}/{total_courses} courses ({100*atar_count/max(total_courses,1):.1f}%)")

    # Institution linkage
    linked = conn.execute(
        "SELECT COUNT(DISTINCT provider_id) FROM uac_courses WHERE institution_id IS NOT NULL"
    ).fetchone()[0]
    total_providers = conn.execute(
        "SELECT COUNT(DISTINCT provider_id) FROM uac_courses"
    ).fetchone()[0]
    print(f"  Provider linkage: {linked}/{total_providers} providers linked to institutions")

    # Level breakdown
    for level in LEVELS:
        count = conn.execute(
            "SELECT COUNT(*) FROM uac_courses WHERE level = ?", (level,)
        ).fetchone()[0]
        atar = conn.execute(
            "SELECT COUNT(*) FROM uac_courses WHERE level = ? AND atar_lowest IS NOT NULL", (level,)
        ).fetchone()[0]
        print(f"  {level}: {count} courses ({atar} with ATAR)")

    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
