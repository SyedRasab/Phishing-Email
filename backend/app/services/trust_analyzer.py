"""
Email Trust Analyzer
====================
Professional email trust analysis module that evaluates:
- Domain Age (RDAP + WHOIS fallback)
- SPF (full mechanism parsing)
- DKIM (header presence + DNS key verification)
- DMARC (policy extraction)
- Email Spoofing (header mismatches)
- Display Name Spoofing (brand impersonation via display name)
- Typosquatting (character substitution + similarity matching)
- Sender Reputation (free/disposable email detection)
- Trust Score (0-100, higher = more trusted)
"""

import re
import json
import logging
import dns.resolver
import urllib.request
from datetime import datetime
from difflib import SequenceMatcher
from email.utils import parseaddr

logger = logging.getLogger(__name__)
# Suppress noisy python-whois library logger errors during socket connection timeouts
logging.getLogger("whois").setLevel(logging.CRITICAL)


# ============================================================
# CONFIGURABLE THRESHOLDS
# All thresholds are defined here — never hardcoded in logic
# ============================================================

DOMAIN_AGE_THRESHOLDS = {
    "HIGH":        30,     # < 30 days
    "MEDIUM":      90,     # < 90 days
    "LOW_MEDIUM":  180,    # < 180 days
    "SAFE":        365,    # < 365 days  (1 year)
    "TRUSTED":     1095,   # > 3 years   (365 * 3)
}

TYPOSQUATTING_THRESHOLD = 0.75   # Minimum similarity ratio for general matching
TYPOSQUATTING_SHORT_THRESHOLD = 0.85  # Stricter for short domains (< 5 chars)

DNS_TIMEOUT = 5   # seconds for DNS lookups
HTTP_TIMEOUT = 5  # seconds for HTTP requests


# ============================================================
# KNOWN BRAND DOMAINS — used for spoofing & typosquatting
# ============================================================

KNOWN_BRANDS = {
    "paypal":    ["paypal.com"],
    "amazon":    ["amazon.com", "amazon.co.uk"],
    "apple":     ["apple.com", "icloud.com"],
    "microsoft": ["microsoft.com", "outlook.com", "hotmail.com", "live.com"],
    "google":    ["google.com", "gmail.com"],
    "netflix":   ["netflix.com"],
    "facebook":  ["facebook.com", "meta.com"],
    "instagram": ["instagram.com"],
    "twitter":   ["twitter.com", "x.com"],
    "ebay":      ["ebay.com"],
    "dropbox":   ["dropbox.com"],
    "linkedin":  ["linkedin.com"],
    "whatsapp":  ["whatsapp.com"],
}

# Character substitutions used in typosquatting
CHAR_SUBSTITUTIONS = {
    "0": "o",
    "1": "l",
    "i": "l",
    "rn": "m",
    "vv": "w",
    "5": "s",
    "3": "e",
    "@": "a",
}

# Free email providers — sending from these is a reputation signal
FREE_EMAIL_PROVIDERS = [
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "aol.com", "icloud.com", "mail.com", "protonmail.com",
    "zoho.com", "yandex.com", "gmx.com", "live.com",
]

# Known disposable email providers
DISPOSABLE_PROVIDERS = [
    "tempmail.com", "throwaway.email", "guerrillamail.com",
    "mailinator.com", "10minutemail.com", "trashmail.com",
    "temp-mail.org", "fakeinbox.com", "sharklasers.com",
    "guerrillamailblock.com", "grr.la", "dispostable.com",
]

# Trusted/whitelisted domains — known legitimate organizations
TRUSTED_DOMAINS = [
    # Pakistani banks
    "hbl.com", "alfalahbank.com", "ubl.com.pk", "mcb.com.pk",
    "uba.com.pk", "bankislami.com.pk", "meezanbank.com",
    "standardchartered.com.pk", "scb.com.pk", "nbp.gov.pk",
    "bop.com.pk", "js.com.pk", "askaribank.com.pk",
    # International banks / financial
    "citi.com", "citibank.com", "jpmorgan.com", "chase.com",
    "bankofamerica.com", "wellsfargo.com", "barclays.com",
    "hsbc.com", "standardchartered.com", "paypal.com", "stripe.com",
    # Major services / tech
    "google.com", "gmail.com", "microsoft.com", "apple.com", "amazon.com",
    "netflix.com", "facebook.com", "instagram.com", "twitter.com",
    "linkedin.com", "whatsapp.com", "github.com",
]

