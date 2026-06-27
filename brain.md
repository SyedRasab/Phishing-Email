# brain.md — Project Cognitive Map

**LAST UPDATED**: 2026-06-28 02:24:00 (Local Dev Cleanup Update)  
**CHANGES TRACKED**: Reverted all deployment files and configs. Documented the permanent admin role configuration for rasab1781@gmail.com. Updated directory tree and configuration file lists to reflect local development environment.

---

## 1. PROJECT OVERVIEW

This project is an **AI-powered Phishing Email Detection System** designed as a multi-layered cybersecurity evaluation dashboard. Its core purpose is to protect organizations by parsing raw email inputs (or connected Gmail accounts), extracting features via heuristic rules, performing machine learning-based text and URL analysis, and presenting a unified interface for administrators to evaluate employee security posture and trigger training simulations.

The end-user goal is to empower enterprise administrators to monitor incoming threats, evaluate the organizational "Security Score" (alertness), and actively train employees using custom-built phishing simulation templates. Employees can view their inboxes in a secure sandboxed sandbox view, run full diagnostics on suspicious emails, and report simulated attacks to earn safety credit.

Currently, the project is in a **fully functional Beta/Academic stage**:
- The backend features a dual-model machine learning stack (DistilBERT for NLP text classification + Scikit-learn for URL threat classification) combined with custom DNS resolvers for SPF, DKIM, and DMARC verification.
- The frontend features a cinematic 3D environment built using React, Three.js (React Three Fiber), Tailwind CSS v4, and TanStack Router/Query, offering simulated and real Gmail sync interfaces.

### Tech Stack Summary
*   **Frontend**: Vite + React 19, TypeScript, TanStack Router (file-based routing), TanStack Query (server state), Zustand (client state & persistence), Tailwind CSS v4 + `@tailwindcss/vite`, Three.js + `@react-three/fiber` + `@react-three/drei` (3D interactive background visuals), Recharts (dashboard analytics), Framer Motion (micro-animations), jsPDF (forensic report exports), and DOMPurify (HTML sandbox sanitization).
*   **Backend**: Python 3.11+, FastAPI (REST API + WebSockets), Uvicorn (ASGI server), PyTorch + Hugging Face Transformers (DistilBERT inference), Scikit-learn (URL Guard model), SQLAlchemy ORM, SQLite (local database storage), and `dnspython` (direct DNS queries).
*   **Package Managers**: Bun (`bun.lock`) / npm (`package-lock.json`) for Frontend; `pip` (`requirements.txt`) for Backend.

---

## 2. DIRECTORY STRUCTURE (Annotated)

```
phishguard/                          ← Rename root folder (clean name)
├── backend/                         ← Python FastAPI service
│   ├── app/                         ← Application source code
│   │   ├── main.py                  ← FastAPI entry point
│   │   ├── database.py              ← SQLite database configuration and CRUD
│   │   ├── core/                    ← Config, constants, and WebSocket utilities
│   │   ├── ml/                      ← Machine learning classifiers (DistilBERT & URL Guard loading)
│   │   ├── routers/                 ← Split REST endpoints
│   │   └── services/                ← Business logic layers (parser, features, trust_analyzer, scorer)
│   ├── tests/                       ← All pytest modules
│   └── scripts/                     ← Developer utility scripts
│       └── scratch/                 ← Scratch scripts and models playground
├── ml-models/                       ← Saved model configurations and weights
│   ├── distilbert/                  ← NLP model files
│   └── url-guard/                   ← URL classifier pickles
├── frontend/                        ← React + TypeScript single-page application
│   ├── src/                         ← Client source code
│   ├── public/                      ← Static assets
│   ├── package.json                 ← Node dependency mappings
│   └── vite.config.ts               ← Lovable + TanStack compiler
├── docs/                            ← Centralized project documentation
│   ├── architecture.md              ← High-level data flows
│   ├── api-reference.md             ← REST contract specifications
│   └── setup.md                     ← Local setup manual
└── database/                        ← Database storage directory
    └── phishing.db                  ← SQLite database file
```

---

## 3. CORE ARCHITECTURE

The Phishing Email Detection System operates as a hybrid architecture combining rule-based heuristics, DNS verification, and machine learning pipelines.

