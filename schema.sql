-- ============================================================
-- Higher Education Statistics — Course Survival Probability DB
-- ============================================================

-- Reference: higher education institutions
CREATE TABLE IF NOT EXISTS institutions (
    id          INTEGER PRIMARY KEY,
    code        TEXT UNIQUE,                -- e.g. '3040' from 'The University of Sydney (3040)'
    name        TEXT NOT NULL,              -- canonical name
    state       TEXT,                       -- e.g. 'New South Wales'
    provider_type TEXT                      -- 'Table A', 'Table B', 'NUHEI'
);

-- Alias lookup so variant historical names resolve to one institution
CREATE TABLE IF NOT EXISTS institution_aliases (
    alias       TEXT PRIMARY KEY,           -- normalised variant name
    institution_id INTEGER NOT NULL REFERENCES institutions(id)
);

-- Reference: broad fields of education (ASCED classification)
CREATE TABLE IF NOT EXISTS fields_of_education (
    id          INTEGER PRIMARY KEY,
    broad_field TEXT NOT NULL UNIQUE        -- e.g. 'Information Technology'
);

-- Core 1: attrition, retention, success rates (Section 15)
CREATE TABLE IF NOT EXISTS attrition_retention (
    id              INTEGER PRIMARY KEY,
    institution_id  INTEGER NOT NULL REFERENCES institutions(id),
    year            INTEGER NOT NULL,       -- commencing cohort year
    student_type    TEXT NOT NULL,           -- 'domestic','overseas','all'
    measure         TEXT NOT NULL,           -- 'attrition','retention','success'
    rate            REAL,                    -- percentage 0-100
    source_file     TEXT,
    UNIQUE(institution_id, year, student_type, measure)
);

-- Core 2: completion-rate cohort outcomes (Section 17 + Cohort Analysis)
CREATE TABLE IF NOT EXISTS completion_rates (
    id              INTEGER PRIMARY KEY,
    institution_id  INTEGER NOT NULL REFERENCES institutions(id),
    cohort_start    INTEGER NOT NULL,
    cohort_end      INTEGER NOT NULL,
    duration_years  INTEGER NOT NULL,       -- 4, 6, or 9
    completed_pct       REAL,
    still_enrolled_pct  REAL,
    dropped_out_pct     REAL,
    never_returned_pct  REAL,
    source_file     TEXT,
    UNIQUE(institution_id, cohort_start, duration_years)
);

-- Core 3: enrolment headcounts (Section 1, 2, pivot tables)
CREATE TABLE IF NOT EXISTS enrolments (
    id              INTEGER PRIMARY KEY,
    institution_id  INTEGER NOT NULL REFERENCES institutions(id),
    year            INTEGER NOT NULL,
    field_id        INTEGER REFERENCES fields_of_education(id),
    course_level    TEXT,                   -- 'Bachelor','Postgraduate by Coursework', etc.
    student_type    TEXT,                   -- 'domestic','overseas','all'
    commencing      INTEGER,               -- 1=commencing only, 0=all students
    headcount       INTEGER,
    eftsl           REAL,
    source_file     TEXT
);

-- Core 4: award-course completion headcounts (Section 14, pivot tables)
CREATE TABLE IF NOT EXISTS completions (
    id              INTEGER PRIMARY KEY,
    institution_id  INTEGER NOT NULL REFERENCES institutions(id),
    year            INTEGER NOT NULL,
    field_id        INTEGER REFERENCES fields_of_education(id),
    course_level    TEXT,
    headcount       INTEGER,
    source_file     TEXT
);

-- Metadata: ingestion tracking
CREATE TABLE IF NOT EXISTS ingested_files (
    id          INTEGER PRIMARY KEY,
    filename    TEXT UNIQUE NOT NULL,
    file_path   TEXT,
    ingested_at TEXT DEFAULT (datetime('now')),
    row_count   INTEGER,
    section     TEXT,
    data_year   TEXT
);

-- Indexes for the probability engine queries
CREATE INDEX IF NOT EXISTS idx_ar_inst_year
    ON attrition_retention(institution_id, year);
CREATE INDEX IF NOT EXISTS idx_cr_inst_start
    ON completion_rates(institution_id, cohort_start);
CREATE INDEX IF NOT EXISTS idx_enr_inst_year_field
    ON enrolments(institution_id, year, field_id);
CREATE INDEX IF NOT EXISTS idx_comp_inst_year_field
    ON completions(institution_id, year, field_id);
CREATE INDEX IF NOT EXISTS idx_alias_lookup
    ON institution_aliases(alias);

-- Core 5: course-level enrolment/completion mix (Sections 2 & 14)
CREATE TABLE IF NOT EXISTS course_level_mix (
    id              INTEGER PRIMARY KEY,
    institution_id  INTEGER NOT NULL REFERENCES institutions(id),
    year            INTEGER NOT NULL,
    measure         TEXT NOT NULL,           -- 'enrolment' or 'completion'
    postgrad_research   INTEGER,
    postgrad_coursework INTEGER,
    bachelor            INTEGER,
    sub_bachelor        INTEGER,
    total               INTEGER,
    source_file     TEXT,
    UNIQUE(institution_id, year, measure)
);