def is_trusted_domain(sender_domain):
    """Check if sender domain is in the trusted whitelist."""
    if not sender_domain:
        return False
    sd = sender_domain.lower()
    for td in TRUSTED_DOMAINS:
        if sd == td or sd.endswith("." + td):
            return True
    return False


# High-risk TLDs frequently used in phishing
SUSPICIOUS_TLDS = [
    ".xyz", ".top", ".click", ".download", ".stream",
    ".gq", ".cf", ".tk", ".ml", ".ga", ".work", ".party",
    ".buzz", ".icu", ".loan", ".racing",
]


# ============================================================
# TRUST SCORE WEIGHTS — must total exactly 100
# ============================================================

TRUST_WEIGHTS = {
    "ai_model":              30,   # DistilBERT prediction
    "domain_age":            15,   # Domain registration age
    "spf":                   10,   # SPF record analysis
    "dkim":                  10,   # DKIM presence and alignment
    "dmarc":                 10,   # DMARC policy analysis
    "spoofing":              10,   # Header mismatch indicators
    "display_name_spoofing":  5,   # Display name brand impersonation
    "typosquatting":          5,   # Domain lookalike detection
    "suspicious_urls":        3,   # URL heuristics
    "attachment_risk":        2,   # File extension heuristics
}

assert sum(TRUST_WEIGHTS.values()) == 100, \
    f"Trust weights must sum to 100, got {sum(TRUST_WEIGHTS.values())}"


# ============================================================
# 1. DOMAIN AGE ANALYSIS
# ============================================================

def analyze_domain_age(sender_domain):
    """
    Determine domain registration age using RDAP (primary)
    with python-whois as fallback.

    Returns structured domain age analysis.
    """
    result = {
        "domain": sender_domain,
        "creation_date": None,
        "age_days": -1,
        "age_years": -1,
        "risk_level": "UNKNOWN",
    }

    if not sender_domain:
        return result

    # --- Try RDAP first (reliable, official) ---
    creation_date = _rdap_creation_date(sender_domain)

    # --- Fallback to WHOIS if RDAP fails ---
    if not creation_date:
        creation_date = _whois_creation_date(sender_domain)

    if creation_date:
        if creation_date.tzinfo is not None:
            creation_date = creation_date.replace(tzinfo=None)
        age_days = (datetime.now() - creation_date).days
        age_years = round(age_days / 365.25, 1)

        result["creation_date"] = creation_date.strftime("%Y-%m-%d")
        result["age_days"] = age_days
        result["age_years"] = age_years
        result["risk_level"] = _domain_age_risk(age_days)

    return result


def _rdap_creation_date(domain):
    """Query RDAP for domain registration date."""
    try:
        url = f"https://rdap.org/domain/{domain}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as response:
            data = json.loads(response.read())

        for event in data.get("events", []):
            if event.get("eventAction") == "registration":
                date_str = event["eventDate"][:10]
                return datetime.strptime(date_str, "%Y-%m-%d")
    except Exception as e:
        logger.debug(f"RDAP lookup failed for {domain}: {e}")
    return None


def _whois_creation_date(domain):
    """Fallback: query WHOIS for domain registration date."""
    try:
        import whois
        w = whois.whois(domain)
        if w.creation_date:
            # whois sometimes returns a list
            cd = w.creation_date
            if isinstance(cd, list):
                cd = cd[0]
            if isinstance(cd, datetime):
                return cd
    except Exception as e:
        logger.debug(f"WHOIS lookup failed for {domain}: {e}")
    return None


