from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from datetime import datetime, timezone
import json
import logging
import os

logger = logging.getLogger(__name__)

# ============================================================
# DATABASE SETUP
# This creates a file called phishing.db in your project
# SQLite is a simple file-based database — perfect for student projects
# ============================================================

# Use absolute path based on project root to avoid cwd issues
from app.core.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


# ============================================================
# DATABASE TABLE — one row per scanned email
# ============================================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    role = Column(String, default="employee") # "admin" or "employee"
    status = Column(String, default="active") # "active", "suspended", "invited"
    security_score = Column(Integer, default=100) # out of 100
    google_client_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ScanRecord(Base):
    __tablename__ = "scan_results"

    id               = Column(Integer, primary_key=True, index=True)
    user_email       = Column(String, index=True, nullable=True)
    gmail_message_id = Column(String, index=True, nullable=True)
    scanned_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    sender           = Column(String)
    sender_domain    = Column(String)
    subject          = Column(String)
    is_phishing      = Column(Integer)       # 1 = phishing, 0 = legit
    risk_score       = Column(Integer)
    risk_level       = Column(String)
    trust_score      = Column(Integer)       # NEW: 0-100 trust score (higher = safer)
    spf              = Column(String)
    dkim_status      = Column(String)        # NEW: present/missing/aligned
    dmarc            = Column(String)
    domain_age_days  = Column(Integer)       # NEW: domain age in days
    spoofing_detected = Column(Integer)      # NEW: 1 = spoofing found, 0 = clean
    url_count        = Column(Integer)
    attachment_count = Column(Integer)
    attachment_risk  = Column(String)
    flags            = Column(Text)          # stored as JSON string
    trust_analysis   = Column(Text)          # NEW: full JSON trust analysis blob
    url_guard_checked = Column(Integer, nullable=True, default=0)
    url_guard_flagged = Column(Integer, nullable=True, default=0)
    url_guard_flagged_urls = Column(Text, nullable=True) # stored as JSON string
    is_simulation    = Column(Integer, default=0) # 1 = simulation scan, 0 = regular
    simulation_status = Column(String, default="pending") # "pending", "clicked", "reported"
    under_review     = Column(Integer, default=0) # 1 = under review, 0 = resolved/normal


# ============================================================
# CREATE THE TABLE IF IT DOESNT EXIST
# ============================================================

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Auto-migration for URL Guard columns
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN url_guard_checked INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN url_guard_flagged INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN url_guard_flagged_urls TEXT"))
            conn.commit()
    except Exception as e:
        pass

    # Auto-migration for User features
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN user_email TEXT"))
            conn.commit()
    except Exception as e:
        pass

    # Auto-migration for gmail message id
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN gmail_message_id TEXT"))
            conn.commit()
    except Exception as e:
        pass

    # Auto-migration for User status and score
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"))
            conn.execute(text("ALTER TABLE users ADD COLUMN security_score INTEGER DEFAULT 100"))
            conn.commit()
    except Exception as e:
        pass

    # Auto-migration for simulation fields
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN is_simulation INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN simulation_status TEXT DEFAULT 'pending'"))
            conn.commit()
    except Exception as e:
        pass

    # Auto-migration for review queue
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE scan_results ADD COLUMN under_review INTEGER DEFAULT 0"))
            conn.commit()
    except Exception as e:
        pass


# ============================================================
# SAVE A SCAN RESULT TO THE DATABASE
# ============================================================

