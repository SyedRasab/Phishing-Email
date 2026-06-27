# PhishGuard — AI-Powered Phishing Email Detection

Multi-layer phishing detection combining DistilBERT NLP, URL threat 
classification, and real-time DNS verification.

## Tech Stack
- Backend: FastAPI + PyTorch + Scikit-learn + SQLite
- Frontend: React 19 + TanStack Router + Zustand + Three.js

## Quick Start

### Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

### Frontend
cd frontend
npm install
npm run dev

## Environment Setup
Copy frontend/.env.local.example → frontend/.env.local
Copy backend/.env.example → backend/.env
Fill in your Google OAuth Client ID.

## Architecture
See brain.md for complete system documentation.
See docs/architecture.md for data flow diagrams.
