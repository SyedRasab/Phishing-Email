# PhishGuard API Reference

The PhishGuard FastAPI backend provides REST endpoints for scans, administration, custom rules, statistics, and training simulations.

## Base URL
Default local development URL: `http://localhost:8000`

---

## 1. Scan Endpoints

### POST `/scan/text`
Analyzes raw email text and calculates security threat metrics.
- **Request Body**:
  ```json
  {
    "email_text": "string (raw RFC 2822 or plain text content)",
    "user_email": "string (optional sender/recipient context)",
    "gmail_message_id": "string (optional message id)"
  }
  ```
- **Response**: Returns standard `ScanResult`.

### POST `/scan/file`
Analyzes an uploaded raw email file (e.g., `.eml`).
- **Request Content-Type**: `multipart/form-data`
- **Response**: Returns standard `ScanResult`.

### GET `/scan/{scan_id}`
Retrieves detailed metadata for a specific scan.
- **Response**: JSON scan record with headers, body content, and ML outputs.

### POST `/scan/{scan_id}/review`
Flags a scan record for administrator audit/review.
- **Response**: `{"message": "Scan flagged for admin review"}`

### POST `/scan/{scan_id}/resolve`
Resolves a pending review with a final manual override verdict.
- **Request Body**:
  ```json
  {
    "verdict": "phishing" | "legitimate"
  }
  ```

---

## 2. Rules Endpoints

### GET `/rules`
Fetches all custom whitelist/blacklist rules for a user.
- **Query Parameters**: `user_email` (required)
- **Response**: Array of rules.

### POST `/rules`
Creates a custom rule to whitelist or blacklist an email/domain.
- **Request Body**:
  ```json
  {
    "user_email": "string",
    "pattern": "string (e.g. boss@company.com or domain.com)",
    "rule_type": "email" | "domain",
    "status": "safe" | "spam"
  }
  ```

### DELETE `/rules/{rule_id}`
Deletes a custom rule by ID.
- **Query Parameters**: `user_email` (required)

---

## 3. Administration & Users

### GET `/users`
Lists all registered users.

### POST `/users`
Registers a new user/employee.
- **Request Body**:
  ```json
  {
    "email": "string",
    "role": "employee" | "admin"
  }
  ```

### GET `/stats`
Aggregates scan counts, phishing incidents, and threat metrics.
- **Query Parameters**: `user_email` (optional)
- **Response**: Total scans, safe/suspicious ratios, and trends.

---

## 4. Simulation Endpoints

### POST `/users/{email}/simulate`
Triggers a simulated phishing email attack on a specific user.
- **Request Body**:
  ```json
  {
    "template": "string (name of template)"
  }
  ```

### POST `/scan/{scan_id}/simulation-action`
Tracks user action (e.g. clicked on simulation link) to compute vulnerability ratings.
- **Request Body**:
  ```json
  {
    "action": "clicked" | "reported"
  }
  ```
