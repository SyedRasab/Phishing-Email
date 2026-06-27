import email
import email.utils
import re
from bs4 import BeautifulSoup


def parse_email(raw_email):

    # Parse the raw email
    msg = email.message_from_string(raw_email)

    # --- EXTRACT HEADERS ---
    sender = msg.get("From", "")
    subject = msg.get("Subject", "")
    reply_to = msg.get("Reply-To", "")
    return_path = msg.get("Return-Path", "")
    dkim_signature = msg.get("DKIM-Signature", "")
    authentication_results = msg.get("Authentication-Results", "")

    # Extract display name and email address separately
    display_name, sender_email = email.utils.parseaddr(sender)

    # Extract sender domain from email address
    sender_domain = ""
    if "@" in sender_email:
        sender_domain = sender_email.split("@")[-1].strip().strip(">")
    elif "@" in sender:
        sender_domain = sender.split("@")[-1].strip().strip(">")

    # --- EXTRACT BODY ---
    body_text = ""
    body_html = ""

    for part in msg.walk():
        content_type = part.get_content_type()

        if content_type == "text/plain":
            try:
                body_text += part.get_payload(decode=True).decode("utf-8", errors="ignore")
            except:
                pass

        elif content_type == "text/html":
            try:
                body_html += part.get_payload(decode=True).decode("utf-8", errors="ignore")
            except:
                pass

    # Fallback: if body_text is empty but we have body_html, extract text from HTML for AI analysis
    if not body_text.strip() and body_html:
        try:
            soup = BeautifulSoup(body_html, "lxml")
            # Remove scripts and styles
            for script in soup(["script", "style"]):
                script.decompose()
            body_text = soup.get_text(separator=' ')
            # Clean up extra spaces
            body_text = re.sub(r'\s+', ' ', body_text).strip()
        except:
            pass

    # --- EXTRACT URLS ---
    urls = []

    # From HTML body
    if body_html:
        soup = BeautifulSoup(body_html, "lxml")
        for a_tag in soup.find_all("a", href=True):
            urls.append(a_tag["href"])

    # From plain text body
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    urls += re.findall(url_pattern, body_text)

    # Remove duplicates
    urls = list(set(filter(None, urls)))

    # --- EXTRACT ATTACHMENTS ---
    attachments = []

    for part in msg.walk():
        filename = part.get_filename()
        if filename:
            attachments.append({
                "filename": filename,
                "content_type": part.get_content_type()
            })

    # --- RETURN EVERYTHING ---
    result = {
        "sender": sender,
        "sender_email": sender_email,
        "sender_domain": sender_domain,
        "display_name": display_name,
        "subject": subject,
        "reply_to": reply_to,
        "return_path": return_path,
        "dkim_signature": dkim_signature,
        "authentication_results": authentication_results,
        "body_text": body_text,
        "body_html": body_html,
        "urls": urls,
        "attachments": attachments
    }

    return result