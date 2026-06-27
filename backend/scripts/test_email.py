import requests
import json

email_text = """From: "PayPal Security" <alerts@paypa1-secure-billing.com>
To: target@gmail.com
Reply-To: hacker-inbox-123@protonmail.com
Subject: URGENT: Your account has been temporarily restricted!
Date: Sun, 14 Jun 2026 10:00:00 +0000
Content-Type: text/plain

Dear Customer,

We detected unusual activity regarding your recent transaction. To protect your funds, we have temporarily restricted your PayPal account.

You must verify your identity immediately to restore access and prevent permanent suspension of your account.

Please click the secure link below to update your billing information:
http://paypal-verification-update-login.com/auth/login

Failure to verify within 24 hours will result in permanent account closure.

Thank you,
PayPal Security Team"""

try:
    response = requests.post('http://localhost:8000/scan/text', json={'email_text': email_text})
    if response.status_code == 200:
        print("TEST SUCCESSFUL!")
        print("----------------")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"API Error {response.status_code}: {response.text}")
except Exception as e:
    print(f"Connection Error: {e}")
