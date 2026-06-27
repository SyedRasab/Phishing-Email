import re
import dns.resolver
import urllib.request
import json
from datetime import datetime
from difflib import SequenceMatcher


# ============================================================
# LISTS WE CHECK AGAINST
# ============================================================

URGENCY_WORDS = [
    "urgent", "immediately", "action required", "verify now",
    "suspended", "expire", "limited time", "click here now",
    "act now", "warning", "alert", "your account", "confirm now"
]

CREDENTIAL_WORDS = [
    "password", "username", "login", "verify account",
    "enter your details", "confirm your identity", "social security",
    "credit card", "bank account", "pin number"
]

MONEY_WORDS = [
    "wire transfer", "payment required", "invoice", "you have won",
    "lottery", "prize", "million dollars", "inheritance", "fund transfer"
]

SUSPICIOUS_TLDS = [
    ".xyz", ".top", ".click", ".download", ".stream",
    ".gq", ".cf", ".tk", ".ml", ".ga", ".work", ".party"
]

KNOWN_BRANDS = [
    "paypal", "amazon", "apple", "microsoft", "google",
    "netflix", "facebook", "instagram", "twitter", "bank",
    "ebay", "dropbox", "linkedin", "whatsapp"
]

HIGH_RISK_EXTENSIONS = [
    ".exe", ".bat", ".js", ".vbs", ".ps1",
    ".cmd", ".scr", ".pif", ".com"
]

MEDIUM_RISK_EXTENSIONS = [
    ".docm", ".xlsm", ".zip", ".rar",
    ".iso", ".img", ".jar"
]


# ============================================================
# A. TEXT FEATURES
# ============================================================

def extract_text_features(body_text):

    body_lower = body_text.lower()

    urgency_count = sum(1 for word in URGENCY_WORDS if word in body_lower)
    credential_count = sum(1 for word in CREDENTIAL_WORDS if word in body_lower)
    money_count = sum(1 for word in MONEY_WORDS if word in body_lower)

    total_chars = len(body_text)
    caps_count = sum(1 for c in body_text if c.isupper())
    caps_ratio = caps_count / total_chars if total_chars > 0 else 0

    return {
        "urgency_count": urgency_count,
        "has_credential_request": credential_count > 0,
        "has_money_mention": money_count > 0,
        "exclamation_count": body_text.count("!"),
        "caps_ratio": round(caps_ratio, 3)
    }


# ============================================================
# B. URL FEATURES
# ============================================================

def extract_url_features(urls):

    if not urls:
        return {
            "url_count": 0,
            "has_suspicious_tld": False,
            "has_ip_based_url": False,
            "has_shortened_url": False,
            "has_long_url": False
        }

    has_suspicious_tld = False
    has_ip_based_url = False
    has_shortened_url = False
    has_long_url = False

    shorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly"]

    for url in urls:

        # Check for IP-based URL like http://192.168.1.1/login
        ip_pattern = r'https?://\d+\.\d+\.\d+\.\d+'
        if re.match(ip_pattern, url):
            has_ip_based_url = True

        # Check suspicious TLD
        for tld in SUSPICIOUS_TLDS:
            if tld in url.lower():
                has_suspicious_tld = True

        # Check shortened URLs
        for shortener in shorteners:
            if shortener in url.lower():
                has_shortened_url = True

        # Long URLs are suspicious
        if len(url) > 100:
            has_long_url = True

    return {
        "url_count": len(urls),
        "has_suspicious_tld": has_suspicious_tld,
        "has_ip_based_url": has_ip_based_url,
        "has_shortened_url": has_shortened_url,
        "has_long_url": has_long_url
    }


# ============================================================
# C. EMAIL AUTHENTICATION (SPF, DKIM, DMARC)
# ============================================================

def check_email_auth(sender_domain):

    results = {
        "spf": "none",
        "dmarc": "none"
    }

    if not sender_domain:
        return results

    # Check SPF
    try:
        answers = dns.resolver.resolve(sender_domain, "TXT", lifetime=5)
        for record in answers:
            txt = record.to_text().lower()
            if "v=spf1" in txt:
                if "~all" in txt or "-all" in txt:
                    results["spf"] = "pass"
                else:
                    results["spf"] = "fail"
    except:
        results["spf"] = "fail"

    # Check DMARC
    try:
        dmarc_domain = "_dmarc." + sender_domain
        answers = dns.resolver.resolve(dmarc_domain, "TXT", lifetime=5)
        for record in answers:
            if "v=dmarc1" in record.to_text().lower():
                results["dmarc"] = "pass"
    except:
        results["dmarc"] = "fail"

    return results


