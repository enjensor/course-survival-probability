#!/usr/bin/env bash
set -euo pipefail

cd "/Users/jasonensor/Downloads/Student App"

OUT_DIR="${1:-./_downloads}"

python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install requests beautifulsoup4 urllib3

python3 edu_he_stats_downloader.py \
  --out "$OUT_DIR" \
  --max-pages 2500 \
  --delay 0.3 \
  --verbose \
  --heartbeat 10 \
  --log-fetch
