from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging
import json

from app.services.parser import parse_email
from app.services.features import extract_all_features
from app.services.scorer import compute_score
from app.services.trust_analyzer import run_trust_analysis
from app.ml.classifier import predict_phishing
from app.ml.url_guard import scan_urls
from app.core.websocket import manager
from app.database import (
    save_scan, get_history, mark_for_review, resolve_review, get_pending_reviews, SessionLocal, ScanRecord
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================================
# REQUEST & RESPONSE MODELS
# ============================================================

class EmailTextRequest(BaseModel):
    email_text: str
    user_email: Optional[str] = None
    gmail_message_id: Optional[str] = None

class ScanResult(BaseModel):
    scan_id:              int
    is_phishing:          bool
    phishing_probability: float
    risk_score:           int
    risk_level:           str
    trust_score:          int
    trust_analysis:       dict
    flags:                list
    sender:               str
    subject:              str
    sender_domain:        str
    url_count:            int
    attachment_count:     int
    attachment_risk:      str
    spf:                  str
    dmarc:                str
    url_guard_checked:    int = 0
    url_guard_flagged:    int = 0
    url_guard_flagged_urls: list = []
    url_guard_active:     bool = False
    user_email:           Optional[str] = None
    gmail_message_id:     Optional[str] = None

class ReviewResolveRequest(BaseModel):
    verdict: str


# ============================================================
# HELPER — runs the full pipeline on raw email text
# ============================================================

def run_pipeline(raw_email: str, user_email: Optional[str] = None, gmail_message_id: Optional[str] = None):
    print("\n" + "="*60)
    print(f"🚀 INITIATING FULL ANALYSIS PIPELINE")
    print(f"   Message ID: {gmail_message_id}")
    print("="*60)

    print("[1/5] Extracting content and heuristic features...")
    parsed = parse_email(raw_email)
    features = extract_all_features(parsed)

    print("[2/5] Running URL Guard ML model...")
    url_guard_result = scan_urls(parsed.get("urls", []))

    print("[3/5] Running Improved_distilbert NLP model...")
    probs = predict_phishing(parsed["body_text"])
    ai_probability = probs[1]
    print(f"      -> DistilBERT Probability: {round(ai_probability*100, 2)}%")

    print("[4/5] Running Authentication & Trust Analysis (SPF/DKIM/DMARC/Domain Age)...")
    trust_analysis = run_trust_analysis(parsed, ai_probability, features)

    print("[5/5] Calculating Final Risk Score (Average)...")
    result = compute_score(ai_probability, features, trust_analysis, url_guard_result, urls=parsed.get("urls", []), user_email=user_email)
    print(f"      -> Final Average Risk Score: {result['score']}/100 ({result['risk_level']})")
    print("="*60 + "\n")

    spf_display = trust_analysis.get("spf", {}).get("spf_mechanism", features.get("spf", "none"))
    dmarc_display = trust_analysis.get("dmarc", {}).get("policy", features.get("dmarc", "none"))

    scan_data = {
        "is_phishing":          result["score"] > 55,
        "phishing_probability": round(ai_probability * 100, 2),
        "risk_score":           result["score"],
        "risk_level":           result["risk_level"],
        "trust_score":          trust_analysis["trust_score"],
        "trust_analysis":       trust_analysis,
        "flags":                result["flags"],
        "sender":               parsed["sender"],
        "subject":              parsed["subject"],
        "sender_domain":        parsed["sender_domain"],
        "url_count":            features["url_count"],
        "attachment_count":     features["attachment_count"],
        "attachment_risk":      features["attachment_risk"],
        "spf":                  spf_display,
        "dmarc":                dmarc_display,
        "url_guard_checked":    url_guard_result["checked"],
        "url_guard_flagged":    url_guard_result["flagged"],
        "url_guard_flagged_urls": url_guard_result["flagged_urls"],
        "url_guard_active":     url_guard_result["url_guard_active"],
        "user_email":           user_email,
        "gmail_message_id":     gmail_message_id,
    }

    saved_id = save_scan(scan_data, user_email, gmail_message_id)
    scan_data["scan_id"] = saved_id

    if not scan_data.get("flags"):
        scan_data["flags"] = []

    return scan_data


# ============================================================
# API ENDPOINTS
# ============================================================

@router.post("/api/v1/scan", response_model=ScanResult)
async def scan_email(req: EmailTextRequest):
    try:
        result = run_pipeline(req.email_text, req.user_email, req.gmail_message_id)
        await manager.broadcast({
            "type": "NEW_SCAN",
            "data": result
        })
        return result
    except Exception as e:
        logger.error(f"Error in scan_email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scan/text", response_model=ScanResult)
def scan_text(data: EmailTextRequest):
    if not data.email_text.strip():
        raise HTTPException(status_code=400, detail="Email text cannot be empty")
    return run_pipeline(data.email_text, data.user_email, data.gmail_message_id)

@router.post("/scan/file", response_model=ScanResult)
async def scan_file(file: UploadFile = File(...)):
    content = await file.read()
    raw_email = content.decode("utf-8", errors="ignore")
    if not raw_email.strip():
        raise HTTPException(status_code=400, detail="Could not read file or file is empty")
    return run_pipeline(raw_email)

@router.get("/history")
def scan_history(limit: int = 20, user_email: Optional[str] = None):
    return get_history(limit, user_email)

@router.get("/scan/{scan_id}")
def get_scan_details(scan_id: int):
    db = SessionLocal()
    try:
        record = db.query(ScanRecord).filter_by(id=scan_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Scan record not found")
        
        trust_analysis_data = {}
        if record.trust_analysis:
            try:
                trust_analysis_data = json.loads(record.trust_analysis)
            except:
                pass

        body_text = record.subject
        body_html = None
        if trust_analysis_data and "simulation" in trust_analysis_data:
            body_text = trust_analysis_data.get("body_text", body_text)
            body_html = trust_analysis_data.get("body_html", None)

        return {
            "id": str(record.id),
            "scan_id": record.id,
            "scanned_at": record.scanned_at.strftime("%Y-%m-%d %H:%M:%S") if record.scanned_at else None,
            "user_email": record.user_email,
            "sender": record.sender,
            "sender_domain": record.sender_domain,
            "subject": record.subject,
            "is_phishing": bool(record.is_phishing),
            "risk_score": record.risk_score,
            "risk_level": record.risk_level,
            "trust_score": record.trust_score,
            "spf": record.spf,
            "dkim_status": record.dkim_status,
            "dmarc": record.dmarc,
            "domain_age_days": record.domain_age_days,
            "spoofing_detected": bool(record.spoofing_detected),
            "url_count": record.url_count,
            "attachment_count": record.attachment_count,
            "attachment_risk": record.attachment_risk,
            "flags": json.loads(record.flags) if record.flags else [],
            "trust_analysis": trust_analysis_data,
            "url_guard_checked": record.url_guard_checked or 0,
            "url_guard_flagged": record.url_guard_flagged or 0,
            "url_guard_flagged_urls": json.loads(record.url_guard_flagged_urls) if record.url_guard_flagged_urls else [],
            "gmail_message_id": record.gmail_message_id,
            "is_simulation": bool(record.is_simulation) if hasattr(record, "is_simulation") else False,
            "simulation_status": getattr(record, "simulation_status", "pending"),
            "body_text": body_text,
            "body_html": body_html
        }
    finally:
        db.close()

@router.post("/scan/{scan_id}/review")
def flag_for_review(scan_id: int):
    success = mark_for_review(scan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"message": "Scan flagged for admin review"}

@router.post("/scan/{scan_id}/resolve")
def resolve_scan_review(scan_id: int, data: ReviewResolveRequest):
    record = resolve_review(scan_id, data.verdict)
    if not record:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {
        "message": f"Scan resolved as {data.verdict}",
        "is_phishing": bool(record["is_phishing"]),
        "risk_level": record["risk_level"]
    }

@router.get("/admin/reviews")
def list_pending_reviews():
    return get_pending_reviews()