```
                  ┌────────────────────────────────────────┐
                  │          React Client (SPA)            │
                  │  (Zustand, Query, Three.js, WebSockets)│
                  └──────┬─────────────────────────▲───────┘
                         │ HTTP POST               │ WebSocket
                         │ /scan/text              │ NEW_SCAN
                         ▼                         │
┌────────────────────────┼─────────────────────────┼────────────────────────┐
│ FastAPI Backend        │                         │                        │
│                        ▼                         │                        │
│                 [1. Parser]                      │                        │
│             email.message_from_string            │                        │
│                        │                         │                        │
│                        ▼                         │                        │
│                 [2. Features]                    │                        │
│              features.extract_all_features       │                        │
│                        │                         │                        │
│                        ├─────────────────────────┐                        │
│                        ▼                         ▼                        │
│                 [3. ML Models]           [4. Trust Layer]                 │
│              DistilBERT + URLGuard       SPF, DKIM, DMARC,                │
│              (Body Text & URLs)          Domain Age (RDAP/WHOIS)          │
│                        │                         │                        │
│                        └────────────────────────┬┘                        │
│                                                 ▼                         │
│                                           [5. Scorer]                     │
│                                       compute_score (Avg)                 │
│                                                 │                         │
│                                                 ▼                         │
│                                           [6. Database]                   │
│                                        save_scan() sqlite                 │
│                                                 │                         │
│                                                 └─────────────────────────┘
└─────────────────────────────────────────────────┘
```

### End-to-End Analysis Pipeline
1.  **Submission**: The user pastes an email or selects a message from their synced Gmail inbox. The frontend triggers a `POST` request to `/scan/text` (or `/scan/file`).
2.  **Parsing (`parser.py`)**: The raw RFC 2822 text is loaded via Python's built-in `email` package. The parser isolates headers (From, Subject, Reply-To, Return-Path, DKIM-Signature, Authentication-Results), the email body (plain text and HTML decoded as UTF-8), attachments, and extracts all links.
3.  **Heuristics & Metadata (`features.py`)**: Urgent keywords are counted, IP-based/suspicious TLDs/shortened URLs are flagged, and attachment extensions are mapped to threat vectors (e.g. `.exe` as high-risk, `.zip` as medium-risk).
4.  **AI Inference (`model.py` & `url_guard.py`)**:
    *   The decrypted plain text body is truncated to 512 tokens and evaluated by the fine-tuned **DistilBERT** NLP model on CPU, returning a raw classification probability (0.0 to 1.0).
    *   All extracted URLs are parsed by the **URL Guard** model using TF-IDF tokenization and a Logistic Regression classifier, flagging malicious URLs.
5.  **Infrastructure Verification (`trust_analyzer.py`)**: Performs asynchronous DNS text lookups:
    *   **SPF**: Checks mechanism strength (`-all`, `~all`, `?all`, `+all`).
    *   **DKIM**: Extracts signing domain/selector from headers, checks for public DNS key existence, and verifies sender alignment.
    *   **DMARC**: Checks policy strength (`reject`, `quarantine`, `none`) and alignment.
    *   **Domain Age**: Requests registration dates from `rdap.org` (or WHOIS fallback) to determine age.
    *   **Spoofing**: Inspects Reply-To/Return-Path mismatches, display name lookalikes, and typosquatted domains using character substitution normalizations.
6.  **Scoring Engine (`backend/app/services/scorer.py`)**: Invokes a straight average calculation across 6 threat vectors (AI probability, URL Guard flags, SPF, DKIM, DMARC, and domain age), applying user-defined whitelists/blacklists (Custom Rules) to override calculations.
7.  **Database Commit (`backend/app/database.py`)**: The final threat score, trust score, risk level, triggers, and full JSON metadata are stored inside `database/phishing.db`.
8.  **WebSocket Broadcast**: The ASGI connection manager broadcasts a `NEW_SCAN` payload to all active WebSockets on `/ws`, immediately invalidating frontend queries.

### State Management
*   **Frontend**: Global client state is stored in **Zustand** stores (`authStore.ts`, `employeesStore.ts`, `rulesStore.ts`, `settingsStore.ts`, `analyzerStore.ts`). Auth, rules, and employee stores are backed by local storage persistence. Server state (scans, statistics, history) is managed and cached via **TanStack Query**. Impersonation state (`impersonatedEmployeeId`) allows admins to render the dashboard using another employee's scope.
*   **Backend**: State is stored in a local SQLite file (`database/phishing.db`) managed via SQLAlchemy sessions. At startup, the database initiates tables and executes migration scripts for schema expansions.