def save_scan(scan_data: dict, user_email: str = None, gmail_message_id: str = None):
    db = SessionLocal()

    try:
        # Extract trust analysis fields with fallbacks for backward compat
        trust_analysis_data = scan_data.get("trust_analysis", {})
        trust_score = scan_data.get("trust_score", None)
        domain_age_days = None
        dkim_status = None
        spoofing_detected = 0

        if trust_analysis_data:
            domain_age_info = trust_analysis_data.get("domain_age", {})
            domain_age_days = domain_age_info.get("age_days", None)
            if domain_age_days == -1:
                domain_age_days = None

            dkim_info = trust_analysis_data.get("dkim", {})
            if dkim_info.get("dkim_present"):
                dkim_status = "aligned" if dkim_info.get("dkim_aligned") else "present"
            else:
                dkim_status = "missing"

            spoofing_info = trust_analysis_data.get("spoofing", {})
            spoofing_detected = 1 if spoofing_info.get("spoofing_detected") else 0

        record = ScanRecord(
            user_email=user_email,
            gmail_message_id=gmail_message_id,
            sender=scan_data["sender"],
            sender_domain=scan_data["sender_domain"],
            subject=scan_data["subject"],
            is_phishing=1 if scan_data["is_phishing"] else 0,
            risk_score=scan_data["risk_score"],
            risk_level=scan_data["risk_level"],
            trust_score=trust_score,
            spf=scan_data.get("spf", "none"),
            dkim_status=dkim_status,
            dmarc=scan_data.get("dmarc", "none"),
            domain_age_days=domain_age_days,
            spoofing_detected=spoofing_detected,
            url_count=scan_data.get("url_count", 0),
            attachment_count=scan_data.get("attachment_count", 0),
            attachment_risk=scan_data.get("attachment_risk", "safe"),
            flags=json.dumps(scan_data.get("flags", [])),
            trust_analysis=json.dumps(trust_analysis_data) if trust_analysis_data else None,
            url_guard_checked=scan_data.get("url_guard_checked", 0),
            url_guard_flagged=scan_data.get("url_guard_flagged", 0),
            url_guard_flagged_urls=json.dumps(scan_data.get("url_guard_flagged_urls", [])),
        )

        db.add(record)
        db.commit()
        db.refresh(record)
        return record.id

    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        return None

    finally:
        db.close()


# ============================================================
# GET SCAN HISTORY — returns last N scans
# ============================================================

def get_history(limit=20, user_email: str = None):
    db = SessionLocal()

    try:
        query = db.query(ScanRecord)
        if user_email:
            query = query.filter(ScanRecord.user_email == user_email)
            
        records = query.order_by(ScanRecord.scanned_at.desc()).limit(limit).all()

        history = []
        for r in records:
            entry = {
                "id":               r.id,
                "scanned_at":       r.scanned_at.strftime("%Y-%m-%d %H:%M:%S") if r.scanned_at else None,
                "user_email":       r.user_email,
                "sender":           r.sender,
                "sender_domain":    r.sender_domain,
                "subject":          r.subject,
                "is_phishing":      bool(r.is_phishing),
                "risk_score":       r.risk_score,
                "risk_level":       r.risk_level,
                "trust_score":      r.trust_score,
                "spf":              r.spf,
                "dkim_status":      r.dkim_status,
                "dmarc":            r.dmarc,
                "domain_age_days":  r.domain_age_days,
                "spoofing_detected": bool(r.spoofing_detected) if r.spoofing_detected is not None else False,
                "url_count":        r.url_count,
                "attachment_count": r.attachment_count,
                "attachment_risk":  r.attachment_risk,
                "flags":            json.loads(r.flags) if r.flags else [],
                "trust_analysis":   json.loads(r.trust_analysis) if r.trust_analysis else None,
                "url_guard_checked": r.url_guard_checked or 0,
                "url_guard_flagged": r.url_guard_flagged or 0,
                "url_guard_flagged_urls": json.loads(r.url_guard_flagged_urls) if r.url_guard_flagged_urls else [],
                "gmail_message_id": r.gmail_message_id,
            }
            history.append(entry)

        return history

    except Exception as e:
        logger.error(f"Database error: {e}")
        return []

    finally:
        db.close()


# ============================================================
# GET SCAN METRICS — aggregates statistics for dashboard
# ============================================================

