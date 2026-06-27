from app.services.parser import parse_email
from app.services.features import extract_all_features

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

parsed = parse_email(fake_email)
features = extract_all_features(parsed)

print("=== EXTRACTED FEATURES ===")
for key, value in features.items():
    print(f"{key}: {value}")