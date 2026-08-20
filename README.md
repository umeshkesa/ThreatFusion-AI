# 🛡️ ThreatFusion AI

> AI-powered threat intelligence that tells you **which** vulnerabilities actually matter to **your** organization — and in what order to fix them.

## 🔥 The Problem

Security teams are drowning in **alert fatigue**.

Every day, threat feeds and CVE advisories publish hundreds of new vulnerabilities. Most of them are irrelevant to any given organization, yet teams must manually:

- Read generic threat-news headlines
- Determine whether the affected **product** and **version** even exist in **their own** infrastructure
- Judge whether a vulnerability is **actively exploited** or just theoretical

This manual triage is slow, error-prone, and lets genuinely critical exploits slip through — while teams waste hours chasing noise.

## ✨ What ThreatFusion AI Does

ThreatFusion AI fully automates the vulnerability triage pipeline:

1. **Ingest** — Collects security intelligence from dozens of RSS/OPML feeds (automatically scheduled + on-demand).
2. **Extract** — Uses transformer-based NER models + NLP dictionaries to pull affected **products**, **versions**, **version ranges**, and **CVE IDs** out of each story.
3. **Match** — Correlates each threat against your organization's **registered assets** (software + versions) using exact, dictionary, and knowledge-graph matching.
4. **Enrich** — Augments every CVE with live data from trusted sources:
   - **NVD (NIST)** — CVSS severity
   - **FIRST EPSS** — probability of exploitation
   - **CISA KEV** — known-exploited vulnerabilities
   - **Exploit-DB** — public exploit availability
   - **MalwareBazaar** — active malware activity
5. **Score** — Computes a weighted **risk score** (asset criticality + CVSS + EPSS + KEV + exploit + malware + attacker keywords).
6. **Alert** — Surfaces prioritized **CRITICAL / HIGH / MEDIUM / LOW** alerts in a live, per-company dashboard.

## 🏗️ Architecture

```
Security RSS/OPML feeds ──▶ ETL ──▶ AI Extraction ──▶ Asset Matching
                                       │                      │
                              Threat Enrichment ◀───────────────┘
                             NVD / EPSS / KEV / Exploit-DB / MalwareBazaar
                                       │
                                  Risk Scoring
                                       │
                              Prioritized Alerts ──▶ Dashboard (per company)
```

## 🧰 Tech Stack

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- @xenova/transformers (on-device AI NER)
- compromise (NLP)
- rss-parser, xml2js, axios, csv-parser

**Frontend**
- Vanilla HTML / CSS / JavaScript (served statically by Express)

## 📁 Project Structure

```
├── backend/
│   ├── config/db.js            # MongoDB connection
│   ├── controllers/            # Request handlers
│   ├── models/                 # Feed, Asset, Alert, Company
│   ├── routes/                 # API routes
│   ├── services/               # Core logic (ingestion, AI extraction,
│   │                           # enrichment, risk scoring, alerts)
│   ├── utils/                  # Product dictionary, knowledge graph,
│   │                           # version comparison, product matching
│   └── data/feeds.opml         # Threat feed subscription list
└── frontend/
    ├── index.html              # Dashboard UI
    ├── style.css               # Styling / theming
    └── app.js                  # Application + API logic
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)

### 1. Install dependencies
```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment
Create a `backend/.env` file:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<name>
MB_API_KEY=<your_malwarebazaar_api_key>
AUTO_FEED_INGEST_INTERVAL_MINUTES=30
AUTO_FEED_INGEST_ON_START=true
ENABLE_TRANSFORMER_NER=false
```

### 3. Run the backend
```bash
cd backend
npm run dev        # or: node server.js
```

### 4. Run the frontend
```bash
cd frontend
npm start          # runs dev-server.js
```

Open the dashboard, register your company, seed some test assets, and start feed ingestion.

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a company |
| POST | `/api/auth/login` | Login / get company id |
| GET | `/api/health` | Server health check |
| GET | `/api/feeds` | List ingested feeds |
| GET | `/fetch-feeds` | Manually trigger feed ingestion |
| GET | `/alerts/:company_id` | Alerts for a company |
| GET | `/run-alerts/:company_id` | Regenerate alerts from feeds |
| GET | `/seed-assets/:company_id` | Load demo test assets |
| GET | `/api/assets/:company_id` | Get company assets |
| POST | `/api/assets/add` | Add / smart-update an asset |
| DELETE | `/api/assets/delete/:id` | Delete an asset |

## 🧪 How Risk Is Scored

The final risk score (0–100) blends multiple signals:

- **Asset criticality** (HIGH/MEDIUM/LOW) — up to 40
- **CVSS severity** — up to 40
- **EPSS exploitation probability** — up to 30
- **CISA KEV** known-exploited — +30
- **Public exploit available** — +25
- **Malware activity detected** — +25
- **Attacker keywords** (ransomware, exploit, etc.) — +15

Priorities: `CRITICAL ≥ 80`, `HIGH ≥ 50`, `MEDIUM ≥ 30`, `LOW < 30`.



## 🗺️ Roadmap

- [ ] Password hashing & JWT-based authentication
- [ ] Email / Slack alert notifications
- [ ] Historical alert trend charts
- [ ] CVE detail deep-links to NVD / advisory pages
- [ ] More knowledge-graph relationships & product aliases
- [ ] Pagination for feeds and alerts

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Please open an issue or submit a pull request.

## 📄 License

This project is licensed under the [ISC License](LICENSE).
