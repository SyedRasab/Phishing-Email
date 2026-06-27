import sys
import os
import json
from urllib.parse import urlparse

from app.services.trust_analyzer import analyze_domain_age

urls = [
    "https://web.whatsapp.com/",
    "https://zenith-gleam-nexus.lovable.app/",
    "google.com"
]

results = {}
for u in urls:
    # Handle domain extraction
    if not u.startswith("http"):
        u = "http://" + u
    domain = urlparse(u).netloc
    
    # Strip subdomains for age check if needed, but analyze_domain_age handles full domain or base domain?
    # Usually we pass the base domain, e.g. "whatsapp.com" instead of "web.whatsapp.com". 
    # Let's pass what urlparse gives first, then strip 'www.' if present
    if domain.startswith('www.'):
        domain = domain[4:]
        
    print(f"Testing Domain: {domain}")
    age_info = analyze_domain_age(domain)
    results[u] = age_info

print("\n--- RESULTS ---")
print(json.dumps(results, indent=2))