def _domain_age_risk(age_days):
    """Map domain age to risk level using configurable thresholds."""
    if age_days < DOMAIN_AGE_THRESHOLDS["HIGH"]:
        return "HIGH"
    elif age_days < DOMAIN_AGE_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    elif age_days < DOMAIN_AGE_THRESHOLDS["LOW_MEDIUM"]:
        return "LOW_MEDIUM"
    elif age_days < DOMAIN_AGE_THRESHOLDS["SAFE"]:
        return "SAFE"
    else:
        return "TRUSTED"


# ============================================================
# 2. SPF ANALYSIS
# ============================================================

def analyze_spf(sender_domain):
    """
    Analyze SPF (Sender Policy Framework) record for the domain.

    Checks:
    - Whether an SPF record exists
    - The SPF mechanism (-all, ~all, ?all, +all)
    - Maps to risk level

    Note: This checks the DNS TXT record for SPF policy.
    It does NOT perform a full SPF evaluation (which requires
    the sending IP, which is not available from email text).
    """
    result = {
        "spf_exists": False,
        "spf_record": None,
        "spf_mechanism": "none",
        "risk": "HIGH",
    }

    if not sender_domain:
        return result

    try:
        answers = dns.resolver.resolve(sender_domain, "TXT", lifetime=DNS_TIMEOUT)
        for record in answers:
            txt = record.to_text().strip('"')
            if "v=spf1" in txt.lower():
                result["spf_exists"] = True
                result["spf_record"] = txt

                # Determine the enforcement mechanism
                txt_lower = txt.lower()
                if "-all" in txt_lower:
                    result["spf_mechanism"] = "fail"
                    result["risk"] = "LOW"
                elif "~all" in txt_lower:
                    result["spf_mechanism"] = "softfail"
                    result["risk"] = "MEDIUM"
                elif "?all" in txt_lower:
                    result["spf_mechanism"] = "neutral"
                    result["risk"] = "HIGH"
                elif "+all" in txt_lower:
                    result["spf_mechanism"] = "pass_all"
                    result["risk"] = "CRITICAL"
                else:
                    # SPF record exists but no all mechanism
                    result["spf_mechanism"] = "unknown"
                    result["risk"] = "MEDIUM"
                break

    except dns.resolver.NXDOMAIN:
        logger.debug(f"SPF: Domain {sender_domain} does not exist")
        result["risk"] = "HIGH"
    except dns.resolver.NoAnswer:
        logger.debug(f"SPF: No TXT records for {sender_domain}")
    except dns.resolver.Timeout:
        logger.debug(f"SPF: DNS timeout for {sender_domain}")
        result["risk"] = "UNKNOWN"
    except Exception as e:
        logger.debug(f"SPF lookup error for {sender_domain}: {e}")
        result["risk"] = "UNKNOWN"

    return result


# ============================================================
# 3. DKIM ANALYSIS
# ============================================================

