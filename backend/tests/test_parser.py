from app.services.parser import parse_email

# This is a fake phishing email we made up to test with
fake_email = """From: paypa1-support@suspicious-domain.xyz
To: victim@gmail.com
Subject: URGENT: Your account will be suspended!
Reply-To: scammer@evil.com
Content-Type: text/plain

Dear Customer,

Your PayPal account has been limited. You must verify your 
information immediately or your account will be suspended.

Click here to verify: http://paypal.fake-login.xyz/verify

Enter your password and credit card details to continue.

PayPal Security Team
"""

result = parse_email(fake_email)

print("=== PARSED EMAIL ===")
print("Sender:       ", result["sender"])
print("Domain:       ", result["sender_domain"])
print("Subject:      ", result["subject"])
print("Reply-To:     ", result["reply_to"])
print("URLs found:   ", result["urls"])
print("Attachments:  ", result["attachments"])
print("Body preview: ", result["body_text"][:100])