def get_stats(user_email: str = None):
    from sqlalchemy import func, case
    from datetime import datetime, timezone
    db = SessionLocal()

    try:
        base_query = db.query(ScanRecord)
        if user_email:
            base_query = base_query.filter(ScanRecord.user_email == user_email)

        total_scans = base_query.count()
        phishing_count = base_query.filter(ScanRecord.is_phishing == 1).count()
        legit_count = base_query.filter(ScanRecord.is_phishing == 0).count()

        # Safe, Suspicious, Human Review, Phishing counts based on risk level
        safe_count = base_query.filter(ScanRecord.risk_level == 'Low Risk').count()
        suspicious_count = base_query.filter(ScanRecord.risk_level == 'Medium Risk').count()
        human_review_count = base_query.filter(ScanRecord.risk_level == 'Human Review Required').count()
        critical_count = base_query.filter(ScanRecord.risk_level == 'Critical Threat').count()

        # Top attacked domains
        top_domains_query = base_query.with_entities(
            ScanRecord.sender_domain,
            func.count(ScanRecord.id).label('cnt')
        ).filter(ScanRecord.is_phishing == 1)\
         .group_by(ScanRecord.sender_domain)\
         .order_by(func.count(ScanRecord.id).desc())\
         .limit(5)\
         .all()
        
        top_domains = [{"domain": d[0], "count": d[1]} for d in top_domains_query if d[0]]

        # Recent alerts (last 5 phishing scans)
        recent_records = base_query.filter(ScanRecord.is_phishing == 1)\
                           .order_by(ScanRecord.scanned_at.desc())\
                           .limit(5)\
                           .all()
        recent_alerts = []
        for r in recent_records:
            recent_alerts.append({
                "id": r.id,
                "sender": r.sender,
                "subject": r.subject,
                "risk_score": r.risk_score,
                "scanned_at": r.scanned_at.strftime("%Y-%m-%d %H:%M:%S") if r.scanned_at else None
            })

        # Threat trends (last 14 days)
        trends_query = base_query.with_entities(
            func.date(ScanRecord.scanned_at).label('date'),
            func.count(ScanRecord.id).label('total'),
            func.sum(ScanRecord.is_phishing).label('phishing'),
            func.sum(case((ScanRecord.risk_level == 'Low Risk', 1), else_=0)).label('safe'),
            func.sum(case((ScanRecord.risk_level == 'Medium Risk', 1), else_=0)).label('suspicious'),
            func.sum(case((ScanRecord.risk_level == 'Human Review Required', 1), else_=0)).label('human_review')
        ).group_by(func.date(ScanRecord.scanned_at))\
         .order_by(func.date(ScanRecord.scanned_at).desc())\
         .limit(14)\
         .all()
         
        trends = []
        per_day = []
        today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        scans_today = 0

        for t in reversed(trends_query):
            date_str = t[0]
            total_val = t[1] or 0
            phishing_val = int(t[2]) if t[2] is not None else 0
            safe_val = int(t[3]) if t[3] is not None else 0
            susp_val = int(t[4]) if t[4] is not None else 0
            hr_val = int(t[5]) if t[5] is not None else 0

            if date_str == today_str:
                scans_today = total_val

            trends.append({
                "date": date_str,
                "total": total_val,
                "phishing": phishing_val,
                "safe": safe_val,
                "suspicious": susp_val,
                "human_review": hr_val
            })
            
            per_day.append({
                "date": date_str,
                "safe": safe_val,
                "suspicious": susp_val,
                "phishing": phishing_val,
                "human_review": hr_val
            })

        user_score = 100
        user_status = "active"
        if user_email:
            user_rec = db.query(User).filter_by(email=user_email).first()
            if user_rec:
                user_score = getattr(user_rec, "security_score", 100) if getattr(user_rec, "security_score", 100) is not None else 100
                user_status = getattr(user_rec, "status", "active") or "active"

        # Calculate real average risk score of all matching scan records
        avg_risk_query = base_query.with_entities(func.avg(ScanRecord.risk_score)).first()
        avg_risk_score = round(avg_risk_query[0]) if avg_risk_query and avg_risk_query[0] is not None else 0

        return {
            "total_scans": total_scans,
            "scans_today": scans_today,
            "safe_count": safe_count,
            "suspicious_count": suspicious_count,
            "human_review_count": human_review_count,
            "critical_count": critical_count,
            "phishing_count": phishing_count,
            "legit_count": legit_count,
            "top_attacked_domains": top_domains,
            "recent_alerts": recent_alerts,
            "trends": trends[-7:],  # keep trends to last 7 days for the normal dashboard
            "per_day": per_day,
            "security_score": user_score,
            "status": user_status,
            "avg_risk_score": avg_risk_score
        }

    except Exception as e:
        logger.error(f"Error compiling database stats: {e}")
        return {
            "total_scans": 0,
            "safe_count": 0,
            "suspicious_count": 0,
            "phishing_count": 0,
            "legit_count": 0,
            "critical_count": 0,
            "top_attacked_domains": [],
            "recent_alerts": [],
            "trends": []
        }

    finally:
        db.close()


