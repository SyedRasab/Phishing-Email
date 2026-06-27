# Phishing Email Detection System — Complete Backend Context

> This document provides a **complete, detailed overview** of the backend system.  
> Frontend is NOT covered here. This is purely the backend: AI model, analysis pipeline, database, and API.

---

## 1. Project Overview

This is an **AI-powered Phishing Email Detection System** built as an academic/university project. The system takes a raw email (as text or file upload), analyzes it through a multi-layered pipeline, and produces:

- A **phishing probability** (AI model output, 0-100%)
- A **threat/risk score** (0-100, rule-based + AI, higher = more dangerous)
- A **trust score** (0-100, higher = more trusted/safer)
- Detailed **flags and reasons** explaining why the email is suspicious
- Full **authentication analysis** (SPF, DKIM, DMARC)

The backend is built with **FastAPI** (Python) and uses a **fine-tuned DistilBERT** model for AI-based classification.

---

## 2. Folder Structure (Backend Only)

```
d:\Phishing Email\
│
├── backend\                    ← All backend Python code
│   ├── main.py                 ← FastAPI application (API endpoints)
│   ├── model.py                ← AI model loading & prediction
│   ├── parser.py               ← Raw email parsing (headers, body, URLs, attachments)
│   ├── features.py             ← Rule-based feature extraction (text, URL, auth, spoofing)
│   ├── scorer.py               ← Threat scoring engine (0-100)
│   ├── trust_analyzer.py       ← Advanced trust analysis module (SPF, DKIM, DMARC, etc.)
│   ├── database.py             ← SQLite database (SQLAlchemy ORM)
│   ├── validate_pipeline.py    ← End-to-end pipeline validation script
│   ├── test_features.py        ← Unit tests for features.py
│   ├── test_model.py           ← Unit tests for model.py
│   ├── test_parser.py          ← Unit tests for parser.py
│   ├── test_scorer.py          ← Unit tests for scorer.py
│   └── test_trust_analyzer.py  ← Unit tests for trust_analyzer.py
│
├── models\
│   └── final_model\            ← Trained DistilBERT model files
│       ├── config.json         ← Model architecture config
│       ├── model.safetensors   ← Model weights (~267 MB)
│       ├── tokenizer.json      ← Tokenizer vocabulary
│       └── tokenizer_config.json
│
├── phishing.db                 ← SQLite database file (created at runtime)
├── requirements.txt            ← Python dependencies
└── venv\                       ← Python virtual environment
```

---

## 3. The AI Model

### Model Type
- **Architecture**: `DistilBERT` (specifically `DistilBertForSequenceClassification`)
- **Base Model**: Fine-tuned from Hugging Face's `distilbert-base-uncased`
- **Task**: Binary text classification (Phishing vs. Legitimate)
- **Number of Labels**: 2 (Label 0 = Legitimate, Label 1 = Phishing)

### Model Specifications (from `config.json`)
| Parameter | Value |
|---|---|
| Model Type | `distilbert` |
| Hidden Dimension | 768 |
| Feed-Forward Dimension | 3072 |
| Attention Heads | 12 |
| Layers | 6 |
| Max Position Embeddings | 512 tokens |
| Vocab Size | 30,522 |
| Activation | GELU |
| Dropout | 0.1 (attention), 0.2 (classifier) |
| Problem Type | `single_label_classification` |
| Weight Format | `safetensors` (~267 MB) |
| Framework | PyTorch + Hugging Face Transformers |

### How the Model Works (file: `model.py`)
1. At server startup, the model and tokenizer are loaded from `models/final_model/` using Hugging Face's `AutoModelForSequenceClassification` and `AutoTokenizer`.
2. The model is put into **evaluation mode** (`model.eval()`).
3. When an email is scanned, the `predict_phishing(email_text)` function:
   - Tokenizes the email body text (truncated to 512 tokens max)
   - Runs the tokens through the model with `torch.no_grad()` (no gradient computation for speed)
   - Applies `softmax` to the raw logits to get probabilities
   - Returns a list `[prob_legitimate, prob_phishing]`
4. The **phishing probability** (index 1) is used by the rest of the pipeline.

### Model File Locations
- **Model weights**: `models/final_model/model.safetensors` (267 MB)
- **Tokenizer**: `models/final_model/tokenizer.json` (711 KB)
- **Config**: `models/final_model/config.json`

---

## 4. The Analysis Pipeline (Step by Step)

When an email is submitted, it goes through this exact pipeline (defined in `main.py → run_pipeline()`):

