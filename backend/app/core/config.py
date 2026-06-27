from pathlib import Path
import os

# Detect if running on Railway
IS_RAILWAY = os.getenv("RAILWAY_ENVIRONMENT") is not None

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

# ML Models path
if IS_RAILWAY:
    ML_MODELS_DIR = Path(os.getenv("ML_MODELS_DIR", "/app/ml-models"))
else:
    ML_MODELS_DIR = Path(os.getenv("ML_MODELS_DIR", str(BASE_DIR / "ml-models")))

DISTILBERT_PATH = ML_MODELS_DIR / "distilbert"
URL_GUARD_PATH = ML_MODELS_DIR / "url-guard"

# Database path
if IS_RAILWAY:
    DATABASE_PATH = Path(os.getenv("DATABASE_PATH", "/app/database/phishing.db"))
else:
    DATABASE_PATH = Path(os.getenv("DATABASE_PATH", 
                         str(BASE_DIR / "database" / "phishing.db")))

DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
