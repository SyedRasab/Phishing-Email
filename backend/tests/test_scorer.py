from app.services.parser import parse_email
from app.services.features import extract_all_features
from app.services.scorer import compute_score

fake_email = """From: paypa1-support@suspicious-domain.xyz
To: victim@gmail.com
Subject: URGENT: Your account will be suspended!
Reply-To: scammer@evil.com
Content-Type: text/plain

Dear Customer,

Your PayPal account has been limited. You must verify your 
password and credit card details immediately or your account 
will be suspended!

Click here to verify: http://paypal.fake-login.xyz/verify

PayPal Security Team
"""

# Step 1: parse the email
parsed = parse_email(fake_email)

# Step 2: extract features
features = extract_all_features(parsed)

# Step 3: compute score
# We dont have AI model yet so we use 0.0 for now
# In a later step we will replace 0.0 with the real AI probability
result = compute_score(0.0, features)

print("=== THREAT SCORE RESULT ===")
print(f"Score:      {result['score']} / 100")
print(f"Risk Level: {result['risk_level']}")
print()
print("=== FLAGS (why this email is suspicious) ===")
for flag in result["flags"]:
    print(f"  - {flag}")