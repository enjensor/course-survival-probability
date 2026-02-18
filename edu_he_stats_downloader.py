#!/usr/bin/env python3
"""
education.gov.au Higher Education Statistics (Student Data) downloader — v2

Purpose
-------
Crawls the Higher Education Statistics "student data" area on education.gov.au, discovers
downloadable data files (XLSX/XLS/CSV/ZIP/PDF via /download/* endpoints), writes a
structured manifest with year/section/category metadata, and optionally downloads them
with content-hash deduplication.

The site uses a three-level hierarchy:
  1. Landing page -> year pages (2004-2024)
  2. Year pages -> resource sub-pages (/higher-education-statistics/resources/{slug})
  3. Resource pages -> download links (/download/{rid}/{slug}/{did}/document/{fmt})

Filenames are resolved from the server's Content-Disposition header, with a fallback
to the resource slug embedded in the download URL path.

Install
-------
pip install requests beautifulsoup4 urllib3

Usage
-----
# Manifest + download, with progress every 10 pages and verbose crawl logging
python edu_he_stats_downloader.py --out ./downloads --max-pages 3000 --delay 0.6 --heartbeat 10 --verbose

# Manifest only (no downloads)
python edu_he_stats_downloader.py --out ./downloads --no-download --heartbeat 10 --verbose

# Add fetch timing logs
python edu_he_stats_downloader.py --out ./downloads --verbose --heartbeat 10 --log-fetch

# Add download chunk progress logs
python edu_he_stats_downloader.py --out ./downloads --heartbeat 10 --log-download-progress

Notes
-----
- This script intentionally limits scope to avoid mirroring the full education.gov.au site.
- It will re-queue a failed HTML fetch once (transient network hiccups are common).
- The manifest includes year, section, category, format, and filename columns for
  downstream database ingestion.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import sys
import time
from collections import deque
from dataclasses import dataclass
from email.message import Message
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ----------------------------
# Configuration
# ----------------------------

BASE = "https://www.education.gov.au"

START_URLS = [
    "https://www.education.gov.au/higher-education-statistics/student-data",
    "https://www.education.gov.au/higher-education-statistics",
]

# Keep crawler constrained and relevant (avoid mirroring whole education.gov.au)
ALLOWED_PATH_PREFIXES = (
    "/higher-education-statistics/student-data",
    "/higher-education-statistics/resources",
    "/higher-education-statistics",  # includes navigation lists to year pages
    "/download/",                    # direct file links are commonly here
)

FILE_EXTENSIONS = ("xlsx", "xls", "csv", "zip", "pdf")
FILE_EXT_RE = re.compile(rf"\.({'|'.join(FILE_EXTENSIONS)})(\?|$)", re.IGNORECASE)

# Pattern for Drupal download URLs:
# /download/{resource_id}/{resource_slug}/{document_id}/document/{format}
DOWNLOAD_URL_RE = re.compile(
    r"/download/(\d+)/([^/]+)/(\d+)/document/(\w+)"
)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"


# ----------------------------
# Data structures
# ----------------------------

@dataclass(frozen=True)
class FoundLink:
    url: str
    referrer: str
    year: str = ""
    section: str = ""
    category: str = ""
    format: str = ""
    filename: str = ""


# ----------------------------
# URL helpers
# ----------------------------

def normalise_url(url: str) -> str:
    """Strip fragments; keep querystring (some /download endpoints may use it)."""
    url, _frag = urldefrag(url)
    return url


def same_domain(url: str) -> bool:
    p = urlparse(url)
    return (p.netloc or urlparse(BASE).netloc) == urlparse(BASE).netloc


def in_scope(url: str) -> bool:
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        return False
    if p.netloc and not same_domain(url):
        return False
    return p.path.startswith(ALLOWED_PATH_PREFIXES)


def looks_like_file(url: str) -> bool:
    p = urlparse(url)
    # Some direct downloads are /download/.../document/xlsx (no .xlsx extension in path)
    return bool(FILE_EXT_RE.search(p.path)) or p.path.startswith("/download/")


def safe_filename_from_url(url: str) -> str:
    """
    Produce a stable local filename from the URL path.  This is the FALLBACK —
    prefer Content-Disposition filename when available.

    For /download/{rid}/{slug}/{did}/document/{fmt} URLs, uses the resource slug
    + document_id + format to create a unique, descriptive filename.
    """
    p = urlparse(url)
    path = p.path.rstrip("/")

    # For Drupal download URLs, use slug + doc_id for uniqueness
    m = DOWNLOAD_URL_RE.match(path)
    if m:
        _rid, slug, doc_id, fmt = m.groups()
        return re.sub(r"[^A-Za-z0-9._-]+", "_", f"{slug}_{doc_id}.{fmt.lower()}")[:200]

    # Original logic for non-download URLs (file extension in path)
    base = os.path.basename(path) or "download"
    if base.lower() in FILE_EXTENSIONS:
        prev = os.path.basename(os.path.dirname(path)) or "document"
        base = f"{prev}.{base.lower()}"
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", base)[:180]
    return base


def extract_metadata_from_slug(slug: str) -> Tuple[str, str, str]:
    """
    Parse a resource slug into (year, section, category).

    Handles observed patterns:
      '2024-section-1-commencing-students'             -> ('2024', 'section-1', 'commencing-students')
      '2005-appendix-3-equity-groups'                   -> ('2005', 'appendix-3', 'equity-groups')
      '2024-student-summary-tables'                     -> ('2024', '', 'student-summary-tables')
      'perturbed-student-enrolments-pivot-table-2024'   -> ('2024', 'pivot-table', 'student-enrolments')
      'time-series-data-2003-2008'                      -> ('', '', 'time-series-data-2003-2008')
    """
    year, section, category = "", "", slug

    # Pattern 1: Year-prefixed slugs (most common): {YYYY}-...
    m = re.match(r"^(\d{4})-(.+)$", slug)
    if m:
        year = m.group(1)
        rest = m.group(2)
        # section-{N}-{category}
        sm = re.match(r"^(section-\d+)-(.+)$", rest)
        if sm:
            section = sm.group(1)
            category = sm.group(2)
        else:
            # appendix-{id}-{category} (older years)
            am = re.match(r"^(appendix-\w+)-(.+)$", rest)
            if am:
                section = am.group(1)
                category = am.group(2)
            else:
                category = rest
        return year, section, category

    # Pattern 2: Perturbed pivot tables with year suffix
    pm = re.match(r"^perturbed-(.+)-(\d{4})$", slug)
    if pm:
        category = pm.group(1)
        year = pm.group(2)
        section = "pivot-table"
        return year, section, category

    # Pattern 3: No year extractable (time-series, guides, etc.)
    return year, section, category


def extract_format_from_url(url: str) -> str:
    """Extract the file format from a download URL's final path segment."""
    m = DOWNLOAD_URL_RE.search(urlparse(url).path)
    if m:
        return m.group(4).lower()
    ext_m = FILE_EXT_RE.search(urlparse(url).path)
    if ext_m:
        return ext_m.group(1).lower()
    return ""