def analyze_dkim(parsed_email):
    """
    Analyze DKIM (DomainKeys Identified Mail) from email headers.

    What this does:
    1. Checks if DKIM-Signature header exists
    2. Extracts selector (s=) and signing domain (d=)
    3. Verifies DKIM public key exists in DNS
    4. Checks alignment (signing domain matches sender domain)
    5. Parses Authentication-Results header if available

    What this does NOT do:
    - Cryptographic signature verification (not feasible from
      pasted text — the email bytes are modified during paste/upload)
    """
    result = {
        "dkim_present": False,
        "dkim_selector": None,
        "dkim_signing_domain": None,
        "dkim_public_key_exists": False,
        "dkim_aligned": False,
        "dkim_auth_result": None,
        "risk": "HIGH",
    }

    dkim_header = parsed_email.get("dkim_signature", "")
    auth_results = parsed_email.get("authentication_results", "")
    sender_domain = parsed_email.get("sender_domain", "")

    # --- Step 1: Check if DKIM-Signature header exists ---
    if not dkim_header:
        if auth_results:
            dkim_result = _parse_auth_results_dkim(auth_results)
            if dkim_result:
                result["dkim_auth_result"] = dkim_result
                if dkim_result == "pass":
                    result["risk"] = "LOW"
                elif dkim_result == "fail":
                    result["risk"] = "HIGH"
                else:
                    result["risk"] = "MEDIUM"
                return result
        result["risk"] = "HIGH"
        return result

    result["dkim_present"] = True

    # --- Step 2: Extract selector and signing domain ---
    selector = _extract_dkim_tag(dkim_header, "s")
    signing_domain = _extract_dkim_tag(dkim_header, "d")

    result["dkim_selector"] = selector
    result["dkim_signing_domain"] = signing_domain

    # --- Step 3: Verify DKIM public key exists in DNS ---
    if selector and signing_domain:
        try:
            dkim_dns = f"{selector}._domainkey.{signing_domain}"
            answers = dns.resolver.resolve(dkim_dns, "TXT", lifetime=DNS_TIMEOUT)
            for record in answers:
                txt = record.to_text().lower()
                if "p=" in txt:
                    result["dkim_public_key_exists"] = True
                    break
        except Exception as e:
            logger.debug(f"DKIM DNS lookup failed for {selector}._domainkey.{signing_domain}: {e}")

    # --- Step 4: Check alignment ---
    if signing_domain and sender_domain:
        result["dkim_aligned"] = signing_domain.lower() == sender_domain.lower()

    # --- Step 5: Parse Authentication-Results header ---
    if auth_results:
        dkim_result = _parse_auth_results_dkim(auth_results)
        if dkim_result:
            result["dkim_auth_result"] = dkim_result

    # --- Determine risk ---
    if result["dkim_public_key_exists"] and result["dkim_aligned"]:
        result["risk"] = "LOW"
    elif result["dkim_present"] and result["dkim_public_key_exists"]:
        result["risk"] = "MEDIUM"
    elif result["dkim_present"]:
        result["risk"] = "MEDIUM"
    else:
        result["risk"] = "HIGH"

    # Authentication-Results overrides if present
    if result["dkim_auth_result"] == "pass":
        result["risk"] = "LOW"
    elif result["dkim_auth_result"] == "fail":
        result["risk"] = "HIGH"

    return result


