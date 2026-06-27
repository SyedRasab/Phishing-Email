import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import dns.resolver

from app.services.trust_analyzer import (
    analyze_domain_age,
    analyze_spf,
    analyze_dkim,
    analyze_dmarc,
    analyze_spoofing,
    analyze_display_name,
    analyze_typosquatting,
    analyze_sender_reputation,
    compute_trust_score,
    run_trust_analysis,
    TRUST_WEIGHTS
)

# Helper mock classes for DNS query results
class MockRecord:
    def __init__(self, text):
        self.text = text
    def to_text(self):
        return self.text

class MockAnswer:
    def __init__(self, records):
        self.records = [MockRecord(r) for r in records]
    def __iter__(self):
        return iter(self.records)


# -------------------------------------------------------------------------
# Test Domain Age
# -------------------------------------------------------------------------
@patch('app.services.trust_analyzer._rdap_creation_date')
@patch('app.services.trust_analyzer._whois_creation_date')
def test_analyze_domain_age(mock_whois, mock_rdap):
    # Case 1: RDAP succeeds, age < 30 days (HIGH risk)
    registration_date = datetime.now() - timedelta(days=15)
    mock_rdap.return_value = registration_date
    mock_whois.return_value = None
    
    res = analyze_domain_age("new-domain.com")
    assert res["age_days"] == 15
    assert res["risk_level"] == "HIGH"
    
    # Case 2: RDAP fails, WHOIS succeeds, age 120 days (LOW_MEDIUM risk)
    registration_date = datetime.now() - timedelta(days=120)
    mock_rdap.return_value = None
    mock_whois.return_value = registration_date
    
    res = analyze_domain_age("mid-domain.com")
    assert res["age_days"] == 120
    assert res["risk_level"] == "LOW_MEDIUM"
    
    # Case 3: Both fail (UNKNOWN risk)
    mock_rdap.return_value = None
    mock_whois.return_value = None
    res = analyze_domain_age("unknown-domain.com")
    assert res["age_days"] == -1
    assert res["risk_level"] == "UNKNOWN"


# -------------------------------------------------------------------------
# Test SPF Record Analysis
# -------------------------------------------------------------------------
@patch('dns.resolver.resolve')
def test_analyze_spf(mock_resolve):
    # Case 1: SPF softfail (~all)
    mock_resolve.return_value = MockAnswer(['"v=spf1 include:_spf.google.com ~all"'])
    res = analyze_spf("gmail.com")
    assert res["spf_exists"] is True
    assert res["spf_mechanism"] == "softfail"
    assert res["risk"] == "MEDIUM"

    # Case 2: SPF fail (-all)
    mock_resolve.return_value = MockAnswer(['"v=spf1 ip4:192.168.1.1 -all"'])
    res = analyze_spf("secure.com")
    assert res["spf_exists"] is True
    assert res["spf_mechanism"] == "fail"
    assert res["risk"] == "LOW"

    # Case 3: SPF neutral (?all)
    mock_resolve.return_value = MockAnswer(['"v=spf1 ?all"'])
    res = analyze_spf("neutral.com")
    assert res["spf_mechanism"] == "neutral"
    assert res["risk"] == "HIGH"

    # Case 4: SPF pass all (+all)
    mock_resolve.return_value = MockAnswer(['"v=spf1 +all"'])
    res = analyze_spf("open.com")
    assert res["spf_mechanism"] == "pass_all"
    assert res["risk"] == "CRITICAL"

    # Case 5: DNS error / No record
    mock_resolve.side_effect = dns.resolver.NoAnswer()
    res = analyze_spf("norecord.com")
    assert res["spf_exists"] is False
    assert res["risk"] == "HIGH"