```
Raw Email Text
     │
     ▼
[Step 1] parser.py → parse_email()
     │   Extracts: sender, subject, body, URLs, attachments, headers
     ▼
[Step 2] features.py → extract_all_features()
     │   Extracts: text features, URL features, SPF/DMARC, domain age,
     │             spoofing flags, typosquatting, attachment risk
     ▼
[Step 3] model.py → predict_phishing()
     │   Runs DistilBERT on email body text
     │   Returns: [prob_legit, prob_phishing]
     ▼
[Step 4] trust_analyzer.py → run_trust_analysis()
     │   Advanced analysis: SPF mechanism, DKIM key verification,
     │   DMARC policy, domain age (RDAP+WHOIS), display name spoofing,
     │   typosquatting (char substitution), sender reputation
     │   Computes: trust_score (0-100)
     ▼
[Step 5] scorer.py → compute_score()
     │   Combines AI probability + rule features + trust analysis
     │   Produces: threat score (0-100), risk level, flags list
     ▼
[Step 6] database.py → save_scan()
     │   Saves the complete scan result to SQLite
     ▼
[Step 7] Return JSON response to client
```

---

## 5. Detailed Module Breakdown

### 5.1 `parser.py` — Email Parser

**Purpose**: Takes a raw email string (RFC 2822 format) and extracts all structured data.

**What it extracts**:
| Field | Description |
|---|---|
| `sender` | Full "From" header (e.g., `"PayPal" <user@paypal.com>`) |
| `sender_email` | Just the email address |
| `sender_domain` | Domain part (e.g., `paypal.com`) |
| `display_name` | Display name part (e.g., `PayPal`) |
| `subject` | Email subject line |
| `reply_to` | Reply-To header |
| `return_path` | Return-Path header |
| `dkim_signature` | Raw DKIM-Signature header value |
| `authentication_results` | Authentication-Results header |
| `body_text` | Plain text body |
| `body_html` | HTML body |
| `urls` | All URLs extracted from both HTML (`<a href>`) and plain text (regex) |
| `attachments` | List of `{filename, content_type}` objects |

**Libraries used**: Python's built-in `email` module, `BeautifulSoup` (for HTML parsing), `re` (for URL regex).

---

### 5.2 `features.py` — Rule-Based Feature Extraction

**Purpose**: Extracts security-relevant features from the parsed email using hardcoded rules and DNS lookups. This is the **first layer** of analysis (simpler/faster than trust_analyzer).

**Features extracted** (organized by category):

#### A. Text Features (`extract_text_features`)
| Feature | Type | Description |
|---|---|---|
| `urgency_count` | int | Count of urgency keywords ("urgent", "act now", "suspended", etc.) |
| `has_credential_request` | bool | Body asks for passwords, login info, credit card, etc. |
| `has_money_mention` | bool | Body mentions wire transfer, lottery, inheritance, etc. |
| `exclamation_count` | int | Number of `!` in body |
| `caps_ratio` | float | Ratio of uppercase characters to total characters |

**Keyword Lists**:
- 13 urgency words (urgent, immediately, action required, verify now, suspended, expire, etc.)
- 10 credential words (password, username, login, credit card, etc.)
- 9 money words (wire transfer, invoice, lottery, million dollars, etc.)

#### B. URL Features (`extract_url_features`)
| Feature | Type | Description |
|---|---|---|
| `url_count` | int | Total URLs found in the email |
| `has_suspicious_tld` | bool | Any URL uses a suspicious TLD (.xyz, .tk, .click, etc.) |
| `has_ip_based_url` | bool | Any URL uses an IP address instead of a domain |
| `has_shortened_url` | bool | Any URL uses a URL shortener (bit.ly, tinyurl, etc.) |
| `has_long_url` | bool | Any URL is longer than 100 characters |

**Suspicious TLDs checked**: `.xyz`, `.top`, `.click`, `.download`, `.stream`, `.gq`, `.cf`, `.tk`, `.ml`, `.ga`, `.work`, `.party`

**URL shorteners checked**: `bit.ly`, `tinyurl.com`, `t.co`, `goo.gl`, `ow.ly`, `buff.ly`

#### C. Email Authentication (`check_email_auth`)
- **SPF**: DNS TXT lookup for `v=spf1`. Checks for `-all` or `~all` → pass, else → fail.
- **DMARC**: DNS TXT lookup for `_dmarc.<domain>`. Checks for `v=dmarc1` → pass, else → fail.

