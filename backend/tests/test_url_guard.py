import pytest
from unittest.mock import MagicMock
import sys
import os

from app.ml import url_guard

class MockVectorizer:
    def transform(self, urls):
        # Pass through the urls for the mock model
        return urls

class MockModel:
    def predict(self, X):
        # Dummy logic: flag any URL that contains "phishing" or "bad"
        return ['bad' if ('phishing' in url or 'bad' in url) else 'good' for url in X]

def test_url_guard_normal():
    # Setup mock active state
    url_guard.url_guard_active = True
    url_guard.vectorizer = MockVectorizer()
    url_guard.model = MockModel()

    result = url_guard.scan_urls(["http://google.com", "https://paypal.com"])
    assert result["checked"] == 2
    assert result["flagged"] == 0
    assert result["url_guard_active"] == True
    assert result["flagged_urls"] == []

def test_url_guard_flagged():
    url_guard.url_guard_active = True
    url_guard.vectorizer = MockVectorizer()
    url_guard.model = MockModel()

    result = url_guard.scan_urls(["http://google.com", "http://bad-login-update.com", "https://phishing-site.xyz"])
    assert result["checked"] == 3
    assert result["flagged"] == 2
    assert result["url_guard_active"] == True
    assert result["flagged_urls"] == ["http://bad-login-update.com", "https://phishing-site.xyz"]

def test_url_guard_empty():
    url_guard.url_guard_active = True
    url_guard.vectorizer = MockVectorizer()
    url_guard.model = MockModel()

    result = url_guard.scan_urls([])
    # Empty list should return the safe default and active=False in the response
    assert result["checked"] == 0
    assert result["flagged"] == 0
    assert result["url_guard_active"] == False

def test_url_guard_inactive():
    # Simulate a load failure / disabled state
    url_guard.url_guard_active = False
    url_guard.vectorizer = None
    url_guard.model = None

    result = url_guard.scan_urls(["http://google.com"])
    assert result["checked"] == 0
    assert result["flagged"] == 0
    assert result["url_guard_active"] == False
    assert result["flagged_urls"] == []

def test_url_guard_exception_during_scan():
    # Simulate an error during prediction
    url_guard.url_guard_active = True
    
    class CrashingModel:
        def predict(self, X):
            raise Exception("Model crashed!")
            
    url_guard.vectorizer = MockVectorizer()
    url_guard.model = CrashingModel()

    result = url_guard.scan_urls(["http://google.com"])
    # Should safely catch and return defaults
    assert result["checked"] == 0
    assert result["flagged"] == 0
    assert result["url_guard_active"] == False