# ============================================================
# D. DOMAIN AGE
# ============================================================

def check_domain_age(sender_domain):

    if not sender_domain:
        return {"age_days": -1, "age_risk": "unknown"}

    try:
        url = f"https://rdap.org/domain/{sender_domain}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read())

        for event in data.get("events", []):
            if event.get("eventAction") == "registration":
                date_str = event["eventDate"][:10]
                reg_date = datetime.strptime(date_str, "%Y-%m-%d")
                age_days = (datetime.now() - reg_date).days

                if age_days < 30:
                    risk = "high"
                elif age_days < 180:
                    risk = "medium"
                else:
                    risk = "low"

                return {"age_days": age_days, "age_risk": risk}

    except:
        pass

    return {"age_days": -1, "age_risk": "unknown"}


# ============================================================
# E. SPOOFING DETECTION
# ============================================================

def check_spoofing(sender, reply_to, return_path, body_text):

    flags = []

    # Check if reply-to is different from sender domain
    if reply_to and sender:
        sender_domain = sender.split("@")[-1].strip(">") if "@" in sender else ""
        reply_domain = reply_to.split("@")[-1].strip(">") if "@" in reply_to else ""
        if sender_domain and reply_domain and sender_domain != reply_domain:
            flags.append("reply_to_mismatch")

    # Check if return path is different from sender
    if return_path and sender:
        sender_domain = sender.split("@")[-1].strip(">") if "@" in sender else ""
        return_domain = return_path.split("@")[-1].strip(">") if "@" in return_path else ""
        if sender_domain and return_domain and sender_domain != return_domain:
            flags.append("return_path_mismatch")

    # Check if email mentions a brand but sender domain doesnt match
    body_lower = body_text.lower()
    for brand in KNOWN_BRANDS:
        if brand in body_lower:
            sender_lower = sender.lower()
            if brand not in sender_lower:
                flags.append(f"brand_impersonation_{brand}")
                break

    return {
        "spoofing_flags": flags,
        "has_spoofing": len(flags) > 0
    }


# ============================================================
# F. TYPOSQUATTING
# ============================================================

def check_typosquatting(sender_domain):

    if not sender_domain:
        return {"is_typosquatting": False, "matched_brand": ""}

    domain_name = sender_domain.split(".")[0].lower()

    for brand in KNOWN_BRANDS:
        ratio = SequenceMatcher(None, domain_name, brand).ratio()
        # Similar but not identical - classic typosquatting
        if 0.65 < ratio < 1.0:
            return {"is_typosquatting": True, "matched_brand": brand}

    return {"is_typosquatting": False, "matched_brand": ""}


# ============================================================
# G. ATTACHMENT FEATURES
# ============================================================

def check_attachments(attachments):

    if not attachments:
        return {"attachment_count": 0, "attachment_risk": "safe"}

    risk = "safe"

    for att in attachments:
        filename = att["filename"].lower()
        ext = ""
        if "." in filename:
            ext = "." + filename.split(".")[-1]

        if ext in HIGH_RISK_EXTENSIONS:
            risk = "high"
        elif ext in MEDIUM_RISK_EXTENSIONS:
            if risk != "high":
                risk = "medium"

    return {
        "attachment_count": len(attachments),
        "attachment_risk": risk
    }


# ============================================================
# MAIN FUNCTION - runs all features together
# ============================================================

def extract_all_features(parsed_email):

    text_features = extract_text_features(parsed_email["body_text"])
    url_features = extract_url_features(parsed_email["urls"])
    auth_features = check_email_auth(parsed_email["sender_domain"])
    domain_age = check_domain_age(parsed_email["sender_domain"])
    spoofing = check_spoofing(
        parsed_email["sender"],
        parsed_email["reply_to"],
        parsed_email["return_path"],
        parsed_email["body_text"]
    )
    typosquatting = check_typosquatting(parsed_email["sender_domain"])
    attachment_features = check_attachments(parsed_email["attachments"])

    # Combine everything into one dictionary
    all_features = {}
    all_features.update(text_features)
    all_features.update(url_features)
    all_features.update(auth_features)
    all_features.update(domain_age)
    all_features.update(spoofing)
    all_features.update(typosquatting)
    all_features.update(attachment_features)

    return all_features
