import os
from pathlib import Path

# backend/app/core/config.py is 4 levels deep from root
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

ML_MODELS_DIR = BASE_DIR / "ml-models"
DISTILBERT_PATH = ML_MODELS_DIR / "distilbert"
URL_GUARD_PATH = ML_MODELS_DIR / "url-guard"
DATABASE_PATH = BASE_DIR / "database" / "phishing.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

PORT = int(os.getenv("PORT", 8000))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