#### D. Domain Age (`check_domain_age`)
- Uses **RDAP** API (`https://rdap.org/domain/`) to find domain registration date.
- Returns `age_days` and `age_risk`:
  - < 30 days → `high`
  - < 180 days → `medium`  
  - ≥ 180 days → `low`

#### E. Spoofing Detection (`check_spoofing`)
- **Reply-To Mismatch**: Reply-To domain ≠ sender domain
- **Return-Path Mismatch**: Return-Path domain ≠ sender domain
- **Brand Impersonation**: Email body mentions a known brand (PayPal, Amazon, Google, etc.) but sender domain doesn't match

**Known Brands checked**: paypal, amazon, apple, microsoft, google, netflix, facebook, instagram, twitter, bank, ebay, dropbox, linkedin, whatsapp

#### F. Typosquatting Detection (`check_typosquatting`)
- Uses `SequenceMatcher` to compare sender domain against known brand names.
- Similarity ratio between 0.65 and 1.0 (but not exact match) → flagged as typosquatting.

#### G. Attachment Risk (`check_attachments`)
- **High-risk extensions**: `.exe`, `.bat`, `.js`, `.vbs`, `.ps1`, `.cmd`, `.scr`, `.pif`, `.com`
- **Medium-risk extensions**: `.docm`, `.xlsm`, `.zip`, `.rar`, `.iso`, `.img`, `.jar`

---

### 5.3 `trust_analyzer.py` — Advanced Trust Analysis (899 lines)

**Purpose**: This is the **most comprehensive** module. It performs deep, professional-grade analysis of email trustworthiness. It was built as an upgrade over the simpler `features.py` checks.

**What it analyzes (9 checks)**:

#### 1. Domain Age Analysis (`analyze_domain_age`)
- **Primary method**: RDAP API (`https://rdap.org/domain/<domain>`)
- **Fallback method**: `python-whois` library
- **Risk levels**:
  - < 30 days → `HIGH`
  - < 90 days → `MEDIUM`
  - < 180 days → `LOW_MEDIUM`
  - < 365 days → `SAFE`
  - ≥ 3 years → `TRUSTED`