# ============================================================
# CUSTOM USER RULES (WHITELIST/BLACKLIST)
# ============================================================

class CustomRule(Base):
    __tablename__ = "custom_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    pattern = Column(String)       # e.g., 'sender@domain.com' or 'domain.com'
    rule_type = Column(String)     # 'email' or 'domain'
    status = Column(String)        # 'safe' or 'spam'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

def add_custom_rule(user_email: str, pattern: str, rule_type: str, status: str):
    db = SessionLocal()
    try:
        # Optional: check if exists first
        existing = db.query(CustomRule).filter_by(user_email=user_email, pattern=pattern, rule_type=rule_type).first()
        if existing:
            existing.status = status
        else:
            rule = CustomRule(
                user_email=user_email,
                pattern=pattern.lower(),
                rule_type=rule_type.lower(),
                status=status.lower()
            )
            db.add(rule)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding custom rule: {e}")
        return False
    finally:
        db.close()

def get_custom_rules(user_email: str):
    db = SessionLocal()
    try:
        rules = db.query(CustomRule).filter_by(user_email=user_email).all()
        return [
            {
                "id": r.id,
                "user_email": r.user_email,
                "pattern": r.pattern,
                "rule_type": r.rule_type,
                "status": r.status,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else None
            } for r in rules
        ]
    except Exception as e:
        logger.error(f"Error fetching custom rules: {e}")
        return []
    finally:
        db.close()

def delete_custom_rule(rule_id: int, user_email: str):
    db = SessionLocal()
    try:
        rule = db.query(CustomRule).filter_by(id=rule_id, user_email=user_email).first()
        if rule:
            db.delete(rule)
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting custom rule: {e}")
        return False
    finally:
        db.close()

def check_custom_rules(user_email: str, sender_email: str, sender_domain: str):
    """
    Returns 'safe' or 'spam' if a custom rule matches, else None.
    Prioritizes email rules over domain rules if both exist.
    """
    if not user_email:
        return None
        
    db = SessionLocal()
    try:
        sender_email = sender_email.lower()
        sender_domain = sender_domain.lower()
        
        # Check specific email match
        email_rule = db.query(CustomRule).filter_by(
            user_email=user_email,
            pattern=sender_email,
            rule_type='email'
        ).first()
        
        if email_rule:
            return email_rule.status
            
        # Check domain match
        domain_rule = db.query(CustomRule).filter_by(
            user_email=user_email,
            pattern=sender_domain,
            rule_type='domain'
        ).first()
        
        if domain_rule:
            return domain_rule.status
            
        return None
    except Exception as e:
        logger.error(f"Error checking custom rules: {e}")
        return None
    finally:
        db.close()


# ============================================================
# USER MANAGEMENT
# ============================================================

