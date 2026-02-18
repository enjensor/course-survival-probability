# Education.gov.au Higher Education Statistics Scraper

## Overview

This repository contains a structured web crawler and downloader
designed to systematically retrieve **Higher Education Statistics --
Student Data** files from the Australian Government Department of
Education website:

https://www.education.gov.au/higher-education-statistics/student-data

The scraper is designed to:

-   Traverse all year-based "Student Data" pages
-   Discover downloadable data assets (XLSX, CSV, ZIP, PDF)
-   Follow `/download/` endpoints used for direct file delivery
-   Generate a complete manifest of discovered resources
-   Download files with:
    -   Robust retry logic
    -   Rate limiting
    -   SHA256 deduplication
    -   Resume support for partial downloads
    -   Optional progress logging

The output provides a clean foundation for downstream ingestion into a
database for analytics and application development.

------------------------------------------------------------------------

# Files Included

## 1. `edu_he_stats_downloader.py`

Main crawler and downloader script.

Key capabilities:

-   Domain-scoped crawling (avoids mirroring the entire site)
-   Structure-agnostic (handles year-to-year structural variation)
-   Retry with exponential backoff
-   Configurable crawl depth
-   Verbose progress logging
-   Heartbeat reporting
-   File hash index for deduplication
-   Manifest creation (URL + referrer provenance)

------------------------------------------------------------------------

## 2. `run_download.sh`

Convenience shell script for executing the downloader with recommended
flags.

This ensures consistent runtime parameters across environments and
supports repeatable execution.

------------------------------------------------------------------------

# Installation

Requires Python 3.9+.

Install dependencies:

``` bash
pip install requests beautifulsoup4 urllib3
```

No additional framework dependencies are required.

------------------------------------------------------------------------

# Usage

## Basic Run (Manifest + Download)

``` bash
python edu_he_stats_downloader.py   --out ./downloads   --max-pages 3000   --delay 0.6   --heartbeat 25
```

## Verbose Crawl Logging

``` bash
python edu_he_stats_downloader.py   --out ./downloads   --verbose   --heartbeat 10
```

## Manifest Only (No Downloads)

``` bash
python edu_he_stats_downloader.py   --out ./downloads   --no-download
```

## Fetch Timing Diagnostics

Useful if the script appears stalled:

``` bash
python edu_he_stats_downloader.py   --out ./downloads   --verbose   --log-fetch
```

## Download Progress Logging

``` bash
python edu_he_stats_downloader.py   --out ./downloads   --log-download-progress
```

------------------------------------------------------------------------

# Output Structure

After execution:

    downloads/
    ├── manifest.tsv
    ├── hash_index.tsv
    └── files/
        ├── file1.xlsx
        ├── file2.csv
        ├── file3.zip
        └── ...

### manifest.tsv

Tab-separated file listing:

    url    referrer

Provides full provenance for every discovered downloadable asset.

### hash_index.tsv

Maps:

    sha256    local_path

Used to deduplicate identical files referenced multiple times.

------------------------------------------------------------------------

# Crawl Behaviour

The scraper is intentionally constrained to the following path prefixes:

-   `/higher-education-statistics/student-data`
-   `/higher-education-statistics/resources`
-   `/higher-education-statistics`
-   `/download/`

This ensures:

-   Comprehensive coverage of student data
-   Avoidance of unrelated education.gov.au sections
-   Controlled crawl scope

------------------------------------------------------------------------

# Networking and Reliability Features

The script includes:

-   Retry policy (429, 500, 502, 503, 504)
-   Respect for `Retry-After` headers
-   Configurable delay between requests
-   Connection pooling
-   Timeout separation (connect vs read)
-   Single re-queue for transient fetch failures

------------------------------------------------------------------------

# Performance Expectations

Typical run characteristics:

-   Crawl phase: 1--5 minutes depending on network
-   Download phase: dependent on file volume (can be substantial)
-   Total file count: varies by year availability and historical
    retention

If verbose logging is disabled, the script may appear quiet during the
crawl phase. Use `--heartbeat` or `--verbose` for visibility.

------------------------------------------------------------------------

# Known Constraints

-   Some files may be very small (e.g., redirect stubs or metadata
    artifacts)
-   Some historical pages may return intermittent timeouts
-   The site structure changes across years; the crawler handles this by
    link-following rather than fixed assumptions
-   This script does not currently parallelise downloads (intentionally
    conservative to avoid rate limits)

------------------------------------------------------------------------

# Recommended Workflow

1.  Run scraper (manifest + download)
2.  Inspect `manifest.tsv`
3.  Validate file inventory
4.  Proceed to structured ingestion into a database
5.  Implement schema normalization + versioning strategy

------------------------------------------------------------------------

# Legal and Ethical Considerations

-   The scraper operates within publicly accessible pages.
-   It respects HTTP status codes and retry headers.
-   It includes configurable delays to avoid excessive load.

Users are responsible for ensuring compliance with: - Website terms of
use - Applicable data usage policies - Government data licensing
conditions

------------------------------------------------------------------------

# Next Phase (Planned)

The natural next step is:

-   Normalizing files into structured directories by year and category
-   Building a metadata catalog table
-   Creating an ingestion pipeline into DuckDB or PostgreSQL
-   Creating a reproducible ETL framework
-   Versioning datasets by download timestamp

------------------------------------------------------------------------

# Project Context

This scraper supports the development of a longitudinal higher education
analytics platform designed to transform Australian Higher Education
Statistics into structured, decision-grade intelligence suitable for
application development and advanced analysis.