---

## 4. KEY FILES — DEEP REFERENCE

### `backend/app/main.py`
*   **Purpose**: Main API routing and application lifecycle controller.
*   **Exports**: `app` (FastAPI instance), `manager` (ConnectionManager).
*   **Dependencies**: `FastAPI`, `parser`, `features`, `model`, `trust_analyzer`, `scorer`, `database`, `url_guard`.

### `backend/app/database.py`
*   **Purpose**: Database engine, mapping schema definitions, and CRUD controller.
*   **Exports**: `init_db`, `save_scan`, `get_history`, `get_stats`, `check_custom_rules`, `trigger_simulation`, `update_simulation_action`, `resolve_review`.
*   **Updates**: Scopes queries to `user_email` inside `get_stats` to compute real personal dashboard counts for individual employees. Additionally calculates and returns database-wide `avg_risk_score` to feed the average threat dashboard score card.

### `frontend/src/components/Brand.tsx`
*   **Purpose**: Houses the programmatic SVG `LogoMark` for consistent, premium branding.
*   **Integration**: Replaced generic lucide icons across the sidebar ([AppShell.tsx](file:///d:/Phishing%20Email/frontend/src/components/layout/AppShell.tsx)), login screen ([AuthShell.tsx](file:///d:/Phishing%20Email/frontend/src/components/auth/AuthShell.tsx)), and header ([Landing.tsx](file:///d:/Phishing%20Email/frontend/src/components/landing/Landing.tsx)).
*   **Sidebar Toggle**: The LogoMark in the sidebar acts as the expand/collapse trigger, replacing the overlapping right-edge arrow button.

### `frontend/src/components/landing/Landing.tsx`
*   **Purpose**: Public marketing page.
*   **Updates**: Reimplemented `PlexusBackground` with advanced 3D particle interactivity: mouse coordinates influence particle parallax shifts along the `x`, `y`, and `z` depths, with spring-back repulsion physics when hovering close to nodes.

### `frontend/src/routes/_authenticated.inbox.$messageId.tsx`
*   **Purpose**: Detailed view for scanned emails.
*   **Layout Revamp**: Email reading cards are set to full-width to prevent truncation. The complex "Message Headers" diagnostic view is re-routed into a responsive 3-column horizontal grid underneath the reading card. Employs auto-resizing iframe heights to eliminate double scrollbars.

---

## 5. AI SYSTEM BREAKDOWN

Since the application does not make calls to generative LLM APIs (e.g. OpenAI/Claude), its intelligence is split into two specialized local classification systems:

### 1. Natural Language Classifier (DistilBERT)
*   **Implementation File**: [backend/app/ml/classifier.py](file:///d:/Phishing%20Email/backend/app/ml/classifier.py)
*   **Architecture**: `DistilBertForSequenceClassification` loaded from Hugging Face.
*   **Training Dataset**: Fine-tuned via [backend/scripts/train_model.py](file:///d:/Phishing%20Email/backend/scripts/train_model.py) on a balanced set of 300 samples comprising authentic transaction templates (HBL, SCB, Google, Microsoft, Amazon) and custom phishing lures containing typosquats, payment requests, and urgency hooks.
*   **Input**: Plain text content of the parsed email body.
*   **Output**: A list containing `[prob_legit, prob_phishing]` probabilities.
*   **Tokenization**: `AutoTokenizer` using `max_length=512` with padding and truncation enabled.
*   **Model Location**: [ml-models/distilbert](file:///d:/Phishing%20Email/ml-models/distilbert)

### 2. URL Threat Evaluator (URL Guard)
*   **Implementation File**: [backend/app/ml/url_guard.py](file:///d:/Phishing%20Email/backend/app/ml/url_guard.py)
*   **Architecture**: Scikit-learn Logistic Regression classifier with a TF-IDF vectorizer.
*   **Input**: List of strings containing extracted URLs.
*   **Output**: String labels (`'good'` or `'bad'`) mapped to boolean metrics.
*   **Model Location**: [ml-models/url-guard/phishing.pkl](file:///d:/Phishing%20Email/ml-models/url-guard/phishing.pkl) and [vectorizer.pkl](file:///d:/Phishing%20Email/ml-models/url-guard/vectorizer.pkl)

---

## 6. DATA FLOWS

### A. Scanning pasted/uploaded email text
1.  **Trigger**: User inputs text in the Analyzer page and clicks "Analyze".
2.  **API Request**: Frontend triggers a `POST` request to `/scan/text` with:
    ```json
    { "email_text": "...", "user_email": "user@company.com" }
    ```
3.  **Parsing**: `parser.py` parses email structure, outputs:
    ```python
    { "body_text": "...", "urls": [...], "sender_domain": "...", "sender": "..." }
    ```
4.  **Feature Extraction**: `features.py` extracts rule features (urgency count, attachment risks, etc.).
5.  **URL Guard**: `url_guard.py` classifies extracted links.
6.  **AI Classification**: `model.py` tokenizes the body text and evaluates it using DistilBERT on CPU, returning a probability score.
7.  **Trust Verification**: `trust_analyzer.py` queries DNS servers for SPF, DKIM, DMARC, and queries RDAP for domain age.
8.  **Scoring**: `scorer.py` aggregates scores (AI, URL Guard, SPF, DKIM, DMARC, Domain Age) and applies custom rules.
9.  **Storage**: `database.py` commits the transaction to `phishing.db`, returning a `scan_id`.
10. **WebSocket Broadcast**: `main.py` broadcasts `{ "type": "NEW_SCAN", "data": { ... } }` to `/ws`.
11. **Frontend Hydration**: `useLiveThreatFeed.ts` invalidates caches, causing the dashboard and history pages to refresh.

---

## 7. CONFIGURATION & ENVIRONMENT

### Frontend `.env.local` Configurations
*   `VITE_API_BASE_URL`: Base address of the FastAPI backend server (default: `http://localhost:8000`).
*   `VITE_GOOGLE_CLIENT_ID`: Google OAuth API Client credential ID. If absent, the frontend switches to simulated Demo mode login workflows.

### Backend Environment Variables
*   `PORT`: Port number on which the FastAPI application will run (default: `8000`).
*   `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS (default: `http://localhost:5173`).

### Config & Documentation Files
*   `package.json`: Manages scripts (`dev`, `build`, `preview`, `lint`, `format`) and dependency mappings.
*   `vite.config.ts`: Lovable wrapper enabling TanStack Start routing and SSR entry maps.
*   `tsconfig.json`: Defines path alias maps (`@/*` pointing to `src/*`).
*   `requirements.txt`: Manages Python packages.
*   `bunfig.toml` / `bun.lock`: Bun bundler lock and environment variables.

---

## 8. DEPENDENCIES MAP

### Backend Core Dependencies
*   `fastapi`: Exposes REST endpoints and serves WebSockets.
*   `uvicorn`: Serves the FastAPI ASGI application on port 8000.
*   `torch` & `transformers`: Executes CPU tensor evaluations on DistilBERT.
*   `dnspython`: Resolves SPF, DKIM, and DMARC records.
*   `beautifulsoup4` & `lxml`: Parses HTML emails to locate links.
*   `SQLAlchemy`: Maps SQLite rows to structured objects.
*   `python-whois`: Fallback WHOIS socket loader.
*   `pydantic`: Imposes model structures on incoming REST JSON requests.

### Frontend Core Dependencies
*   `react` & `react-dom`: Main application renderer (v19).
*   `@tanstack/react-router` & `react-start`: Routing logic.
*   `@tanstack/react-query`: Synchronizes server states with client caches.
*   `zustand`: Client-side persistent state.
*   `three`, `@react-three/fiber`, `@react-three/drei`: Renders cinematic 3D graphics in the application shell.
*   `framer-motion`: Renders page transitions and card hover animations.
*   `recharts`: Generates SVG charts for the admin dashboard.
*   `jspdf`: Generates PDF forensic reports client-side.
*   `dompurify`: Sanitizes parsed email HTML bodies inside the sandbox iframe.
*   `tailwindcss` & `tw-animate-css`: Tailwind CSS styling framework (v4).

---

## 9. KNOWN PATTERNS & CONVENTIONS

### Backend Development Patterns
*   **Routing Structure**: Endpoints are defined directly inside `backend/main.py`.
*   **Database Sessions**: Transactions are opened and closed locally in functions using try/finally blocks to prevent connection leaks.
*   **Pydantic Requests**: Parameters are wrapped in Pydantic models for automatic validation.

### Frontend Development Patterns
*   **Component Structure**: UI components are categorized in `src/components/ui` or feature subdirectories.
*   **Routing convention**: Files inside `src/routes/` map directly to URLs. Private pages are prefixed with `_authenticated` (e.g. `_authenticated.inbox.tsx`).
*   **Zustand Persistence**: Settings, auth session tokens, and rules are persisted in `localStorage` via Zustand's `persist` middleware.

---

## 10. ACTIVE PROBLEMS & TECHNICAL DEBT

### 1. Mock Credentials
Mapping Google OAuth credentials (client_secret, refresh_token) in the admin console is partially mocked on save. The frontend only saves the `client_id` to the backend database; the client secret and refresh token are not transmitted, preventing fully customized background Gmail API evaluations for each user unless they authenticate interactively via Google Identity Services.

### 2. SQLite Concurrency Limits
Under concurrent scans (e.g. multiple employees analyzing emails simultaneously), the SQLite database (`phishing.db`) is prone to locking errors, as write sessions do not queue requests.

### 3. Hardcoded Admin Email
The email `rasab1781@gmail.com` is globally hardcoded to always be assigned the `"admin"` role in both the backend `create_user` database function and the frontend `useGoogleAuth` sign-in hook to prevent it from accidentally reverting to `"employee"`.

---

## 11. CHANGE MAP — HOW TO MODIFY THINGS

### 1. To Add a New Email Heuristic Check
1.  Open [backend/app/services/features.py](file:///d:/Phishing%20Email/backend/app/services/features.py).
2.  Add check logic under a category function (e.g. check urgency, URL, or domain structure).
3.  Add the result to the output dictionary of `extract_all_features`.
4.  Open [backend/app/services/scorer.py](file:///d:/Phishing%20Email/backend/app/services/scorer.py) and modify `compute_score` to incorporate the new feature in the straight average calculation (and update the divisor). Add an appropriate description to `flags`.
5.  Open [backend/app/services/trust_analyzer.py](file:///d:/Phishing%20Email/backend/app/services/trust_analyzer.py) and update `compute_trust_score` and `TRUST_WEIGHTS` (ensuring weights sum to exactly 100) if it is designated as a trust metric.

### 2. To Add a New Route Page to the UI
1.  Create a new `.tsx` file inside [frontend/src/routes/](file:///d:/Phishing%20Email/frontend/src/routes). Use TanStack dot-notation to define layouts (e.g. `_authenticated.inbox.tsx` maps to `/inbox` under the AppShell).
2.  Define the route using `createFileRoute`.
3.  Run `npm run dev` in the frontend directory. The TanStack Router plugin will automatically update [frontend/src/routeTree.gen.ts](file:///d:/Phishing%20Email/frontend/src/routeTree.gen.ts).
4.  Update links or navigation lists inside [frontend/src/components/layout/AppShell.tsx](file:///d:/Phishing%20Email/frontend/src/components/layout/AppShell.tsx).

### 3. To Change the ML Classification Model
1.  Place the new Hugging Face sequence classification model files (config, weights, tokenizer) inside [ml-models/](file:///d:/Phishing%20Email/ml-models).
2.  Open [backend/app/ml/classifier.py](file:///d:/Phishing%20Email/backend/app/ml/classifier.py) and update the `MODEL_PATH` variable to point to the new folder.
3.  Ensure the new model's input token limit matches (or adjust `max_length` accordingly).

---

## 12. GLOSSARY

*   **SPF (Sender Policy Framework)**: A DNS record listing authorized IP addresses permitted to send emails from a domain.
*   **DKIM (DomainKeys Identified Mail)**: Cryptographic signature verification structure. Ensures email headers/body were not tampered with in transit.
*   **DMARC (Domain-based Message Authentication, Reporting and Conformance)**: Enforcement policy instructing mail servers how to handle failures (none, quarantine, reject).
*   **RDAP (Registration Data Access Protocol)**: Next-generation WHOIS query protocol returning JSON metadata about domain registrations.
*   **Typosquatting**: Social engineering tactic where attackers register domains matching popular brands with minor typos (e.g. `paypa1.com`).
*   **Zustand Persist**: State preservation mechanism that commits store instances to `localStorage` automatically.
*   **Impersonation View**: Admin utility that forces the UI to filter views using an employee's context rather than the admin's context.
*   **Zero-day Defense**: Behavioral assessment of email attachments and links using ML rather than static reputation lists.