def create_user(email: str, role: str = "employee"):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
        if user:
            return user
        user = User(email=email, role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {e}")
        return None
    finally:
        db.close()

def get_users():
    db = SessionLocal()
    try:
        # Subquery to aggregate scans and threats per user
        from sqlalchemy import func
        
        stats_query = db.query(
            ScanRecord.user_email,
            func.count(ScanRecord.id).label('scans_count'),
            func.sum(ScanRecord.is_phishing).label('threats_caught')
        ).group_by(ScanRecord.user_email).all()
        
        stats_map = {row[0]: {"scans_count": row[1] or 0, "threats_caught": row[2] or 0} for row in stats_query}

        users = db.query(User).all()
        return [
            {
                "id": u.id,
                "email": u.email,
                "role": u.role,
                "status": getattr(u, "status", "active") or "active",
                "security_score": getattr(u, "security_score", 100) if getattr(u, "security_score", 100) is not None else 100,
                "google_client_id": u.google_client_id,
                "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else None,
                "scans_count": stats_map.get(u.email, {}).get("scans_count", 0),
                "threats_caught": stats_map.get(u.email, {}).get("threats_caught", 0)
            } for u in users
        ]
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        return []
    finally:
        db.close()

def get_user_by_email(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
        if user:
            return {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "status": getattr(user, "status", "active") or "active",
                "security_score": getattr(user, "security_score", 100) if getattr(user, "security_score", 100) is not None else 100,
                "google_client_id": user.google_client_id
            }
        return None
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return None
    finally:
        db.close()

def update_user_credentials(email: str, google_client_id: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
        if user:
            user.google_client_id = google_client_id
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user credentials: {e}")
        return False
    finally:
        db.close()

def update_user_status(email: str, status: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
        if user:
            user.status = status
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user status: {e}")
        return False
    finally:
        db.close()

def delete_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
        if user:
            db.delete(user)
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting user: {e}")
        return False
    finally:
        db.close()

def trigger_simulation(email: str, template: str):
    db = SessionLocal()
    try:
        # Templates definition
        templates = {
            "bank": {
                "sender": '"Chase Security Alert" <alerts@chase-secure-update.com>',
                "subject": "URGENT: Suspicious activity on your credit card",
                "body_text": "We detected unauthorized transactions on your account. Please verify your identity immediately to prevent service disruption: http://localhost:8080/simulation-click?scan_id=SCAN_ID",
                "risk_score": 85,
                "risk_level": "Critical Threat",
                "trust_score": 15
            },
            "office": {
                "sender": '"IT Helpdesk" <support@office365-verify.com>',
                "subject": "ACTION REQUIRED: Office 365 Password Expiration Notice",
                "body_text": "Your corporate Office 365 password will expire in 24 hours. Keep your current password by verifying here: http://localhost:8080/simulation-click?scan_id=SCAN_ID",
                "risk_score": 75,
                "risk_level": "High Risk",
                "trust_score": 25
            },
            "gift": {
                "sender": '"HR Rewards" <rewards@company-incentive.com>',
                "subject": "Exclusive: Claim your $500 Amazon Gift Card!",
                "body_text": "Congratulations! You have been selected to receive a $500 Amazon Gift Card as part of our employee recognition program. Claim your reward code here: http://localhost:8080/simulation-click?scan_id=SCAN_ID",
                "risk_score": 90,
                "risk_level": "Critical Threat",
                "trust_score": 10
            }
        }
        
        t = templates.get(template, templates["office"])
        
        # Create a ScanRecord without a final scan_id to get its ID,
        # then we update the body_text and body_html with the correct scan ID in the link.
        record = ScanRecord(
            user_email=email,
            sender=t["sender"],
            sender_domain=t["sender"].split("<")[-1].replace(">", "").split("@")[-1],
            subject=t["subject"],
            is_phishing=1,
            risk_score=t["risk_score"],
            risk_level=t["risk_level"],
            trust_score=t["trust_score"],
            spf="fail",
            dkim_status="missing",
            dmarc="none",
            domain_age_days=12,
            spoofing_detected=1,
            url_count=1,
            attachment_count=0,
            attachment_risk="safe",
            flags=json.dumps(["AI model detected typosquatted domain", "Urgent security threat notification"]),
            is_simulation=1,
            simulation_status="pending",
            under_review=0
        )
        
        db.add(record)
        db.commit()
        db.refresh(record)
        
        # Update the links inside the simulation with the real DB record ID
        real_body = t["body_text"].replace("SCAN_ID", str(record.id))
        
        # Formulate HTML body
        html_template = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #0b0f19; color: #f3f4f6;">
            <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">{t['subject']}</h2>
            <p style="line-height: 1.6; color: #d1d5db;">{real_body}</p>
            <div style="margin: 30px 0; text-align: center;">
                <a href="http://localhost:8080/simulation-click?scan_id={record.id}" target="_blank" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);">Take Action Now</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #374151; margin-top: 35px;" />
            <p style="font-size: 11px; color: #9ca3af; text-align: center;">This is an automated system security notification.</p>
        </div>
        """
        
        record.trust_analysis = json.dumps({
            "simulation": True,
            "template": template,
            "body_text": real_body,
            "body_html": html_template
        })
        
        db.commit()
        return {
            "id": record.id,
            "subject": record.subject,
            "sender": record.sender,
            "is_simulation": bool(record.is_simulation),
            "simulation_status": record.simulation_status
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating simulation: {e}")
        return None
    finally:
        db.close()

def update_simulation_action(scan_id: int, action: str):
    db = SessionLocal()
    try:
        record = db.query(ScanRecord).filter_by(id=scan_id, is_simulation=1).first()
        if not record:
            return None
        
        # If action is clicked
        if action == "click":
            if record.simulation_status == "pending":
                record.simulation_status = "clicked"
                # Deduct score from user
                user = db.query(User).filter_by(email=record.user_email).first()
                if user:
                    user.security_score = max(0, (user.security_score or 100) - 20)
                db.commit()
        # If action is reported
        elif action == "report":
            if record.simulation_status in ("pending", "clicked"):
                record.simulation_status = "reported"
                user = db.query(User).filter_by(email=record.user_email).first()
                if user:
                    # Give +10 if they report (max 100).
                    user.security_score = min(100, (user.security_score or 100) + 10)
                db.commit()
                
        return {
            "id": record.id,
            "simulation_status": record.simulation_status
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating simulation action: {e}")
        return None
    finally:
        db.close()

def mark_for_review(scan_id: int):
    db = SessionLocal()
    try:
        record = db.query(ScanRecord).filter_by(id=scan_id).first()
        if record:
            record.under_review = 1
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        logger.error(f"Error marking for review: {e}")
        return False
    finally:
        db.close()

def resolve_review(scan_id: int, verdict: str):
    db = SessionLocal()
    try:
        record = db.query(ScanRecord).filter_by(id=scan_id).first()
        if record:
            record.under_review = 0
            if verdict == "safe":
                record.is_phishing = 0
                record.risk_level = "Low Risk"
                record.risk_score = 10
                record.trust_score = 90
            elif verdict == "phishing":
                record.is_phishing = 1
                record.risk_level = "Critical Threat"
                record.risk_score = 95
                record.trust_score = 5
            db.commit()
            return {
                "id": record.id,
                "is_phishing": bool(record.is_phishing),
                "risk_level": record.risk_level
            }
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Error resolving review: {e}")
        return None
    finally:
        db.close()

def get_pending_reviews():
    db = SessionLocal()
    try:
        records = db.query(ScanRecord).filter_by(under_review=1).order_by(ScanRecord.scanned_at.desc()).all()
        result = []
        for r in records:
            result.append({
                "id":               r.id,
                "scanned_at":       r.scanned_at.strftime("%Y-%m-%d %H:%M:%S") if r.scanned_at else None,
                "user_email":       r.user_email,
                "sender":           r.sender,
                "sender_domain":    r.sender_domain,
                "subject":          r.subject,
                "is_phishing":      bool(r.is_phishing),
                "risk_score":       r.risk_score,
                "risk_level":       r.risk_level,
                "trust_score":      r.trust_score,
                "url_count":        r.url_count,
                "attachment_count": r.attachment_count,
            })
        return result
    except Exception as e:
        logger.error(f"Error fetching pending reviews: {e}")
        return []
    finally:
        db.close()