def _extract_dkim_tag(dkim_header, tag):
    """Extract a tag value from DKIM-Signature header (e.g., s=selector, d=domain)."""
    pattern = rf'(?:^|;)\s*{tag}\s*=\s*([^\s;]+)'
    match = re.search(pattern, dkim_header, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def _parse_auth_results_dkim(auth_header):
    """Parse DKIM result from Authentication-Results header."""
    # Common format: dkim=pass (or fail, none, etc.)
    match = re.search(r'dkim\s*=\s*(\w+)', auth_header, re.IGNORECASE)
    if match:
        return match.group(1).lower()
    return None


# ============================================================
# 4. DMARC ANALYSIS
# ============================================================

def analyze_dmarc(sender_domain):
    """
    Analyze DMARC (Domain-based Message Authentication,
    Reporting & Conformance) record.

    Extracts: policy (p=), subdomain policy (sp=),
    percentage (pct=), and determines risk level.
    """
    result = {
        "dmarc_exists": False,
        "dmarc_record": None,
        "policy": "none",
        "subdomain_policy": None,
        "pct": 100,
        "risk": "HIGH",
    }

    if not sender_domain:
        return result

    try:
        dmarc_domain = f"_dmarc.{sender_domain}"
        answers = dns.resolver.resolve(dmarc_domain, "TXT", lifetime=DNS_TIMEOUT)

        for record in answers:
            txt = record.to_text().strip('"')
            if "v=dmarc1" in txt.lower():
                result["dmarc_exists"] = True
                result["dmarc_record"] = txt

                # Extract policy (p=)
                p_match = re.search(r'p\s*=\s*(\w+)', txt, re.IGNORECASE)
                if p_match:
                    result["policy"] = p_match.group(1).lower()

                # Extract subdomain policy (sp=)
                sp_match = re.search(r'sp\s*=\s*(\w+)', txt, re.IGNORECASE)
                if sp_match:
                    result["subdomain_policy"] = sp_match.group(1).lower()

                # Extract percentage (pct=)
                pct_match = re.search(r'pct\s*=\s*(\d+)', txt, re.IGNORECASE)
                if pct_match:
                    result["pct"] = int(pct_match.group(1))

                # Determine risk based on policy
                policy = result["policy"]
                if policy == "reject":
                    result["risk"] = "LOW"
                elif policy == "quarantine":
                    result["risk"] = "MEDIUM"
                elif policy == "none":
                    result["risk"] = "HIGH"
                break

    except dns.resolver.NXDOMAIN:
        logger.debug(f"DMARC: _dmarc.{sender_domain} does not exist")
    except dns.resolver.NoAnswer:
        logger.debug(f"DMARC: No TXT records for _dmarc.{sender_domain}")
    except dns.resolver.Timeout:
        logger.debug(f"DMARC: DNS timeout for _dmarc.{sender_domain}")
        result["risk"] = "UNKNOWN"
    except Exception as e:
        logger.debug(f"DMARC lookup error for {sender_domain}: {e}")
        result["risk"] = "UNKNOWN"

    return result


# ============================================================
# 5. EMAIL SPOOFING DETECTION
# ============================================================

def analyze_spoofing(parsed_email):
    """
    Detect email spoofing through header mismatch analysis.

    Checks:
    1. Reply-To domain differs from sender domain
    2. Return-Path domain differs from sender domain
    3. Brand impersonation in email body
    """
    result = {
        "spoofing_detected": False,
        "checks": {
            "reply_to_mismatch": False,
            "return_path_mismatch": False,
            "brand_impersonation": None,
        },
        "reasons": [],
    }

    sender = parsed_email.get("sender", "")
    sender_domain = parsed_email.get("sender_domain", "")
    reply_to = parsed_email.get("reply_to", "")
    return_path = parsed_email.get("return_path", "")
    body_text = parsed_email.get("body_text", "")

    # --- Check 1: Reply-To mismatch ---
    if reply_to and sender_domain:
        _, reply_email = parseaddr(reply_to)
        reply_domain = reply_email.split("@")[-1].strip(">") if "@" in reply_email else ""
        if reply_domain and reply_domain.lower() != sender_domain.lower():
            result["checks"]["reply_to_mismatch"] = True
            result["reasons"].append(
                f"Reply-To domain ({reply_domain}) differs from sender domain ({sender_domain})"
            )

    # --- Check 2: Return-Path mismatch ---
    if return_path and sender_domain:
        _, rp_email = parseaddr(return_path)
        rp_domain = rp_email.split("@")[-1].strip(">") if "@" in rp_email else ""
        if rp_domain and rp_domain.lower() != sender_domain.lower():
            result["checks"]["return_path_mismatch"] = True
            result["reasons"].append(
                f"Return-Path domain ({rp_domain}) differs from sender domain ({sender_domain})"
            )

    # --- Check 3: Brand impersonation ---
    body_lower = body_text.lower()
    for brand, domains in KNOWN_BRANDS.items():
        if brand in body_lower:
            # Only flag if sender domain is NOT one of the brand's official domains
            if not _is_official_domain(sender_domain, domains):
                result["checks"]["brand_impersonation"] = brand
                result["reasons"].append(
                    f"Email body mentions '{brand}' but sender ({sender_domain}) "
                    f"is not an official {brand} domain"
                )
                break

    result["spoofing_detected"] = any([
        result["checks"]["reply_to_mismatch"],
        result["checks"]["return_path_mismatch"],
        result["checks"]["brand_impersonation"] is not None,
    ])

    return result


# ============================================================
# 6. DISPLAY NAME SPOOFING
# ============================================================

def analyze_display_name(parsed_email):
    """
    Detect display name spoofing.

    Examples:
    - "PayPal Security Team" <attacker@gmail.com>  → suspicious
    - "ceo@company.com" <attacker@evil.com>        → suspicious (email in display name)
    """
    result = {
        "display_name_spoofing": False,
        "display_name": None,
        "actual_email": None,
        "matched_brand": None,
        "reasons": [],
    }

    display_name = parsed_email.get("display_name", "")
    sender_email = parsed_email.get("sender_email", "")
    sender_domain = parsed_email.get("sender_domain", "")

    if not display_name:
        return result

    result["display_name"] = display_name
    result["actual_email"] = sender_email

    display_lower = display_name.lower()

    # --- Check 1: Display name contains a brand but email is from different domain ---
    for brand, domains in KNOWN_BRANDS.items():
        if brand in display_lower:
            if not _is_official_domain(sender_domain, domains):
                result["display_name_spoofing"] = True
                result["matched_brand"] = brand
                result["reasons"].append(
                    f"Display name contains '{brand}' but email is from {sender_domain}"
                )
                break

    # --- Check 2: Display name looks like an email address ---
    if "@" in display_name and not result["display_name_spoofing"]:
        result["display_name_spoofing"] = True
        result["reasons"].append(
            f"Display name contains an email address: '{display_name}'"
        )

    return result


# ============================================================
# 7. TYPOSQUATTING DETECTION (Enhanced)
# ============================================================

def analyze_typosquatting(sender_domain):
    """
    Enhanced typosquatting detection.

    Uses:
    1. Character substitution normalization (0→o, 1→l, rn→m)
    2. SequenceMatcher similarity with length-adjusted thresholds
    3. Known brand matching
    """
    result = {
        "is_typosquatting": False,
        "matched_brand": None,
        "similarity": 0.0,
        "technique": None,
    }

    if not sender_domain:
        return result

    domain_name = sender_domain.split(".")[0].lower()

    # --- Method 1: Character substitution detection ---
    normalized = _normalize_substitutions(domain_name)

    for brand in KNOWN_BRANDS:
        # Check if normalized domain matches a brand exactly
        if normalized == brand and domain_name != brand:
            result["is_typosquatting"] = True
            result["matched_brand"] = brand
            result["similarity"] = 1.0
            result["technique"] = "character_substitution"
            return result

    # --- Method 2: Similarity matching ---
    for brand in KNOWN_BRANDS:
        ratio = SequenceMatcher(None, domain_name, brand).ratio()

        # Use stricter threshold for short domains to avoid false positives
        threshold = TYPOSQUATTING_SHORT_THRESHOLD if len(brand) < 5 else TYPOSQUATTING_THRESHOLD

        if threshold < ratio < 1.0:
            result["is_typosquatting"] = True
            result["matched_brand"] = brand
            result["similarity"] = round(ratio, 3)
            result["technique"] = "similarity"
            return result

    return result


def _normalize_substitutions(text):
    """Apply known character substitutions to normalize typosquatted domains."""
    normalized = text
    # Apply multi-char substitutions first (rn→m, vv→w)
    for fake, real in sorted(CHAR_SUBSTITUTIONS.items(), key=lambda x: -len(x[0])):
        normalized = normalized.replace(fake, real)
    return normalized


def _is_official_domain(sender_domain, official_domains):
    """Check if a domain equals or is a subdomain of any official brand domain."""
    if not sender_domain:
        return False
    sd = sender_domain.lower()
    for od in official_domains:
        od_lower = od.lower()
        if sd == od_lower or sd.endswith("." + od_lower):
            return True
    return False


# ============================================================
# 8. SENDER REPUTATION
# ============================================================

def analyze_sender_reputation(sender_domain):
    """
    Analyze sender reputation based on domain characteristics.

    Checks:
    - Free email provider (gmail, yahoo, etc.)
    - Disposable email provider
    - Suspicious TLD
    """
    result = {
        "is_free_provider": False,
        "is_disposable": False,
        "has_suspicious_tld": False,
        "is_trusted": is_trusted_domain(sender_domain),
        "risk": "LOW",
    }

    if not sender_domain:
        result["risk"] = "UNKNOWN"
        return result

    domain_lower = sender_domain.lower()

    # Check free email provider
    if domain_lower in FREE_EMAIL_PROVIDERS:
        result["is_free_provider"] = True

    # Check disposable provider
    if domain_lower in DISPOSABLE_PROVIDERS:
        result["is_disposable"] = True
        result["risk"] = "HIGH"
        return result

    # Check suspicious TLD — match at domain boundary, not substring
    for tld in SUSPICIOUS_TLDS:
        if domain_lower.endswith(tld):
            result["has_suspicious_tld"] = True
            result["risk"] = "HIGH"
            return result

    return result


# ============================================================
# 9. TRUST SCORE COMPUTATION
# ============================================================

def compute_trust_score(ai_probability, trust_analysis, features):
    """
    Compute unified trust score (0-100, higher = more trusted).

    Formula: Start at 100, deduct points for each failed check.
    Each signal's deduction is scaled by its weight.

    Returns trust_score and detailed breakdown.
    """
    score = 100
    deductions = []

    # --- 1. AI Model (30 points max deduction) ---
    ai_deduction = round(ai_probability * TRUST_WEIGHTS["ai_model"])
    
    sender_reputation = trust_analysis.get("sender_reputation", {})
    is_trusted = sender_reputation.get("is_trusted", False)
    if is_trusted:
        ai_deduction = round(ai_deduction * 0.2)  # 80% reduction for trusted domains
        
    score -= ai_deduction
    if ai_probability > 0.5:
        trusted_suffix = " (reduced for trusted domain)" if is_trusted else ""
        deductions.append(
            f"AI model: -{ai_deduction}{trusted_suffix} (phishing probability: {round(ai_probability * 100)}%)"
        )

    # Apply trusted domain bonus
    if is_trusted:
        score += 10
        deductions.append("Trusted domain bonus: +10")


    # --- 2. Domain Age (15 points max deduction) ---
    domain_risk = trust_analysis.get("domain_age", {}).get("risk_level", "UNKNOWN")
    if domain_risk == "HIGH":
        score -= TRUST_WEIGHTS["domain_age"]
        deductions.append(f"Domain age HIGH risk: -{TRUST_WEIGHTS['domain_age']}")
    elif domain_risk == "MEDIUM":
        deduct = round(TRUST_WEIGHTS["domain_age"] * 0.7)
        score -= deduct
        deductions.append(f"Domain age MEDIUM risk: -{deduct}")
    elif domain_risk == "LOW_MEDIUM":
        deduct = round(TRUST_WEIGHTS["domain_age"] * 0.3)
        score -= deduct
        deductions.append(f"Domain age LOW_MEDIUM risk: -{deduct}")

    # --- 3. SPF (10 points max deduction) ---
    spf_risk = trust_analysis.get("spf", {}).get("risk", "UNKNOWN")
    if spf_risk == "CRITICAL":
        score -= TRUST_WEIGHTS["spf"]
        deductions.append(f"SPF CRITICAL (+all): -{TRUST_WEIGHTS['spf']}")
    elif spf_risk == "HIGH":
        score -= TRUST_WEIGHTS["spf"]
        deductions.append(f"SPF HIGH risk: -{TRUST_WEIGHTS['spf']}")
    elif spf_risk == "MEDIUM":
        deduct = round(TRUST_WEIGHTS["spf"] * 0.5)
        score -= deduct
        deductions.append(f"SPF MEDIUM risk (~all): -{deduct}")

    # --- 4. DKIM (10 points max deduction) ---
    dkim_risk = trust_analysis.get("dkim", {}).get("risk", "UNKNOWN")
    if dkim_risk == "HIGH":
        score -= TRUST_WEIGHTS["dkim"]
        deductions.append(f"DKIM HIGH risk: -{TRUST_WEIGHTS['dkim']}")
    elif dkim_risk == "MEDIUM":
        deduct = round(TRUST_WEIGHTS["dkim"] * 0.5)
        score -= deduct
        deductions.append(f"DKIM MEDIUM risk: -{deduct}")

    # --- 5. DMARC (10 points max deduction) ---
    dmarc_risk = trust_analysis.get("dmarc", {}).get("risk", "UNKNOWN")
    if dmarc_risk == "HIGH":
        score -= TRUST_WEIGHTS["dmarc"]
        deductions.append(f"DMARC HIGH risk: -{TRUST_WEIGHTS['dmarc']}")
    elif dmarc_risk == "MEDIUM":
        deduct = round(TRUST_WEIGHTS["dmarc"] * 0.5)
        score -= deduct
        deductions.append(f"DMARC MEDIUM risk: -{deduct}")

    # --- 6. Spoofing (10 points max deduction) ---
    spoofing = trust_analysis.get("spoofing", {})
    if spoofing.get("spoofing_detected"):
        score -= TRUST_WEIGHTS["spoofing"]
        deductions.append(f"Spoofing detected: -{TRUST_WEIGHTS['spoofing']}")

    # --- 7. Display Name Spoofing (5 points max deduction) ---
    display = trust_analysis.get("display_name", {})
    if display.get("display_name_spoofing"):
        score -= TRUST_WEIGHTS["display_name_spoofing"]
        deductions.append(
            f"Display name spoofing: -{TRUST_WEIGHTS['display_name_spoofing']}"
        )

    # --- 8. Typosquatting (5 points max deduction) ---
    typo = trust_analysis.get("typosquatting", {})
    if typo.get("is_typosquatting"):
        score -= TRUST_WEIGHTS["typosquatting"]
        deductions.append(f"Typosquatting detected: -{TRUST_WEIGHTS['typosquatting']}")

    # --- 9. Suspicious URLs (3 points max deduction) ---
    if features.get("has_suspicious_tld") or features.get("has_ip_based_url"):
        score -= TRUST_WEIGHTS["suspicious_urls"]
        deductions.append(f"Suspicious URLs: -{TRUST_WEIGHTS['suspicious_urls']}")

    # --- 10. Attachment Risk (2 points max deduction) ---
    att_risk = features.get("attachment_risk", "safe")
    if att_risk == "high":
        score -= TRUST_WEIGHTS["attachment_risk"]
        deductions.append(f"High-risk attachment: -{TRUST_WEIGHTS['attachment_risk']}")
    elif att_risk == "medium":
        deduct = round(TRUST_WEIGHTS["attachment_risk"] * 0.5)
        score -= deduct
        deductions.append(f"Medium-risk attachment: -{deduct}")

    # Clamp score to 0-100
    score = max(0, min(100, score))

    # Determine risk level from trust score
    if score >= 80:
        risk_level = "TRUSTED"
    elif score >= 60:
        risk_level = "SAFE"
    elif score >= 40:
        risk_level = "SUSPICIOUS"
    elif score >= 20:
        risk_level = "DANGEROUS"
    else:
        risk_level = "CRITICAL THREAT"

    return {
        "trust_score": score,
        "risk_level": risk_level,
        "deductions": deductions,
        "weights": TRUST_WEIGHTS,
    }


# ============================================================
# MAIN ENTRY POINT — runs all trust checks
# ============================================================

def run_trust_analysis(parsed_email, ai_probability, features):
    """
    Run the full trust analysis pipeline.

    Args:
        parsed_email: Output from parser.parse_email()
        ai_probability: Float 0-1 from model.predict_phishing()
        features: Output from features.extract_all_features()

    Returns:
        Complete trust analysis dictionary.
    """
    sender_domain = parsed_email.get("sender_domain", "")

    # Run all individual analyses
    domain_age = analyze_domain_age(sender_domain)
    spf = analyze_spf(sender_domain)
    dkim = analyze_dkim(parsed_email)
    dmarc = analyze_dmarc(sender_domain)
    spoofing = analyze_spoofing(parsed_email)
    display_name = analyze_display_name(parsed_email)
    typosquatting = analyze_typosquatting(sender_domain)
    sender_reputation = analyze_sender_reputation(sender_domain)

    # Build trust analysis object
    trust_analysis = {
        "domain_age": domain_age,
        "spf": spf,
        "dkim": dkim,
        "dmarc": dmarc,
        "spoofing": spoofing,
        "display_name": display_name,
        "typosquatting": typosquatting,
        "sender_reputation": sender_reputation,
    }

    # Compute trust score
    trust_result = compute_trust_score(ai_probability, trust_analysis, features)

    trust_analysis["trust_score"] = trust_result["trust_score"]
    trust_analysis["risk_level"] = trust_result["risk_level"]
    trust_analysis["deductions"] = trust_result["deductions"]
    trust_analysis["weights"] = trust_result["weights"]

    return trust_analysis
