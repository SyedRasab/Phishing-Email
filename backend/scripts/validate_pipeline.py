import sys
import os
import json

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.parser import parse_email
from app.services.features import extract_all_features
from app.services.scorer import compute_score
from app.services.trust_analyzer import run_trust_analysis
from app.ml.classifier import predict_phishing
from app.ml import url_guard

# Sample emails to test
emails = {
    "1. Obvious Phishing Email (Typosquatted & Brand Impersonation)": """From: "PayPal Billing" <security@paypa1-updates.xyz>
To: victim@gmail.com
Subject: URGENT: Your account has been restricted!
Reply-To: scammer@hackermail.net
Content-Type: text/plain

Dear Customer,
We detected suspicious activity on your PayPal account. You must verify your credit card details immediately or your account will be permanently suspended.
Click here to unlock your account: http://paypal.security-alert-login.xyz/verify
""",

    "2. Legitimate Google Email (Clean & Aligned)": """From: "Google Security" <no-reply@accounts.google.com>
To: user@gmail.com
Subject: Security alert for your linked Google account
Content-Type: text/plain

Hi User,
We noticed a new login to your Google Account on a Windows device. If this was you, you don't need to do anything. If this wasn't you, please review your activity.
""",

    "3. Spoofed Display Name & Reply-To Mismatch": """From: "CEO Office" <hacker@temporarydomain.com>
To: employee@company.com
Subject: Quick Request
Reply-To: boss-personal-mail@gmail.com
Content-Type: text/plain

Are you at your desk? I need you to purchase some gift cards for a client immediately.
""",

    "4. URL Guard ML Target (Subtle Phishing Link)": """From: "Support" <support@billing.com>
To: user@gmail.com
Subject: Account verification required
Content-Type: text/plain

Please verify your identity.
Click here: http://secure-paypal-login-update.com/verification
"""
}

def validate_pipeline():
    print("==============================================================")
    print("                 PIPELINE VALIDATION RUN                      ")
    print("==============================================================\n")

    for name, raw_email in emails.items():
        print(f"--- Testing: {name} ---")
        
        # 1. Parse
        parsed = parse_email(raw_email)
        
        # 2. Extract features
        features = extract_all_features(parsed)
        
        # 2.5. URL Guard
        url_guard_result = url_guard.scan_urls(parsed["urls"])
        
        # 3. Model predict
        # Predict uses DistilBERT model
        probs = predict_phishing(parsed["body_text"])
        ai_prob = probs[1]
        
        # 4. Trust analysis
        trust_analysis = run_trust_analysis(parsed, ai_prob, features)
        
        # 5. Threat Score
        score_result = compute_score(ai_prob, features, trust_analysis, url_guard_result)
        
        # Output Results
        print(f"  AI Phishing Probability: {round(ai_prob * 100, 2)}%")
        print(f"  Threat Score:           {score_result['score']} / 100")
        print(f"  Threat Risk Level:      {score_result['risk_level']}")
        print(f"  Trust Score:            {trust_analysis['trust_score']} / 100")
        print(f"  Trust Risk Level:       {trust_analysis['risk_level']}")
        if url_guard_result["url_guard_active"]:
            print(f"  URL Guard Checked:      {url_guard_result['checked']}")
            print(f"  URL Guard Flagged:      {url_guard_result['flagged']}")
            if url_guard_result['flagged_urls']:
                print(f"  URL Guard Bad URLs:     {url_guard_result['flagged_urls']}")
        print("  Deductions Applied:")
        for dec in trust_analysis['deductions']:
            print(f"    - {dec}")
        print("  Suspicious Flags Triggered:")
        for flag in score_result['flags']:
            print(f"    - {flag}")
        print("-" * 60)
        print()

if __name__ == "__main__":
    validate_pipeline()
