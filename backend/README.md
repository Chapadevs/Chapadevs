# Chapadevs CRM Backend API

Backend API for the Chapadevs CRM system built with Node.js, Express, and MongoDB (Mongoose).

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file with the following variables:

```env
MONGO_URI=your-mongodb-atlas-connection-string
DB_NAME=chapadevs_crm
JWT_SECRET=your-secret-key
BACKEND_PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Optional – Email (Gmail API with Google Workspace):**  
Inquiry form and account confirmation emails are sent via Gmail API when these are set:

- `GMAIL_SERVICE_ACCOUNT_JSON` – JSON string of the service account key (from Google Cloud Console), or
- `GMAIL_SERVICE_ACCOUNT_PATH` – Path to a JSON file containing the service account key
- `GMAIL_DELEGATED_USER` – Workspace user to impersonate (e.g. `noreply@chapadevs.com`). Requires [domain-wide delegation](https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority) for the service account in Google Workspace Admin.
- `FROM_EMAIL` / `FROM_NAME` – Sender display (defaults to delegated user and "Chapadevs")
- `ADMIN_EMAIL` – Recipient for inquiry notifications (e.g. `admin@chapadevs.com`)

If Gmail env vars are not set, the server still runs; inquiry and welcome emails are not sent (and the API returns an error for inquiry submit when email is unavailable).

**Next steps to enable email (after adding the client in Workspace Admin):**

1. **Local development**
   - Put your service account JSON key file somewhere safe (e.g. `backend/gmail-sa-key.json`) and **do not commit it** (it’s in `.gitignore`).
   - In `backend/.env` add:
     - `GMAIL_SERVICE_ACCOUNT_PATH=./gmail-sa-key.json` (or the full path to the JSON file), **or** paste the whole JSON as one line into `GMAIL_SERVICE_ACCOUNT_JSON` (harder in `.env`).
     - `GMAIL_DELEGATED_USER=noreply@chapadevs.com` (or the Workspace user that should send mail).
     - Optionally: `ADMIN_EMAIL=admin@chapadevs.com`, `FROM_EMAIL`, `FROM_NAME`, `FRONTEND_URL`.
   - Restart the backend and test: submit the inquiry form or register a new user.

2. **Production (Cloud Run)**
   - In **GitHub** → repo **Settings** → **Secrets and variables** → **Actions**: add secrets `GMAIL_DELEGATED_USER` and `ADMIN_EMAIL` (the values, e.g. `noreply@chapadevs.com` and `admin@chapadevs.com`).
   - In **Google Cloud**: create a Secret Manager secret with the service account JSON:
     - **Security** → **Secret Manager** → **Create secret** → name `gmail-sa-json`, value = contents of your JSON key file (upload or paste). Grant the Cloud Run service account (e.g. `github-actions-sa@...`) access to this secret (Secret Manager Secret Accessor).
   - On the next deploy, the workflow will pass `GMAIL_DELEGATED_USER` and `ADMIN_EMAIL` to Cloud Run and, if the secret `gmail-sa-json` exists, will mount it as `GMAIL_SERVICE_ACCOUNT_JSON`.

### 3. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:3001`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Google Cloud Run deployment instructions.

