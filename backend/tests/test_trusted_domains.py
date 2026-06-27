from app.services.trust_analyzer import is_trusted_domain, run_trust_analysis
from app.services.scorer import compute_score
from app.services.parser import parse_email
from app.services.features import extract_all_features

def test_trusted_domains():
    # 1. Test whitelist helper
    assert is_trusted_domain("hbl.com") == True
    assert is_trusted_domain("sub.hbl.com") == True
    assert is_trusted_domain("scb.com.pk") == True
    assert is_trusted_domain("hacker-hbl.com") == False  # phishing lookalike should not match
    assert is_trusted_domain("google.com") == True
    assert is_trusted_domain("evil.com") == False
    print("[OK] is_trusted_domain whitelist helper passed!")

    # 2. Test scoring reduction for trusted domain vs untrusted domain
    # Scenario: email with 0.8 AI phishing probability (due to typical financial terms like "verify account")
    features_trusted = {
        "sender_domain": "hbl.com",
        "url_count": 0,
        "attachment_count": 0,
        "attachment_risk": "safe"
    }
    features_untrusted = {
        "sender_domain": "scamdomain.xyz",
        "url_count": 0,
        "attachment_count": 0,
        "attachment_risk": "safe"
    }
    
    # Fake trust analysis objects for clean testing
    trust_trusted = {
        "domain_age": {"domain": "hbl.com", "risk_level": "SAFE"},
        "sender_reputation": {"is_trusted": True, "risk": "LOW"},
    }
    trust_untrusted = {
        "domain_age": {"domain": "scamdomain.xyz", "risk_level": "SAFE"},
        "sender_reputation": {"is_trusted": False, "risk": "LOW"},
    }
    
    # Scorer weight is normally 35 for AI. For trusted domain, it should be 17.
    # 0.8 * 35 = 28 points for untrusted.
    # 0.8 * 17 = 14 points for trusted.
    result_trusted = compute_score(0.8, features_trusted, trust_trusted)
    result_untrusted = compute_score(0.8, features_untrusted, trust_untrusted)
    
    print(f"Trusted Domain (hbl.com) Score: {result_trusted['score']}")
    print(f"Untrusted Domain Score: {result_untrusted['score']}")
    
    assert result_trusted['score'] < result_untrusted['score']
    print("[OK] Scorer reduction for trusted domains passed!")

if __name__ == "__main__":
    test_trusted_domains()
