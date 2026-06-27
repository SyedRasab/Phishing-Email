from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

from app.core.config import DISTILBERT_PATH

MODEL_PATH = str(DISTILBERT_PATH)

def analyze_model():
    print("Loading model from:", MODEL_PATH)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.eval()

    print("Model loaded successfully!")
    print("Model Config:")
    print(f"Num Labels: {model.config.num_labels}")
    print(f"ID2Label: {model.config.id2label}")

    test_texts = [
        "Your account has been suspended. Please click here to verify.",
        "Hey team, just wanted to check if we are still on for the meeting tomorrow at 10 AM.",
        "URGENT: Invoice attached for your immediate payment."
    ]

    print("\nRunning sample predictions...")
    for text in test_texts:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
        with torch.no_grad():
            outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1)[0].tolist()
        print(f"\nText: {text}")
        print(f"Legit (0): {probs[0]:.4f}")
        print(f"Phishing (1): {probs[1]:.4f}")

if __name__ == "__main__":
    analyze_model()