#### 2. SPF Analysis (`analyze_spf`) — Full Mechanism Parsing
- Performs DNS TXT lookup for the sender domain
- Looks for `v=spf1` record
- **Parses the SPF mechanism** (not just pass/fail):
  - `-all` (hard fail) → `risk: LOW` (domain properly blocks unauthorized senders)
  - `~all` (soft fail) → `risk: MEDIUM` (domain warns but doesn't block)
  - `?all` (neutral) → `risk: HIGH` (domain has no opinion)
  - `+all` (pass all) → `risk: CRITICAL` (domain allows anyone to send — extremely dangerous)
  - No SPF record → `risk: HIGH`
- Returns: `spf_exists`, `spf_record`, `spf_mechanism`, `risk`

#### 3. DKIM Analysis (`analyze_dkim`) — Header + DNS Key Verification
- **Step 1**: Checks if `DKIM-Signature` header exists in the email
- **Step 2**: Extracts `s=` (selector) and `d=` (signing domain) from the DKIM header
- **Step 3**: DNS lookup for `<selector>._domainkey.<domain>` TXT record to verify the public key exists
- **Step 4**: Checks **alignment** — signing domain matches sender domain
- **Step 5**: Parses `Authentication-Results` header for `dkim=pass/fail`
- Risk mapping:
  - Public key exists + aligned → `LOW`
  - DKIM present but not aligned → `MEDIUM`
  - No DKIM at all → `HIGH`
  - Auth-Results says `dkim=pass` → overrides to `LOW`
  - Auth-Results says `dkim=fail` → overrides to `HIGH`

> **Important Note**: We do NOT perform cryptographic DKIM signature verification because that requires the original email bytes (which are modified when copy-pasting or uploading email text). We verify the infrastructure (DNS key exists, alignment) instead.

#### 4. DMARC Analysis (`analyze_dmarc`) — Policy Extraction
- DNS lookup for `_dmarc.<domain>` TXT record
- Looks for `v=dmarc1`
- Extracts:
  - `p=` (policy): `reject`, `quarantine`, or `none`
  - `sp=` (subdomain policy)
  - `pct=` (percentage of emails the policy applies to)
- Risk mapping:
  - `p=reject` → `LOW` (strongest protection)
  - `p=quarantine` → `MEDIUM`
  - `p=none` → `HIGH` (no enforcement, domain is unprotected)
  - No DMARC record → `HIGH`

#### 5. Email Spoofing Detection (`analyze_spoofing`)
- **Reply-To mismatch**: Reply-To domain ≠ sender domain
- **Return-Path mismatch**: Return-Path domain ≠ sender domain
- **Brand impersonation**: Body mentions a known brand, but sender is not from that brand's official domain
- Uses a curated map of official brand domains (e.g., Microsoft → `microsoft.com`, `outlook.com`, `hotmail.com`, `live.com`)

#### 6. Display Name Spoofing (`analyze_display_name`)
- Detects when the display name contains a brand name but the actual email is from a different domain
  - Example: `"PayPal Security" <attacker@gmail.com>` → **flagged**
- Also detects when display name looks like an email address (social engineering trick)
  - Example: `"ceo@company.com" <attacker@evil.com>` → **flagged**

#### 7. Typosquatting Detection (`analyze_typosquatting`) — Enhanced
Two detection methods:
- **Method 1: Character Substitution Normalization**
  - Normalizes common substitutions: `0→o`, `1→l`, `rn→m`, `vv→w`, `5→s`, `3→e`, `@→a`
  - If normalized domain matches a brand → flagged (e.g., `paypa1` normalizes to `paypal`)
- **Method 2: Similarity Matching**
  - Uses `SequenceMatcher` with adaptive thresholds:
    - Short brands (< 5 chars): threshold = 0.85 (stricter to avoid false positives)
    - Longer brands: threshold = 0.75

#### 8. Sender Reputation (`analyze_sender_reputation`)
- **Free email provider** detection (gmail.com, yahoo.com, hotmail.com, etc.)
- **Disposable email provider** detection (tempmail.com, mailinator.com, guerrillamail.com, etc.)
- **Suspicious TLD** detection (sender domain ends with .xyz, .tk, .click, etc.)

#### 9. Trust Score Computation (`compute_trust_score`)
- Starts at **100 points** (fully trusted)
- **Deducts points** for each failed check based on weighted signals
- **Trust Score Weights** (must sum to exactly 100):

| Signal | Weight (Max Deduction) |
|---|---|
| AI Model prediction | 30 |
| Domain Age | 15 |
| SPF | 10 |
| DKIM | 10 |
| DMARC | 10 |
| Spoofing | 10 |
| Display Name Spoofing | 5 |
| Typosquatting | 5 |
| Suspicious URLs | 3 |
| Attachment Risk | 2 |
| **Total** | **100** |

- **Trust Level mapping**:
  - ≥ 80 → `TRUSTED`
  - ≥ 60 → `SAFE`
  - ≥ 40 → `SUSPICIOUS`
  - ≥ 20 → `DANGEROUS`
  - < 20 → `CRITICAL THREAT`

---

### 5.4 `scorer.py` — Threat Scoring Engine

**Purpose**: Computes the **threat score** (0-100, higher = more dangerous). This is the inverse concept of the trust score.

**Threat Score Weights** (must sum to exactly 100):

| Signal | Weight | Justification |
|---|---|---|
| AI probability | 35 | AI is the strongest signal, trained on thousands of emails |
| Domain age | 15 | Newly registered domains strongly linked to phishing |
| SPF fail | 10 | Failed auth means sender can't be verified |
| DMARC fail | 10 | No DMARC means domain has no anti-spoofing policy |
| DKIM fail | 5 | Missing/invalid DKIM is a trust signal |
| Suspicious URL | 10 | Malicious TLDs and IP-based URLs are direct red flags |
| Typosquatting | 5 | Fake brand domains are a classic phishing technique |
| Attachment risk | 5 | Extension heuristics only, so weighted lower |
| Spoofing | 5 | Header mismatches support phishing but not definitive |
| **Total** | **100** | |

**Risk Level mapping**:
- < 25 → `Low Risk`
- < 50 → `Medium Risk`
- < 75 → `High Risk`
- ≥ 75 → `Critical Threat`

**How scoring works**:
1. AI probability (0-1) is multiplied by 35 to get AI points
2. Each check adds points if failed (e.g., SPF fail = +10, DMARC fail = +10)
3. Some checks have partial scores (e.g., domain age MEDIUM risk = 70% of weight)
4. Score is capped at 100
5. The scorer prefers `trust_analysis` data when available, falling back to `features` data

---

### 5.5 `database.py` — SQLite Database

**Purpose**: Stores all scan results persistently using SQLAlchemy ORM.

**Database**: SQLite (file: `phishing.db` in project root)

**Table: `scan_results`**

| Column | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Auto-incrementing scan ID |
| `scanned_at` | DateTime | UTC timestamp of scan |
| `sender` | String | Full sender header |
| `sender_domain` | String | Sender's domain |
| `subject` | String | Email subject |
| `is_phishing` | Integer | 1 = phishing, 0 = legitimate |
| `risk_score` | Integer | Threat score (0-100) |
| `risk_level` | String | "Low Risk", "Medium Risk", "High Risk", "Critical Threat" |
| `trust_score` | Integer | Trust score (0-100) |
| `spf` | String | SPF mechanism result |
| `dkim_status` | String | "present", "missing", or "aligned" |
| `dmarc` | String | DMARC policy |
| `domain_age_days` | Integer | Domain age in days |
| `spoofing_detected` | Integer | 1 = spoofing found, 0 = clean |
| `url_count` | Integer | Number of URLs in email |
| `attachment_count` | Integer | Number of attachments |
| `attachment_risk` | String | "safe", "medium", or "high" |
| `flags` | Text (JSON) | JSON array of flag strings |
| `trust_analysis` | Text (JSON) | Full JSON blob of trust analysis |

**Database Functions**:
- `init_db()`: Creates the table if it doesn't exist (called at server startup)
- `save_scan(scan_data)`: Saves a scan result, returns the scan ID
- `get_history(limit=20)`: Returns last N scans ordered by date
- `get_stats()`: Returns aggregated statistics:
  - Total scans count
  - Safe / Suspicious / Phishing / Critical counts
  - Top 5 attacked domains
  - Last 5 phishing alerts
  - 7-day threat trends (date, total scans, phishing count per day)

---

## 6. API Endpoints

The API server is built with **FastAPI** and runs with **Uvicorn**.

| Method | Endpoint | Description | Input | Output |
|---|---|---|---|---|
| `GET` | `/` | Health check | None | `{"message": "Phishing Detector API is running"}` |
| `POST` | `/scan/text` | Scan email from text | `{"email_text": "raw email string"}` | `ScanResult` JSON |
| `POST` | `/scan/file` | Scan email from uploaded file | File upload (`.eml` or text) | `ScanResult` JSON |
| `GET` | `/history?limit=20` | Get scan history | Optional `limit` query param | Array of scan records |
| `GET` | `/stats` | Get dashboard statistics | None | Stats JSON object |

### `ScanResult` Response Format
```json
{
  "scan_id": 1,
  "is_phishing": true,
  "phishing_probability": 87.5,
  "risk_score": 72,
  "risk_level": "High Risk",
  "trust_score": 28,
  "trust_analysis": { /* full trust analysis object */ },
  "flags": [
    "AI model detected phishing patterns (probability: 88%)",
    "SPF validation failed — mechanism: none",
    "DMARC policy is 'none' — no enforcement",
    "Sender domain resembles 'paypal' — possible typosquatting"
  ],
  "sender": "\"PayPal\" <scammer@paypa1.xyz>",
  "subject": "URGENT: Verify your account!",
  "sender_domain": "paypa1.xyz",
  "url_count": 3,
  "attachment_count": 0,
  "attachment_risk": "safe",
  "spf": "none",
  "dmarc": "none"
}
```

---

## 7. Python Dependencies (Key Libraries)

| Library | Version | Purpose |
|---|---|---|
| `fastapi` | 0.136.1 | Web framework for the REST API |
| `uvicorn` | 0.46.0 | ASGI server to run FastAPI |
| `torch` | 2.11.0 | PyTorch — runs the DistilBERT model |
| `transformers` | 5.6.2 | Hugging Face — loads/runs the model |
| `safetensors` | 0.7.0 | Efficient model weight storage |
| `dnspython` | 2.8.0 | DNS lookups for SPF, DKIM, DMARC verification |
| `beautifulsoup4` | 4.14.3 | HTML parsing for URL extraction |
| `lxml` | 6.1.0 | HTML parser backend for BeautifulSoup |
| `SQLAlchemy` | 2.0.49 | ORM for SQLite database |
| `python-whois` | 0.9.6 | WHOIS lookup (domain age fallback) |
| `pydantic` | 2.13.3 | Data validation for API request/response models |
| `python-multipart` | 0.0.26 | File upload handling |
| `pytest` | 9.0.3 | Unit testing framework |

---

## 8. How to Run the Backend

```bash
# Navigate to project root
cd "d:\Phishing Email"

# Activate virtual environment
venv\Scripts\activate

# Start the API server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive API docs at `http://localhost:8000/docs`.

---

## 9. Test Files

| File | Tests |
|---|---|
| `test_parser.py` | Email parsing (header extraction, body, URLs) |
| `test_features.py` | Feature extraction (text features, URL features) |
| `test_model.py` | AI model loading and prediction |
| `test_scorer.py` | Threat scoring logic |
| `test_trust_analyzer.py` | Full trust analysis pipeline (SPF, DKIM, DMARC, spoofing, etc.) |
| `validate_pipeline.py` | End-to-end pipeline test with 3 sample emails |

### Validation Script Sample Emails
The `validate_pipeline.py` tests the full pipeline with 3 scenarios:
1. **Obvious Phishing**: Typosquatted PayPal domain (`paypa1-updates.xyz`), urgency language, Reply-To mismatch
2. **Legitimate Google Email**: Proper `@accounts.google.com` sender, clean content
3. **Spoofed Display Name**: CEO impersonation scam with Reply-To mismatch

---

## 10. Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (Frontend)                  │
│              Sends raw email text/file               │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP POST /scan/text
                       ▼
┌─────────────────────────────────────────────────────┐
│                  FastAPI (main.py)                    │
│                                                      │
│  ┌──────────┐   ┌───────────┐   ┌───────────────┐   │
│  │ parser.py│──▶│features.py│──▶│ trust_analyzer│   │
│  │          │   │           │   │    .py        │   │
│  │ Parse    │   │ Rule-based│   │ DNS/RDAP      │   │
│  │ headers, │   │ feature   │   │ lookups for   │   │
│  │ body,    │   │ extraction│   │ SPF, DKIM,    │   │
│  │ URLs,    │   │ (text,    │   │ DMARC, domain │   │
│  │ attach-  │   │ URL, auth,│   │ age, spoofing,│   │
│  │ ments    │   │ spoofing) │   │ typosquatting,│   │
│  └──────────┘   └───────────┘   │ reputation    │   │
│                                  └───────────────┘   │
│       ┌──────────┐        ┌───────────┐              │
│       │ model.py │        │ scorer.py │              │
│       │          │        │           │              │
│       │DistilBERT│        │ Weighted  │              │
│       │ inference│───────▶│ threat    │              │
│       │ (PyTorch)│        │ scoring   │              │
│       └──────────┘        └───────────┘              │
│                                                      │
│       ┌─────────────┐                                │
│       │ database.py │  ← SQLite (phishing.db)        │
│       │ Save scan,  │                                │
│       │ get history,│                                │
│       │ get stats   │                                │
│       └─────────────┘                                │
└─────────────────────────────────────────────────────┘
```

---

## 11. Key Design Decisions

1. **Two-Score System**: We produce both a **threat score** (how dangerous, higher = worse) and a **trust score** (how trustworthy, higher = better). This gives a more complete picture.

2. **AI + Rules Hybrid**: We don't rely solely on the AI model. We combine AI predictions with rule-based checks (SPF, DKIM, DMARC, domain age, URL analysis, etc.) for more robust detection.

3. **Weighted Scoring**: Both scoring systems use weighted signals that sum to exactly 100, with assertions to prevent weight bugs. Weights are justified and documented.

4. **DNS-Based Authentication**: SPF, DKIM, and DMARC checks are performed by querying DNS records directly (using `dnspython`), not by relying on pre-computed headers that could be spoofed.

5. **No Cryptographic DKIM Verification**: We verify DKIM infrastructure (key exists, alignment) but cannot cryptographically verify the signature because pasted/uploaded email text has been modified from its original byte sequence.

6. **Stateless Backend**: The FastAPI backend is a stateless analysis engine. It receives an email, analyzes it, saves to DB, and returns results. No session management or authentication on the backend itself.

7. **SQLite for Simplicity**: Being an academic project, we use SQLite (file-based database) for easy setup and portability. The ORM (SQLAlchemy) makes it easy to switch to PostgreSQL later if needed.

---

## 12. Current Status

✅ **Completed and working**:
- AI model (DistilBERT) loading and inference
- Full email parsing pipeline
- All rule-based feature extraction
- Advanced trust analysis (SPF, DKIM, DMARC, domain age, spoofing, typosquatting, display name spoofing, sender reputation)
- Threat scoring engine
- Trust scoring engine
- SQLite database with full schema
- All 4 API endpoints
- Unit tests for all modules
- Pipeline validation script
- Backend server runs successfully on `http://localhost:8000`