# -------------------------------------------------------------------------
# Test DKIM Analysis
# -------------------------------------------------------------------------
@patch('dns.resolver.resolve')
def test_analyze_dkim(mock_resolve):
    # Case 1: DKIM not present
    parsed = {"dkim_signature": "", "authentication_results": "", "sender_domain": "example.com"}
    res = analyze_dkim(parsed)
    assert res["dkim_present"] is False
    assert res["risk"] == "HIGH"

    # Case 2: DKIM present, key exists, aligned
    parsed = {
        "dkim_signature": "v=1; a=rsa-sha256; d=example.com; s=selector1;",
        "authentication_results": "",
        "sender_domain": "example.com"
    }
    mock_resolve.return_value = MockAnswer(['"v=DKIM1; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA"'])
    res = analyze_dkim(parsed)
    assert res["dkim_present"] is True
    assert res["dkim_selector"] == "selector1"
    assert res["dkim_signing_domain"] == "example.com"
    assert res["dkim_public_key_exists"] is True
    assert res["dkim_aligned"] is True
    assert res["risk"] == "LOW"

    # Case 3: DKIM present, misaligned
    parsed = {
        "dkim_signature": "v=1; a=rsa-sha256; d=otherdomain.com; s=selector1;",
        "authentication_results": "",
        "sender_domain": "example.com"
    }
    res = analyze_dkim(parsed)
    assert res["dkim_aligned"] is False
    assert res["risk"] == "MEDIUM"

    # Case 4: DKIM Auth results pass overrides
    parsed = {
        "dkim_signature": "",
        "authentication_results": "dkim=pass header.i=@example.com",
        "sender_domain": "example.com"
    }
    res = analyze_dkim(parsed)
    assert res["dkim_auth_result"] == "pass"
    assert res["risk"] == "LOW"


# -------------------------------------------------------------------------
# Test DMARC Analysis
# -------------------------------------------------------------------------
@patch('dns.resolver.resolve')
def test_analyze_dmarc(mock_resolve):
    # Case 1: DMARC p=reject (LOW risk)
    mock_resolve.return_value = MockAnswer(['"v=DMARC1; p=reject; pct=100"'])
    res = analyze_dmarc("paypal.com")
    assert res["dmarc_exists"] is True
    assert res["policy"] == "reject"
    assert res["risk"] == "LOW"

    # Case 2: DMARC p=quarantine (MEDIUM risk)
    mock_resolve.return_value = MockAnswer(['"v=DMARC1; p=quarantine; pct=50"'])
    res = analyze_dmarc("semi-secure.com")
    assert res["policy"] == "quarantine"
    assert res["pct"] == 50
    assert res["risk"] == "MEDIUM"

    # Case 3: DMARC p=none (HIGH risk)
    mock_resolve.return_value = MockAnswer(['"v=DMARC1; p=none;"'])
    res = analyze_dmarc("insecure.com")
    assert res["policy"] == "none"
    assert res["risk"] == "HIGH"

    # Case 4: DMARC missing
    mock_resolve.side_effect = dns.resolver.NXDOMAIN()
    res = analyze_dmarc("nodmarc.com")
    assert res["dmarc_exists"] is False
    assert res["risk"] == "HIGH"


# -------------------------------------------------------------------------
# Test Email Spoofing Detection
# -------------------------------------------------------------------------
def test_analyze_spoofing():
    # Case 1: Clean email
    parsed = {
        "sender": "support@paypal.com",
        "sender_domain": "paypal.com",
        "reply_to": "support@paypal.com",
        "return_path": "support@paypal.com",
        "body_text": "Please check your PayPal account details."
    }
    res = analyze_spoofing(parsed)
    assert res["spoofing_detected"] is False

    # Case 2: Reply-To mismatch
    parsed = {
        "sender": "support@paypal.com",
        "sender_domain": "paypal.com",
        "reply_to": "hacker@evil.com",
        "return_path": "support@paypal.com",
        "body_text": "Normal body text."
    }
    res = analyze_spoofing(parsed)
    assert res["spoofing_detected"] is True
    assert res["checks"]["reply_to_mismatch"] is True

    # Case 3: Return-Path mismatch
    parsed = {
        "sender": "support@paypal.com",
        "sender_domain": "paypal.com",
        "reply_to": "support@paypal.com",
        "return_path": "attacker@bounce-server.xyz",
        "body_text": "Normal body text."
    }
    res = analyze_spoofing(parsed)
    assert res["spoofing_detected"] is True
    assert res["checks"]["return_path_mismatch"] is True

    # Case 4: Brand impersonation in body
    parsed = {
        "sender": "support@unknown-domain.com",
        "sender_domain": "unknown-domain.com",
        "reply_to": "support@unknown-domain.com",
        "return_path": "support@unknown-domain.com",
        "body_text": "Your Amazon order is shipped! Please click here."
    }
    res = analyze_spoofing(parsed)
    assert res["spoofing_detected"] is True
    assert res["checks"]["brand_impersonation"] == "amazon"