def parse_content_disposition(header: str) -> Optional[str]:
    """
    Extract filename from a Content-Disposition header value.
    Uses email.message.Message for robust RFC 2231 / RFC 6266 parsing.
    """
    if not header:
        return None
    msg = Message()
    msg["Content-Disposition"] = header
    fname = msg.get_filename()
    if fname:
        fname = fname.replace("/", "_").replace("\\", "_")
    return fname or None


# ----------------------------
# Networking: robust session
# ----------------------------

def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
        }
    )

    retry = Retry(
        total=8,
        connect=8,
        read=8,
        backoff_factor=0.7,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "HEAD"),
        raise_on_status=False,
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def fetch_html(
    session: requests.Session,
    url: str,
    timeout: Tuple[float, float] = (15.0, 90.0),
    log_fetch: bool = False,
) -> Optional[str]:
    """
    Fetch HTML for a page. Returns None for non-HTML content or on error.
    timeout=(connect_timeout, read_timeout)
    """
    t0 = time.time()
    if log_fetch:
        print(f"[FETCH] start {url}")

    try:
        r = session.get(url, timeout=timeout)

        if log_fetch:
            dt = time.time() - t0
            print(f"[FETCH] done  {url} status={r.status_code} dt={dt:.1f}s")

        if r.status_code >= 400:
            print(f"[WARN] fetch got HTTP {r.status_code}: {url}", file=sys.stderr)
            return None

        ctype = (r.headers.get("Content-Type") or "").lower()
        if "text/html" not in ctype and "application/xhtml" not in ctype:
            return None
        return r.text

    except requests.exceptions.ReadTimeout:
        if log_fetch:
            dt = time.time() - t0
            print(f"[FETCH] timeout(read) {url} dt={dt:.1f}s")
        print(f"[WARN] fetch timed out (read): {url}", file=sys.stderr)
        return None
    except requests.exceptions.ConnectTimeout:
        if log_fetch:
            dt = time.time() - t0
            print(f"[FETCH] timeout(connect) {url} dt={dt:.1f}s")
        print(f"[WARN] fetch timed out (connect): {url}", file=sys.stderr)
        return None
    except requests.exceptions.RequestException as e:
        if log_fetch:
            dt = time.time() - t0
            print(f"[FETCH] error {url} dt={dt:.1f}s err={e}")
        print(f"[WARN] fetch failed: {url} :: {e}", file=sys.stderr)
        return None


