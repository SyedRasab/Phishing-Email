# ============================================================
# THREAT SCORING ENGINE
# Uses a straight average of 6 core components as requested by user.
# Total possible points = 100
# ============================================================

def compute_score(ai_probability, features, trust_analysis=None, url_guard=None, urls=None, user_email=None):
    """
    Compute threat score (0-100, higher = more dangerous) using a straight average.
    """
    from app.database import check_custom_rules
    
    # Check custom rules first if user_email is provided
    if user_email:
        sender_domain_cleaned = ""
        if trust_analysis and "domain_age" in trust_analysis:
            sender_domain_cleaned = trust_analysis["domain_age"].get("domain", "").lower()
        if not sender_domain_cleaned:
            sender_domain_cleaned = features.get("sender_domain", "").lower()
            
        sender_email_cleaned = features.get("sender", "").lower()
        
        custom_status = check_custom_rules(user_email, sender_email_cleaned, sender_domain_cleaned)
        if custom_status == "safe":
            return {
                "score": 10,
                "risk_level": "Low Risk",
                "flags": ["[Override] Sender/Domain marked as Safe by User"]
            }
        elif custom_status == "spam":
            return {
                "score": 90,
                "risk_level": "Critical Threat",
                "flags": ["[Override] Sender/Domain marked as Spam by User"]
            }

    flags = []

    # 1. AI Text Risk (0-100)
    ai_risk = round(ai_probability * 100)
    
    # Check if domain is trusted (reputation list or verified sender)
    is_trusted = False
    if trust_analysis and isinstance(trust_analysis, dict):
        is_trusted = trust_analysis.get("sender_reputation", {}).get("is_trusted", False)
    if not is_trusted:
        try:
            from app.services.trust_analyzer import is_trusted_domain
            sender_domain = features.get("sender_domain", "")
            if sender_domain:
                is_trusted = is_trusted_domain(sender_domain)
        except Exception:
            pass

    if is_trusted:
        ai_risk = round(ai_risk * 0.5)

    if ai_risk > 70:
        flags.append(f"AI model detected phishing patterns ({ai_risk}% probability)")

    # 2. URL Guard Risk (0 or 100)
    url_guard_risk = 0
    if url_guard and url_guard.get("url_guard_active") and url_guard.get("flagged", 0) > 0:
        url_guard_risk = 100
        flags.append(f"URL Guard: {url_guard['flagged']} of {url_guard['checked']} link(s) match known phishing URL patterns")

    # 3. SPF Risk (0 or 100)
    spf_risk = 0
    if trust_analysis and "spf" in trust_analysis:
        if trust_analysis["spf"].get("risk", "UNKNOWN") in ("HIGH", "CRITICAL", "MEDIUM"):
            spf_risk = 100
            flags.append(f"SPF validation failed — mechanism: {trust_analysis['spf'].get('spf_mechanism', 'none')}")
    elif features.get("spf") == "fail":
        spf_risk = 100
        flags.append("SPF validation failed — sender address cannot be verified")

    # 4. DMARC Risk (0 or 100)
    dmarc_risk = 0
    if trust_analysis and "dmarc" in trust_analysis:
        if trust_analysis["dmarc"].get("risk", "UNKNOWN") in ("HIGH", "MEDIUM"):
            dmarc_risk = 100
            flags.append(f"DMARC validation failed or partial enforcement")
    elif features.get("dmarc") == "fail":
        dmarc_risk = 100
        flags.append("DMARC validation failed — no anti-spoofing policy on this domain")

    # 5. DKIM Risk (0 or 100)
    dkim_risk = 0
    if trust_analysis and "dkim" in trust_analysis:
        if trust_analysis["dkim"].get("risk", "UNKNOWN") in ("HIGH", "MEDIUM"):
            dkim_risk = 100
            flags.append("DKIM signature missing, invalid, or unaligned")

    # 6. Domain Age Risk (0, 50, or 100)
    domain_age_risk = 0
    if trust_analysis and "domain_age" in trust_analysis:
        age_risk = trust_analysis["domain_age"].get("risk_level", "UNKNOWN")
        age_days = trust_analysis["domain_age"].get("age_days", -1)
        if age_risk == "HIGH":
            domain_age_risk = 100
            flags.append(f"Domain is newly registered ({age_days} days old) — HIGH risk")
        elif age_risk in ("MEDIUM", "LOW_MEDIUM"):
            domain_age_risk = 50
            flags.append(f"Domain is relatively new ({age_days} days old) — MEDIUM risk")
    else:
        age_risk = features.get("age_risk", "unknown")
        age_days = features.get("age_days", -1)
        if age_risk == "high":
            domain_age_risk = 100
            flags.append(f"Domain is newly registered ({age_days} days old) — high risk")
        elif age_risk == "medium":
            domain_age_risk = 50
            flags.append(f"Domain is relatively new ({age_days} days old) — medium risk")

    # ============================================================
    # CALCULATE STRAIGHT AVERAGE
    # ============================================================
    total_risk_sum = ai_risk + url_guard_risk + spf_risk + dmarc_risk + dkim_risk + domain_age_risk
    average_score = round(total_risk_sum / 6.0)

    score = average_score

    # We keep the remaining flag generators just for reporting visibility
    if features.get("has_suspicious_tld") or features.get("has_ip_based_url"):
        flags.append("Suspicious URL detected (malicious TLD or IP-based URL)")

    att_risk = features.get("attachment_risk", "safe")
    if att_risk == "high":
        flags.append("Attachment contains high-risk file type (.exe, .bat, .js etc)")

    if trust_analysis and "display_name" in trust_analysis:
        dn_info = trust_analysis["display_name"]
        if dn_info.get("display_name_spoofing"):
            for reason in dn_info.get("reasons", []):
                flags.append(f"Display name spoofing: {reason}")

    # CAP SCORE AT 100
    score = min(max(score, 0), 100)

    # DETERMINE RISK LEVEL
    if score < 30:
        risk_level = "Low Risk"
    elif score < 45:
        risk_level = "Medium Risk"
    elif score <= 55:
        risk_level = "Human Review Required"
    elif score < 75:
        risk_level = "High Risk"
    else:
        risk_level = "Critical Threat"

    return {
        "score": score,
        "risk_level": risk_level,
        "flags": flags
    }