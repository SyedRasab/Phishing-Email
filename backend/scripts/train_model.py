import os
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW

import sys
# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import ML_MODELS_DIR

# Define model paths
OUTPUT_DIR = os.path.join(ML_MODELS_DIR, "final_model_v2")
BASE_MODEL = os.path.join(ML_MODELS_DIR, "final_model")

# 1. Prepare Balanced Training Data (Safe Bank/Tech templates vs Phishing templates)
DATASET = [
    # --- LEGITIMATE / SAFE SAMPLES ---
    {
        "text": "Dear Customer, your HBL account has been credited with PKR 15,000 from Ali Khan. Available balance is PKR 45,200. Thank you for banking with Habib Bank Limited.",
        "label": 0
    },
    {
        "text": "Meezan Bank Transaction Alert: A debit transaction of PKR 2,500 was performed on your Visa Card ending in 4321 at ATM. Remaining balance: PKR 12,000.",
        "label": 0
    },
    {
        "text": "Bank Alfalah Login Notification: We detected a successful login to your Alfa Internet Banking app from device Samsung S21. If this was you, no action is needed.",
        "label": 0
    },
    {
        "text": "Standard Chartered Alert: Your monthly e-statement for Account ending 9876 is ready for download. Please login to SC Mobile app to view your statement.",
        "label": 0
    },
    {
        "text": "Security Alert: A new device signed in to your Google Account. If this was you, you do not need to do anything. Otherwise, please secure your account.",
        "label": 0
    },
    {
        "text": "Microsoft Account Password Reset: Use the security code 584930 to reset your password. If you didn't request this, you can safely ignore this email.",
        "label": 0
    },
    {
        "text": "Hi, your monthly Netflix subscription of USD 9.99 was successfully charged. Your next billing date is July 18, 2026.",
        "label": 0
    },
    {
        "text": "Your Amazon order #408-9283-11 has been shipped and will arrive tomorrow. Track your package on your Amazon account page.",
        "label": 0
    },
    {
        "text": "Meeting invitation: Project status update scheduled for tomorrow at 10:00 AM via Google Meet. Please RSVP.",
        "label": 0
    },
    {
        "text": "Weekly newsletter from GitHub: Top trending repositories this week in Python, JavaScript, and Machine Learning.",
        "label": 0
    },

    # --- PHISHING SAMPLES ---
    {
        "text": "URGENT: Your HBL Mobile Account is suspended due to security reasons. Click here to verify your login credentials immediately to restore access: http://hbl-verify-portal.xyz/login",
        "label": 1
    },
    {
        "text": "Meezan Bank Notification: Unusual activity detected on your bank card. Your debit card has been blocked. Enter your PIN and card details now to unblock: http://meezan-cards-online.xyz",
        "label": 1
    },
    {
        "text": "ATTENTION: Bank Alfalah customer, your account requires urgent KYC verification. Failure to verify credit card details in 24 hours will result in permanent account closure: http://alfa-kyc-verify.net",
        "label": 1
    },
    {
        "text": "PayPal Billing Department: You received an invoice of USD 500. Click link below to cancel this transaction if you did not authorize it: http://paypal.invoice-check.xyz",
        "label": 1
    },
    {
        "text": "Google Security Alert: Someone has your password! Confirm your identity immediately by clicking here or your account will be deleted: http://google.security-login-portal.com",
        "label": 1
    },
    {
        "text": "Dear user, your Microsoft Outlook storage is full. Please login here to upgrade your storage for free: http://microsoft-outlook-upgrade.xyz",
        "label": 1
    },
    {
        "text": "Congratulations! You have won a cash prize of USD 1,000,000. Send your bank account and ID details immediately to claim your lottery funds: lottery-admin@scammail.com",
        "label": 1
    },
    {
        "text": "Urgent Action Required: Your Netflix account has been suspended due to billing error. Update your credit card payment details now: http://netflix-billing-recovery.xyz",
        "label": 1
    },
    {
        "text": "Dear customer, your DHL delivery is pending. Pay the shipping fee of PKR 500 using your credit card now: http://dhl-payment-delivery.top",
        "label": 1
    },
    {
        "text": "Your account has been hacked. We have recorded video footage of you. Send 500 USD in Bitcoin to our wallet address or we will leak it to your friends.",
        "label": 1
    }
]

# Duplicate the dataset multiple times to have enough steps for fine-tuning
TRAINING_DATA = DATASET * 15  # 300 samples

class PhishingDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=256):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]

        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.max_len,
            return_tensors="pt"
        )

        return {
            "input_ids": encoding["input_ids"].flatten(),
            "attention_mask": encoding["attention_mask"].flatten(),
            "labels": torch.tensor(label, dtype=torch.long)
        }

def train_model():
    print("Initializing tokenizer and loading base model...")
    # Load tokenizer and base model
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(BASE_MODEL, num_labels=2)

    # Split into texts and labels
    texts = [item["text"] for item in TRAINING_DATA]
    labels = [item["label"] for item in TRAINING_DATA]

    # Create dataset and dataloader
    dataset = PhishingDataset(texts, labels, tokenizer)
    dataloader = DataLoader(dataset, batch_size=8, shuffle=True)

    # Setup vanilla PyTorch training loop on CPU
    device = torch.device("cpu")
    model.to(device)
    optimizer = AdamW(model.parameters(), lr=2e-5)

    print("Starting fine-tuning on balanced dataset (vanilla PyTorch CPU)...")
    model.train()
    
    epochs = 2
    for epoch in range(epochs):
        total_loss = 0
        for batch_idx, batch in enumerate(dataloader):
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            batch_labels = batch["labels"].to(device)

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=batch_labels
            )
            
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            if (batch_idx + 1) % 10 == 0:
                print(f"Epoch {epoch+1}/{epochs} | Batch {batch_idx+1}/{len(dataloader)} | Loss: {loss.item():.4f}")

        print(f"Epoch {epoch+1}/{epochs} Completed | Average Loss: {total_loss / len(dataloader):.4f}")

    print(f"Saving fine-tuned model to: {OUTPUT_DIR}")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print("Fine-tuning completed successfully!")

if __name__ == "__main__":
    train_model()