def extract_links(html: str, base_url: str) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    urls: List[str] = []
    for a in soup.find_all("a", href=True):
        href = (a.get("href") or "").strip()
        if not href:
            continue
        abs_url = normalise_url(urljoin(base_url, href))
        urls.append(abs_url)
    return urls


# ----------------------------
# Download + dedupe
# ----------------------------

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def download_file(
    session: requests.Session,
    url: str,
    out_dir: Path,
    seen_hashes: Dict[str, Path],
    timeout: Tuple[float, float] = (30.0, 180.0),
    log_progress: bool = False,
    progress_every_mb: int = 8,
) -> Optional[Tuple[Path, str]]:
    """
    Download a file to out_dir. Returns (saved_path, resolved_filename) or None.

    Filename resolution order:
      1. Content-Disposition header from the server response
      2. Fallback: resource slug + doc_id from the URL path

    Dedupes by sha256; if duplicate, removes the new copy and returns the original.
    """
    out_dir.mkdir(parents=True, exist_ok=True)

    fallback_fname = safe_filename_from_url(url)
    mb = 1024 * 1024
    t0 = time.time()

    try:
        with session.get(url, stream=True, timeout=timeout) as r:
            if r.status_code >= 400:
                print(f"[WARN] download got HTTP {r.status_code}: {url}", file=sys.stderr)
                return None

            # Resolve filename: prefer Content-Disposition, fall back to URL-derived
            cd_header = r.headers.get("Content-Disposition", "")
            cd_filename = parse_content_disposition(cd_header)

            if cd_filename:
                fname = re.sub(r"[^A-Za-z0-9._() -]+", "_", cd_filename)[:200]
            else:
                fname = fallback_fname

            target = out_dir / fname
            next_report = progress_every_mb * mb
            total_written = 0

            with target.open("wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 256):
                    if not chunk:
                        continue
                    f.write(chunk)
                    total_written += len(chunk)

                    if log_progress and total_written >= next_report:
                        dt = time.time() - t0
                        print(f"  [DL] {fname}: {total_written/mb:.1f} MB written in {dt:.1f}s")
                        next_report += progress_every_mb * mb

        if target.exists() and target.stat().st_size < 1024:
            print(f"[WARN] very small file (<1KB) saved: {target} from {url}", file=sys.stderr)

        digest = sha256_file(target)
        if digest in seen_hashes:
            target.unlink(missing_ok=True)
            return (seen_hashes[digest], fname)
        seen_hashes[digest] = target
        return (target, fname)

    except requests.exceptions.RequestException as e:
        print(f"[WARN] download failed: {url} :: {e}", file=sys.stderr)
        return None


# ----------------------------
# Crawl orchestrator
# ----------------------------

def crawl_and_download(
    out_dir: Path,
    max_pages: int,
    delay_s: float,
    do_download: bool,
    verbose: bool,
    heartbeat: int,
    log_fetch: bool,
    log_download_progress: bool,
) -> None:
    print(f"[INFO] Starting crawl — max_pages={max_pages} delay={delay_s}s download={'yes' if do_download else 'no'}")
    print(f"[INFO] Output directory: {out_dir}")
    print(f"[INFO] Seed URLs: {START_URLS}")
    sys.stdout.flush()

    session = make_session()

    queue: deque[str] = deque(normalise_url(u) for u in START_URLS)
    visited: Set[str] = set()
    slow_seen: Set[str] = set()

    found_files: List[FoundLink] = []
    pages_crawled = 0

    while queue and pages_crawled < max_pages:
        url = queue.popleft()
        if url in visited:
            continue
        visited.add(url)

        if not in_scope(url):
            continue

        html = fetch_html(session, url, log_fetch=log_fetch)
        pages_crawled += 1

        if verbose:
            print(f"[CRAWL] {pages_crawled}/{max_pages} {url} (queue={len(queue)} files={len(found_files)})")

        if heartbeat > 0 and pages_crawled % heartbeat == 0:
            print(f"[PROGRESS] pages={pages_crawled} queue={len(queue)} visited={len(visited)} files_found={len(found_files)}")

        if html is None:
            # one re-queue attempt for transient stalls
            if url not in slow_seen:
                slow_seen.add(url)
                queue.append(url)
                if verbose:
                    print(f"[CRAWL] re-queued once due to fetch failure: {url}")
            if delay_s > 0:
                time.sleep(delay_s)
            continue

        links = extract_links(html, url)

        for link in links:
            if not in_scope(link):
                continue

            if looks_like_file(link):
                found_files.append(FoundLink(url=link, referrer=url))
            else:
                if link not in visited:
                    queue.append(link)

        if delay_s > 0:
            time.sleep(delay_s)

    # Deduplicate file URLs
    uniq_files: Dict[str, FoundLink] = {}
    for f in found_files:
        uniq_files.setdefault(f.url, f)

    # Enrich with metadata extracted from URL paths
    enriched_files: Dict[str, FoundLink] = {}
    for u, f in uniq_files.items():
        m = DOWNLOAD_URL_RE.search(urlparse(u).path)
        if m:
            slug = m.group(2)
            fmt = m.group(4).lower()
        else:
            slug = urlparse(u).path.rstrip("/").rsplit("/", 1)[-1]
            fmt = extract_format_from_url(u)

        year, section, category = extract_metadata_from_slug(slug)

        enriched_files[u] = FoundLink(
            url=f.url,
            referrer=f.referrer,
            year=year,
            section=section,
            category=category,
            format=fmt,
        )

    out_dir.mkdir(parents=True, exist_ok=True)

    # Write manifest (filenames filled in after download phase)
    manifest_path = out_dir / "manifest.tsv"
    with manifest_path.open("w", encoding="utf-8") as mf:
        mf.write("url\treferrer\tyear\tsection\tcategory\tformat\tfilename\n")
        for u, f in sorted(enriched_files.items()):
            mf.write(f"{u}\t{f.referrer}\t{f.year}\t{f.section}\t{f.category}\t{f.format}\t\n")

    print(f"[INFO] Crawled pages: {pages_crawled}")
    print(f"[INFO] Unique file links found: {len(enriched_files)}")
    print(f"[INFO] Manifest written: {manifest_path}")

    if not do_download:
        return

    files_dir = out_dir / "files"
    seen_hashes: Dict[str, Path] = {}
    download_results: Dict[str, str] = {}  # url -> resolved filename

    for i, (u, f) in enumerate(sorted(enriched_files.items()), start=1):
        print(f"[{i}/{len(enriched_files)}] Downloading: {u}")
        result = download_file(
            session,
            u,
            files_dir,
            seen_hashes,
            log_progress=log_download_progress,
        )
        if result is not None:
            saved_path, resolved_fname = result
            print(f"  -> {saved_path}")
            download_results[u] = resolved_fname
        if delay_s > 0:
            time.sleep(delay_s)

    # Rewrite manifest with resolved filenames
    with manifest_path.open("w", encoding="utf-8") as mf:
        mf.write("url\treferrer\tyear\tsection\tcategory\tformat\tfilename\n")
        for u, f in sorted(enriched_files.items()):
            fname = download_results.get(u, "")
            mf.write(f"{u}\t{f.referrer}\t{f.year}\t{f.section}\t{f.category}\t{f.format}\t{fname}\n")

    print(f"[INFO] Manifest updated with filenames: {manifest_path}")

    hash_index = out_dir / "hash_index.tsv"
    with hash_index.open("w", encoding="utf-8") as hf:
        hf.write("sha256\tpath\n")
        for digest, path in sorted(seen_hashes.items()):
            hf.write(f"{digest}\t{path}\n")

    print(f"[INFO] Hash index written: {hash_index}")


# ----------------------------
# CLI
# ----------------------------

def main() -> None:
    # Disable output buffering so progress lines appear immediately in the terminal
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)

    ap = argparse.ArgumentParser(
        description="Download Higher Education Statistics student data files from education.gov.au"
    )
    ap.add_argument("--out", type=Path, default=Path("./edu_he_stats_downloads"), help="Output directory")
    ap.add_argument("--max-pages", type=int, default=2000, help="Maximum HTML pages to crawl")
    ap.add_argument("--delay", type=float, default=0.6, help="Polite delay between requests (seconds)")
    ap.add_argument("--no-download", action="store_true", help="Only create manifest; do not download files")

    # New options
    ap.add_argument("--verbose", action="store_true", help="Log each crawled page")
    ap.add_argument("--heartbeat", type=int, default=25, help="Print progress every N crawled pages")
    ap.add_argument("--log-fetch", action="store_true", help="Print fetch start/end timing for each crawled page")
    ap.add_argument(
        "--log-download-progress",
        action="store_true",
        help="Print incremental progress during file downloads",
    )

    args = ap.parse_args()

    crawl_and_download(
        out_dir=args.out,
        max_pages=args.max_pages,
        delay_s=args.delay,
        do_download=not args.no_download,
        verbose=args.verbose,
        heartbeat=args.heartbeat,
        log_fetch=args.log_fetch,
        log_download_progress=args.log_download_progress,
    )


if __name__ == "__main__":
    main()