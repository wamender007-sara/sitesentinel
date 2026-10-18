# SiteSentinel n8n Automation & Gmail Setup Guide

## Overview
SiteSentinel uses [n8n](https://n8n.io/) to automate scheduled audits, auditor digest notifications, and dispatching human-approved bug reports.

## Hard Rule Compliance
- **Rule 4**: No email is EVER sent automatically on raw scan detection. Emails are dispatched exclusively when a report record has been explicitly transitioned to `status = 'approved'` via the human review queue.
- **Rate Limiting**: Dispatch workflow enforces a 60-second delay between outgoing emails and stops if no recipient email is associated with the domain.
- **Safety Fallback**: In development, emails are routed to `TEST_EMAIL_RECIPIENT` or `GMAIL_USER` to prevent accidental delivery to real site owners.

---

## 1. Running n8n with Docker Compose
n8n is bundled in the root `docker-compose.yml`.

Start the services:
```bash
docker compose up -d postgres n8n
```
The n8n editor interface will be available at: `http://localhost:5678/`

---

## 2. Connecting Gmail Credentials in n8n (Manual OAuth2 Step)
To allow n8n to send emails through your Gmail account:
1. Open `http://localhost:5678/` in your browser.
2. Go to **Credentials** in the left menu > click **Add Credential**.
3. Search for **Gmail OAuth2 API** (or **Gmail / SMTP** using App Passwords).
4. For Google OAuth2:
   - Create a Google Cloud project with the Gmail API enabled.
   - Configure the OAuth Consent Screen and create OAuth 2.0 Client Credentials.
   - Set the Redirect URI in Google Cloud Console to the Callback URL shown in n8n (e.g. `http://localhost:5678/rest/oauth2-credential/callback`).
   - Enter your Client ID and Client Secret in n8n and click **Connect my account**.
5. Save the credential as `Gmail account`.

---

## 3. Importing SiteSentinel Workflows
The workflows are located in `n8n/workflows/`:
1. `n8n/workflows/scheduled-scan.json` - Scheduled daily scan (2 AM) of configured sites.
2. `n8n/workflows/approval-digest.json` - 30-minute auditor reminder if pending reports exist.
3. `n8n/workflows/send-approved-reports.json` - Dispatches approved reports and marks them as sent.
4. `n8n/workflows/error-alert.json` - Global error alerting on workflow failure.

### How to Import:
1. In n8n, click **Workflows** > **Add Workflow**.
2. Click the top-right `...` menu > **Import from File**.
3. Select the target `.json` file from `n8n/workflows/`.
4. Ensure the Gmail node references your configured Gmail credential.
5. Toggle the workflow to **Active** (top right switch).