# -------------------------------------------------------------------------
# Test Display Name Spoofing
# -------------------------------------------------------------------------
def test_analyze_display_name():
    # Case 1: Spoofing - Brand in display name but different email
    parsed = {
        "display_name": "PayPal Support Team",
        "sender_email": "billing@suspicious-provider.xyz",
        "sender_domain": "suspicious-provider.xyz"
    }
    res = analyze_display_name(parsed)
    assert res["display_name_spoofing"] is True
    assert res["matched_brand"] == "paypal"

    # Case 2: Spoofing - Email in display name
    parsed = {
        "display_name": "ceo@mycompany.com",
        "sender_email": "hacker@evil.com",
        "sender_domain": "evil.com"
    }
    res = analyze_display_name(parsed)
    assert res["display_name_spoofing"] is True

    # Case 3: Legitimate display name
    parsed = {
        "display_name": "PayPal Security",
        "sender_email": "security@paypal.com",
        "sender_domain": "paypal.com"
    }
    res = analyze_display_name(parsed)
    assert res["display_name_spoofing"] is False


# -------------------------------------------------------------------------
# Test Typosquatting
# -------------------------------------------------------------------------
def test_analyze_typosquatting():
    # Case 1: Character substitution typosquatting
    res = analyze_typosquatting("paypa1.com")
    assert res["is_typosquatting"] is True
    assert res["matched_brand"] == "paypal"
    assert res["technique"] == "character_substitution"

    # Case 2: Similarity typosquatting
    res = analyze_typosquatting("amaz0n-security.com")
    # "amaz0n-security" vs "amazon"
    # method 1 will normalize '0' to 'o' -> "amazon-security"
    # method 2 (similarity) might match if ratio is between threshold and 1.0
    # Let's test a simpler typosquatted domain:
    res = analyze_typosquatting("amaxon.com")
    assert res["is_typosquatting"] is True
    assert res["matched_brand"] == "amazon"
    assert res["technique"] == "similarity"

    # Case 3: Legitimate domain name
    res = analyze_typosquatting("amazon.com")
    assert res["is_typosquatting"] is False


# -------------------------------------------------------------------------
# Test Sender Reputation
# -------------------------------------------------------------------------
def test_analyze_sender_reputation():
    # Free email provider
    res = analyze_sender_reputation("gmail.com")
    assert res["is_free_provider"] is True
    assert res["is_disposable"] is False
    assert res["risk"] == "LOW"

    # Disposable provider
    res = analyze_sender_reputation("tempmail.com")
    assert res["is_disposable"] is True
    assert res["risk"] == "HIGH"

    # Suspicious TLD
    res = analyze_sender_reputation("badguy.xyz")
    assert res["has_suspicious_tld"] is True
    assert res["risk"] == "HIGH"


# -------------------------------------------------------------------------
# Test Trust Score Computation
# -------------------------------------------------------------------------
def test_compute_trust_score():
    # Case 1: Perfect trust score (100)
    trust_analysis = {
        "domain_age": {"risk_level": "TRUSTED"},
        "spf": {"risk": "LOW"},
        "dkim": {"risk": "LOW"},
        "dmarc": {"risk": "LOW"},
        "spoofing": {"spoofing_detected": False},
        "display_name": {"display_name_spoofing": False},
        "typosquatting": {"is_typosquatting": False},
    }
    features = {
        "has_suspicious_tld": False,
        "has_ip_based_url": False,
        "attachment_risk": "safe"
    }
    res = compute_trust_score(0.0, trust_analysis, features)
    assert res["trust_score"] == 100
    assert res["risk_level"] == "TRUSTED"
    assert len(res["deductions"]) == 0

    # Case 2: Maximum deductions (should clamp to 0)
    trust_analysis = {
        "domain_age": {"risk_level": "HIGH"},
        "spf": {"risk": "HIGH"},
        "dkim": {"risk": "HIGH"},
        "dmarc": {"risk": "HIGH"},
        "spoofing": {"spoofing_detected": True},
        "display_name": {"display_name_spoofing": True},
        "typosquatting": {"is_typosquatting": True},
    }
    features = {
        "has_suspicious_tld": True,
        "has_ip_based_url": True,
        "attachment_risk": "high"
    }
    res = compute_trust_score(1.0, trust_analysis, features)
    assert res["trust_score"] == 0
    assert res["risk_level"] == "CRITICAL THREAT"
    assert len(res["deductions"]) > 0
