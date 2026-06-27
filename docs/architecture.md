# PhishGuard — Core Architecture

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
6.  **Scoring Engine (`scorer.py`)**: Invokes a straight average calculation across 6 threat vectors (AI probability, URL Guard flags, SPF, DKIM, DMARC, and domain age), applying user-defined whitelists/blacklists (Custom Rules) to override calculations.
7.  **Database Commit (`database.py`)**: The final threat score, trust score, risk level, triggers, and full JSON metadata are stored inside `phishing.db`.
8.  **WebSocket Broadcast**: The ASGI connection manager broadcasts a `NEW_SCAN` payload to all active WebSockets on `/ws`, immediately invalidating frontend queries.

### State Management
*   **Frontend**: Global client state is stored in **Zustand** stores (`authStore.ts`, `employeesStore.ts`, `rulesStore.ts`, `settingsStore.ts`, `analyzerStore.ts`). Auth, rules, and employee stores are backed by local storage persistence. Server state (scans, statistics, history) is managed and cached via **TanStack Query**. Impersonation state (`impersonatedEmployeeId`) allows admins to render the dashboard using another employee's scope.
*   **Backend**: State is stored in a local SQLite file (`phishing.db`) managed via SQLAlchemy sessions. At startup, the database initiates tables and executes migration scripts for schema expansions.
