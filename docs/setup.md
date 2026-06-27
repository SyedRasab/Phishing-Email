# Developer Setup & Local Configuration

Follow these steps to set up the PhishGuard application locally.

## Prerequisites
- **Python**: version 3.11 or higher
- **Node.js**: version 18 or higher (using npm)

---

## 1. Backend Setup
1. Change directory to backend:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```
4. Copy the environment variables:
   ```bash
   copy .env.example .env
   ```
5. Run the dev server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

## 2. Frontend Setup
1. Change directory to frontend:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Copy local environment variables:
   ```bash
   copy .env.local.example .env.local
   ```
4. Run the development build:
   ```bash
   npm run dev
   ```
5. Open browser at `http://localhost:5173`.
