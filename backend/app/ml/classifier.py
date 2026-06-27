from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import os

# ============================================================
# LOAD MODEL — runs once when the API starts
# ============================================================

from app.core.config import DISTILBERT_PATH

# Path to your trained model
MODEL_PATH = str(DISTILBERT_PATH)

print("Loading model from:", MODEL_PATH)

# Load tokenizer and model from your saved files
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

# Put model in evaluation mode — important, do not skip this
model.eval()

print("Model loaded successfully")
print("Number of labels:", model.config.num_labels)


# ============================================================
# PREDICT FUNCTION
# Takes email text, returns phishing probability
# ============================================================

def predict_phishing(email_text: str):

    # Truncate text to 512 tokens — DistilBERT maximum
    inputs = tokenizer(
        email_text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512
    )

    # Run through model without calculating gradients
    # torch.no_grad() makes it faster and uses less memory
    with torch.no_grad():
        outputs = model(**inputs)

    # outputs.logits are raw scores — we convert to probabilities
    probabilities = torch.softmax(outputs.logits, dim=1)

    # Get all probabilities as a list
    probs = probabilities[0].tolist()

    print("Raw probabilities:", probs)
    print("Number of labels:", model.config.num_labels)

    return probs