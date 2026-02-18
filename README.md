# Course Survival Probability

Data-driven completion insights for Australian universities, built on the Department of Education's Higher Education Statistics Collection.

**Live app:** [course-survival-probability.onrender.com](https://course-survival-probability.onrender.com)

---

## What It Does

This app helps prospective students answer a simple question: **where am I most likely to finish my degree and succeed?**

It takes official government data published by the Australian Department of Education and turns it into clear, visual reports covering:

- **Dropout risk** — current rates and year-over-year trends
- **Completion rates** — 4, 6, and 9-year graduation windows with outcome breakdowns
- **Retention** — whether students come back after first year
- **Subject pass rates** — how many students are passing their subjects
- **Field-of-study rankings** — graduation rates by field across all universities
- **Equity performance** — how well universities support students from different backgrounds (First Nations, regional, lower-income, disability, non-English speaking)
- **Risk heatmap** — compare all universities side-by-side for a chosen field of study

All data is sourced from publicly available government statistics. The app is free to use.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI (Python) + SQLite |
| Data | Australian Dept of Education XLSX files, ingested via `ingest.py` |
| Hosting | Render (single service — FastAPI serves the built React app) |

---

## Running Locally

### Prerequisites

- Python 3.9+
- Node.js 18+ and npm
- The SQLite database (`he_stats.db`) — either committed in the repo or generated via `ingest.py`

### 1. Install dependencies

```bash
# Backend
pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install && cd ..
```

### 2. Start the servers

You need two terminal windows:

**Terminal 1 — Backend (port 8000):**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend (port 5173):**
```bash
cd frontend
npx vite --port 5173
```

### 3. Open the app

Go to **http://localhost:5173** in your browser.

The Vite dev server proxies `/api` requests to the FastAPI backend on port 8000, so both servers need to be running.

---

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app — API routes + static file serving
│   ├── engine.py            # Core analytics engine (report, heatmap, equity)
│   ├── db.py                # SQLite connection manager
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main app shell, routing, state management
│   │   ├── api.ts           # API client
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── components/
│   │       ├── ReportCard.tsx          # University report card
│   │       ├── EquityReport.tsx        # Equity group performance
│   │       ├── HeatmapView.tsx         # Field-of-study risk heatmap
│   │       ├── CompletionGauge.tsx     # Completion rate visualisation
│   │       ├── CompletionTimeline.tsx  # 4/6/9-year graduation timeline
│   │       ├── TrendChart.tsx          # Dropout trend sparkline
│   │       ├── RiskBadge.tsx           # Percentile-based risk indicator
│   │       ├── FieldRanking.tsx        # Graduation rate ranking table
│   │       ├── AustraliaMap.tsx        # Interactive state/territory map
│   │       ├── InstitutionSelector.tsx # University dropdown with alias search
│   │       ├── FieldSelector.tsx       # Field of study dropdown
│   │       ├── HowToRead.tsx          # Contextual guide panels
│   │       └── AboutPage.tsx          # About, disclaimer, attribution
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── he_stats.db              # SQLite database (9MB, committed for deployment)
├── ingest.py                # Data ingestion — XLSX files → SQLite
├── schema.sql               # Database schema
├── edu_he_stats_downloader.py  # Government data scraper
├── run_download.sh          # Convenience script for the scraper
└── render.yaml              # Render deployment config
```

---

## Data Pipeline

The data pipeline has three stages:

### 1. Download government data

```bash
bash run_download.sh
```

This crawls the Department of Education website and downloads all Higher Education Statistics XLSX files into `_downloads/files/`. See the [Data Scraper](#data-scraper) section below for details.

### 2. Ingest into SQLite

```bash
python ingest.py
```

Reads the downloaded XLSX files and populates `he_stats.db` with normalised tables for institutions, fields of education, attrition/retention rates, completion cohorts, enrolments, and equity performance data.

### 3. Run the app

Start the backend and frontend as described above. The app reads from `he_stats.db` at runtime.

---

## Deployment

The app deploys as a single service on Render. The `render.yaml` config handles everything:

- **Build:** Installs Python deps, then builds the React frontend (`npm run build`)
- **Run:** FastAPI serves the API at `/api/*` and the built React app for all other routes

Auto-deploys on every push to `main`.

---

## Disclaimer

This app is in active development and provided for informational purposes only. It is not professional advice. Data is sourced from the Australian Department of Education's Higher Education Statistics Collection and is subject to the limitations of the original source. This is an independent project with no affiliation to any government agency or university. See the full disclaimer in the app's About page.

---

## Data Scraper

The `edu_he_stats_downloader.py` script retrieves Higher Education Statistics files from:

https://www.education.gov.au/higher-education-statistics/student-data

### Scraper usage

```bash
# Full run (manifest + download)
python edu_he_stats_downloader.py --out ./_downloads --max-pages 3000 --delay 0.6 --heartbeat 25

# Manifest only (no downloads)
python edu_he_stats_downloader.py --out ./_downloads --no-download

# Verbose logging
python edu_he_stats_downloader.py --out ./_downloads --verbose --heartbeat 10
```

### Scraper dependencies

```bash
pip install requests beautifulsoup4 urllib3
```

### Output

```
_downloads/
├── manifest.tsv      # URL + referrer provenance for every file
├── hash_index.tsv    # SHA256 deduplication index
└── files/
    ├── file1.xlsx
    ├── file2.csv
    └── ...
```

---

## Built By

**Dr Jason Ensor** — Data & Analytics Executive, Sydney, Australia

[LinkedIn](https://linkedin.com/in/jasondensor/) | [Email](mailto:jasondensor@gmail.com)

---

## Licence

Data sourced from the Australian Department of Education under Australian Government open data policy. The application code in this repository is provided as-is for educational and informational purposes.
