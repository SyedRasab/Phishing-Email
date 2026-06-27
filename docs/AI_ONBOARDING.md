# AI Onboarding & Full-Stack Architecture Context

> **Note to AI Agents (Antigravity, Cursor, Copilot, etc.):** 
> Read this file FIRST to understand the complete architecture, workflow, and routing of the Phishing Email Detection System. This avoids needing to scan the entire codebase.

---

## 1. Project Overview

This is an **AI-powered Phishing Email Detection System** built as an academic/university project. 
It analyzes raw emails to determine the probability of them being phishing attempts using a combination of a fine-tuned DistilBERT model and rule-based trust analysis (SPF, DKIM, DMARC, Domain Age, etc.).

---

## 2. Tech Stack

### Frontend (React + TypeScript)
- **Framework**: Vite + React
- **Routing**: TanStack Router (`src/routeTree.gen.ts`)
- **State Management**: Zustand (`src/store/*.ts`)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Language**: TypeScript (`.ts`, `.tsx`)

### Backend (Python + FastAPI)
- **Framework**: FastAPI (runs via Uvicorn)
- **AI Model**: PyTorch + Hugging Face Transformers (DistilBERT)
- **Database**: SQLite with SQLAlchemy ORM
- **Language**: Python 3.11+

---

## 3. Frontend Architecture & Routes

The frontend is a modern SPA (Single Page Application) built with TanStack Router.

### Key Directories
- `src/components/`: Reusable UI components (shadcn/ui, layout components, 3D elements).
- `src/routes/`: TanStack file-based routing. The `_authenticated` prefix means the route is protected.
- `src/services/api/`: API client functions that talk to the FastAPI backend.
- `src/store/`: Zustand stores for global state.

### Zustand Stores (`src/store/`)
- `authStore.ts`: Manages user login/logout state and JWT tokens.
- `analyzerStore.ts`: Manages the state of the email scanning process.
- `employeesStore.ts`: Manages the list of employees/users for the admin panel.
- `rulesStore.ts`: Manages custom detection rules.
- `settingsStore.ts`: Global application settings.

### Route Mapping
**Public Routes:**
- `/` - Landing page
- `/why-us`, `/technology`, `/traditional-vs-modern` - Informational pages
- `/auth/login`, `/auth/register`, `/auth/forgot-password` - Authentication flows
- `/simulation-click` - Phishing simulation landing page

**Protected Routes (Require Authentication):**
- `/dashboard` - Main overview statistics and charts.
- `/inbox` - View received/scanned emails.
- `/inbox/$messageId` - View specific email details.
- `/analyzer` - Upload or paste raw email text to scan it.
- `/analyzer/$id` - View the detailed results of a scan (Trust Score, Threat Score, AI prediction).
- `/rules` - Manage custom detection rules.
- `/settings` - User/System settings.
- `/admin` - Admin dashboard.
- `/admin/employees` - Manage users/employees.

---

## 4. Backend Architecture & Pipeline

The backend processes emails through a strict pipeline inside `backend/main.py`.

### The Core Pipeline Workflow
When an email is submitted to `/scan/text` or `/scan/file`:
1. **Parser (`parser.py`)**: Extracts headers, body, URLs, and attachments.
2. **Feature Extraction (`features.py`)**: Extracts text features, URL risk, and basic heuristics.
3. **AI Prediction (`model.py`)**: Runs DistilBERT on the email body to get a phishing probability (0-100%).
4. **Trust Analyzer (`trust_analyzer.py`)**: Deep checks for SPF, DKIM, DMARC, domain age (RDAP), and spoofing. Computes a **Trust Score** (0-100).
5. **Scorer (`scorer.py`)**: Combines all signals into a final **Threat Score** (0-100).
6. **Database (`database.py`)**: Saves the complete scan result into `phishing.db`.

### Key Backend Files
- `backend/main.py`: The FastAPI app entry point. Defines routes.
- `backend/database.py`: SQLAlchemy setup and query functions.
- `backend/model.py`: Hugging Face model loading and inference logic.
- `backend/trust_analyzer.py`: The most complex module. Parses SPF mechanisms, DMARC policies, and detects typosquatting.

### API Endpoints
- `POST /scan/text`: Submits an email string for analysis.
- `POST /scan/file`: Submits an `.eml` file for analysis.
- `GET /history`: Returns the list of past scans.
- `GET /stats`: Returns aggregated stats (total scans, phishing vs safe counts) for the dashboard.

---

## 5. Development Workflow

### How to Run Locally

**1. Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r ../requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend runs at `http://localhost:8000` (Docs at `/docs`).

**2. Frontend:**
```bash
cd "New 3d Frontend"
npm install
npm run dev
```
Frontend runs at `http://localhost:8080`.

---

## 6. How AI Should Use This Project
- **Documentation Tasks:** Read this file first. If deep backend details are needed, consult `project_context.md`. If frontend routes are needed, consult `src/routeTree.gen.ts`.
- **Refactoring:** Backend is strongly typed with Pydantic. Frontend uses strict TypeScript.
- **Models:** ML model weights are typically excluded from Git. Ensure you mock the model or download the weights locally to run the backend completely.
