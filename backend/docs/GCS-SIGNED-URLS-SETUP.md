# GCS Signed URLs Setup for Cloud Run

This guide configures the correct IAM permissions so AI preview thumbnails and project attachments load via signed URLs in production.

## Which Service Account Cloud Run Uses

Your backend deploys with **`github-actions-sa@chapadevs-468722.iam.gserviceaccount.com`** (from the deploy workflow). That is the Cloud Run service account.

## Step 1: Grant Service Account Token Creator (Required)

The service account needs permission to sign blobs (needed for GCS signed URLs).

### Option A: Google Cloud Console

1. Go to **IAM & Admin** → **IAM** (`https://console.cloud.google.com/iam-admin/iam?project=chapadevs-468722`)
2. Click **Grant access** (or **+ ADD**)
3. **New principals**: `github-actions-sa@chapadevs-468722.iam.gserviceaccount.com`
4. **Role**: search and select **Service Account Token Creator**
5. Click **Save**

### Option B: gcloud CLI

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-sa@chapadevs-468722.iam.gserviceaccount.com \
  --member="serviceAccount:github-actions-sa@chapadevs-468722.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --project=chapadevs-468722
```

## Step 2: Cloud Run Security Tab (Verify)

In the Cloud Run deployment panel:

1. Open **chapadevs-backend** → **Edit & deploy new revision**
2. Go to the **Segurança** (Security) tab
3. **Conta de serviço** (Service account): ensure **GitHub Actions Service Account** (`github-actions-sa@chapadevs-468722.iam.gserviceaccount.com`) is selected
4. Deploy if you changed anything

## Step 3: GCS Bucket Access

The service account must be able to read from the bucket. If it is not already:

1. Go to **Cloud Storage** → **chapadevs-website** bucket
2. **Permissions** → **Grant access**
3. **Principal**: `github-actions-sa@chapadevs-468722.iam.gserviceaccount.com`
4. **Role**: **Storage Object Viewer**

## Summary

| Where | What | Action |
|-------|------|--------|
| IAM & Admin | Service Account Token Creator | Grant to `github-actions-sa@...` on itself |
| Cloud Run Security | Service account | Use GitHub Actions SA |
| GCS Bucket | Storage Object Viewer | Grant to GitHub Actions SA |

After Step 1, redeploy or wait for the next deploy. Signed URLs should work without code changes.
