import os
import pickle
import logging

logger = logging.getLogger(__name__)

from app.core.config import URL_GUARD_PATH

# Paths
MODEL_DIR = str(URL_GUARD_PATH)
MODEL_PATH = os.path.join(MODEL_DIR, "phishing.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "vectorizer.pkl")

url_guard_active = False
model = None
vectorizer = None

try:
    if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        with open(VECTORIZER_PATH, "rb") as f:
            vectorizer = pickle.load(f)
        
        url_guard_active = True
        logger.info("URL Guard loaded successfully.")
    else:
        logger.warning(f"URL Guard models not found at {MODEL_DIR}. URL Guard will remain inactive.")
except Exception as e:
    logger.error(f"Failed to load URL Guard models: {e}. URL Guard will remain inactive.")
    url_guard_active = False
    model = None
    vectorizer = None

def scan_urls(urls: list) -> dict:
    """
    Scans a list of URLs using the secondary ML model.
    Returns counts and flagged URLs.
    """
    default_result = {
        "checked": 0,
        "flagged": 0,
        "flagged_urls": [],
        "url_guard_active": False
    }

    if not url_guard_active or not urls:
        return default_result

    checked = len(urls)
    flagged = 0
    flagged_urls = []

    try:
        # Transform all URLs at once
        X_urls = vectorizer.transform(urls)
        predictions = model.predict(X_urls)

        for url, pred in zip(urls, predictions):
            if pred == 'bad':
                flagged += 1
                flagged_urls.append(url)

        print(f"      -> URL Guard checked {checked} URL(s)...")
        if flagged > 0:
            print(f"      -> [ALERT] URL Guard flagged {flagged} malicious URL(s)!")
        else:
            print(f"      -> [OK] URL Guard found no threats.")

        return {
            "checked": checked,
            "flagged": flagged,
            "flagged_urls": flagged_urls,
            "url_guard_active": True
        }
    except Exception as e:
        logger.error(f"Error during URL Guard scanning: {e}")
        return default_result
