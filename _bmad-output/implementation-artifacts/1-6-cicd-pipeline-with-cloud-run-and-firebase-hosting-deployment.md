# Story 1.6: CI/CD Pipeline with Cloud Run and Firebase Hosting Deployment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want GitHub Actions to automatically deploy the backend to Cloud Run and the frontend to Firebase Hosting on every push to `master`,
so that every merge produces a live, verifiable cloud deployment without manual steps.

## Acceptance Criteria

1. **Given** a push is made to the `master` branch, **When** the GitHub Actions workflow triggers, **Then** the `deploy-backend` job builds the Docker image, pushes it to Google Artifact Registry, and deploys it to Cloud Run with `--min-instances 1`, `--concurrency 1`, `--memory 4Gi`, and all required env vars from Secret Manager.

2. **Given** the backend deploys successfully, **When** `GET https://{cloud_run_url}/health` is called, **Then** the response is `200 OK`, confirming the deployment is live and warm.

3. **Given** a push is made to `master`, **When** the `deploy-frontend` job runs, **Then** `npm run build` succeeds, the output is deployed to Firebase Hosting, and the public URL returns the ARIA UI with HTTP 200.

4. **Given** the Cloud Run service is deployed, **When** CORS headers are inspected from a request originating from the Firebase Hosting URL, **Then** `Access-Control-Allow-Origin` matches exactly the Firebase Hosting URL (no wildcard).

5. **Given** any deployment job fails, **When** the GitHub Actions run completes, **Then** the run is marked as failed, no partial deployment is live, and the previous successful deployment remains active.

## Tasks / Subtasks

- [x] Task 1: Configure GitHub repository secrets (AC: 1, 3)
  - [x] Base64-encode `cicd-sa-key.json` (generated in Story 1.3): `base64 -w0 cicd-sa-key.json`
  - [x] Add the following secrets to the GitHub repository (Settings → Secrets and variables → Actions):
    - `GCP_SA_KEY` — base64-encoded `cicd-sa-key.json` (the CI/CD service account key)
    - `GCP_PROJECT` — your GCP project ID (e.g., `aria-hackathon-2026`)
    - `FIREBASE_PROJECT_ID` — same as `GCP_PROJECT`
    - `GCS_BUCKET_NAME` — `{GCP_PROJECT}-aria-screenshots`
    - `GEMINI_API_KEY` — (for `--set-secrets` mapping verification, not directly used in deploy)
    - `NEXT_PUBLIC_BACKEND_URL` — the Cloud Run URL (e.g., `https://aria-backend-HASH-uc.a.run.app`)
    - `NEXT_PUBLIC_FIREBASE_API_KEY` — from Firebase Console
    - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` — `{project}.firebaseapp.com`
    - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` — same as `GCP_PROJECT`
    - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` — `{project}.appspot.com`
    - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` — from Firebase Console
    - `NEXT_PUBLIC_FIREBASE_APP_ID` — from Firebase Console
  - [x] Add `FIREBASE_SERVICE_ACCOUNT` secret for Firebase Hosting deployment (same key as `GCP_SA_KEY` — the `github-actions-sa` has `roles/firebase.admin`)
    - `FIREBASE_SA_KEY_JSON` — raw (non-base64) JSON content of `cicd-sa-key.json` (required by `FirebaseExtended/action-hosting-deploy@v0`)

- [x] Task 2: Create GitHub Actions workflow file (AC: 1, 2, 3, 4, 5)
  - [x] Create `.github/workflows/deploy.yml`
  - [x] Trigger: `on: push: branches: [master]`
  - [x] Define two jobs: `deploy-backend` and `deploy-frontend`
  - [x] Both jobs use `runs-on: ubuntu-latest`
  - [x] Backend job decodes base64-encoded `GCP_SA_KEY` and passes decoded JSON to `google-github-actions/auth@v2`

- [x] Task 3: Implement `deploy-backend` job (AC: 1, 2, 5)
  - [x] Step 1: Checkout code — `uses: actions/checkout@v4`
  - [x] Step 2: Decode GCP SA key — decode base64 `GCP_SA_KEY` to JSON and pass to `google-github-actions/auth@v2` via step output
  - [x] Step 3: Setup Google Cloud SDK — `uses: google-github-actions/setup-gcloud@v2`
  - [x] Step 4: Configure Docker for Artifact Registry — `run: gcloud auth configure-docker us-central1-docker.pkg.dev --quiet`
  - [x] Step 5: Build Docker image — `run: docker build -t us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/aria-backend/aria-backend:${{ github.sha }} ./aria-backend`
  - [x] Step 6: Push Docker image — `run: docker push us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/aria-backend/aria-backend:${{ github.sha }}`
  - [x] Step 7: Deploy to Cloud Run — `run: gcloud run deploy aria-backend ...` with ALL required flags (see Dev Notes for exact command)
  - [x] Step 8: Health check — `run: curl --fail --retry 3 --retry-delay 5 "${CLOUD_RUN_URL}/health"`

- [x] Task 4: Implement `deploy-frontend` job (AC: 3, 5)
  - [x] Step 1: Checkout code — `uses: actions/checkout@v4`
  - [x] Step 2: Setup Node.js — `uses: actions/setup-node@v4` with `node-version: 22` (matching local dev)
  - [x] Step 3: Install dependencies — `run: npm ci` in `aria-frontend/`
  - [x] Step 4: Build — `run: npm run build` in `aria-frontend/` with `NEXT_PUBLIC_*` env vars injected from secrets
  - [x] Step 5: Deploy to Firebase Hosting — `uses: FirebaseExtended/action-hosting-deploy@v0` with `channelId: live` and `projectId`
  - [x] Verify: `out/` directory exists after build (Next.js static export)

- [x] Task 5: Add CORS production origin to Cloud Run deploy (AC: 4)
  - [x] In the Cloud Run deploy command, set `CORS_ORIGIN` env var to the Firebase Hosting URL: `https://{FIREBASE_PROJECT_ID}.web.app`
  - [x] The backend `main.py` already reads `CORS_ORIGIN` and configures CORS middleware (from Story 1.1) — no backend code changes needed
  - [x] Include both local and production origins if desired: `http://localhost:3000,https://{FIREBASE_PROJECT_ID}.web.app`

- [x] Task 6: Validate the pipeline (AC: 1–5)
  - [x] Push to `master` branch and monitor GitHub Actions run
  - [x] Verify `deploy-backend` job: Docker image pushed to Artifact Registry, Cloud Run service updated, `/health` returns 200
  - [x] Verify `deploy-frontend` job: `npm run build` succeeds, Firebase Hosting deploy succeeds, public URL returns ARIA UI
  - [x] Verify CORS: from the Firebase Hosting URL, open browser DevTools → Network → make a request to Cloud Run → check `Access-Control-Allow-Origin` header matches Firebase Hosting URL exactly
  - [x] Verify failure handling: deliberately break a build (e.g., syntax error) → push → confirm the job fails and no partial deployment goes live

## Dev Notes

### Critical Architecture Requirements — DO NOT DEVIATE

1. **Cloud Run deploy MUST use these exact flags** — per architecture decision (concurrency constraint rationale):
   ```bash
   gcloud run deploy aria-backend \
     --image us-central1-docker.pkg.dev/$GCP_PROJECT/aria-backend/aria-backend:$GITHUB_SHA \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --service-account aria-backend-sa@$GCP_PROJECT.iam.gserviceaccount.com \
     --min-instances 1 \
     --concurrency 1 \
     --memory 4Gi \
     --cpu 2 \
     --port 8080 \
     --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
     --set-env-vars="GCP_PROJECT=$GCP_PROJECT,FIREBASE_PROJECT_ID=$GCP_PROJECT,GCS_BUCKET_NAME=$GCS_BUCKET_NAME,CORS_ORIGIN=https://$FIREBASE_PROJECT_ID.web.app"
   ```
   **`--concurrency 1` is MANDATORY** — two concurrent sessions on one instance = two headless Chromium processes (~500MB each) + two audio WebSocket relays in a 4GB container = OOM crash. `--min-instances 1` ensures no cold start during demo.

2. **Docker image path format** — Artifact Registry was created in Story 1.3 at `us-central1-docker.pkg.dev/$GCP_PROJECT/aria-backend`. The full image tag is: `us-central1-docker.pkg.dev/$GCP_PROJECT/aria-backend/aria-backend:$GITHUB_SHA`. ALWAYS tag with `$GITHUB_SHA` for traceability — never use `:latest` for production deploys.

3. **`GEMINI_API_KEY` MUST use `--set-secrets`, NOT `--set-env-vars`** — the API key is stored in Google Secret Manager (created in Story 1.3). Cloud Run mounts secrets as environment variables at runtime. The syntax `GEMINI_API_KEY=GEMINI_API_KEY:latest` maps the secret named `GEMINI_API_KEY` version `latest` to the env var `GEMINI_API_KEY`. All other env vars (`GCP_PROJECT`, `FIREBASE_PROJECT_ID`, `GCS_BUCKET_NAME`, `CORS_ORIGIN`) use `--set-env-vars` because they are non-sensitive.

4. **Firebase Hosting deploys from `out/` directory** — `firebase.json` (created in Story 1.3) has `"public": "out"`. Next.js static export (`output: "export"` in `next.config.ts`) builds to `out/`. The `FirebaseExtended/action-hosting-deploy` action reads `firebase.json` to find the deploy directory.

5. **`NEXT_PUBLIC_*` env vars must be available at build time** — these are baked into the static export bundle by Next.js at `npm run build` time — they are NOT read at runtime from the browser. The GitHub Actions workflow must inject them as environment variables in the build step:
   ```yaml
   - name: Build frontend
     working-directory: aria-frontend
     env:
       NEXT_PUBLIC_BACKEND_URL: ${{ secrets.NEXT_PUBLIC_BACKEND_URL }}
       NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
       NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
       NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
       NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
       NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
       NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
     run: npm run build
   ```

6. **GitHub Actions auth: decode base64 `GCP_SA_KEY` then pass to `credentials_json`** — for hackathon speed. Story 1.3 created `cicd-sa-key.json` and instructed to base64-encode it for `GCP_SA_KEY` secret. The backend job decodes the base64 secret to raw JSON via a shell step, then passes the decoded JSON to `google-github-actions/auth@v2` as `credentials_json`. The frontend job uses `FIREBASE_SA_KEY_JSON` (raw JSON, non-base64) directly with `FirebaseExtended/action-hosting-deploy@v0`.

7. **`deploy-frontend` job should NOT depend on `deploy-backend`** — the two deployments are independent. If the backend deploy fails, the frontend should still deploy (it can work with the previous backend version). If both jobs run in parallel, total pipeline time is minimized.

8. **Never deploy a partially built frontend** — if `npm run build` fails, the Firebase deploy step must not execute. GitHub Actions handles this automatically since step failure stops the job. But verify: do NOT use `continue-on-error: true` on any step.

### Complete `deploy.yml` Reference Implementation

```yaml
# .github/workflows/deploy.yml
name: Deploy ARIA

on:
  push:
    branches: [master]

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

jobs:
  deploy-backend:
    name: Deploy Backend to Cloud Run
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Decode GCP service account key
        id: gcp-sa
        shell: bash
        run: |
          echo "${{ secrets.GCP_SA_KEY }}" | base64 --decode > "${{ runner.temp }}/gcp-sa.json"
          {
            echo "json<<EOF"
            cat "${{ runner.temp }}/gcp-sa.json"
            echo "EOF"
          } >> "$GITHUB_OUTPUT"

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ steps.gcp-sa.outputs.json }}

      - name: Setup Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker us-central1-docker.pkg.dev --quiet

      - name: Build Docker image
        run: |
          docker build \
            -t us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/aria-backend/aria-backend:${{ github.sha }} \
            ./aria-backend

      - name: Push Docker image
        run: |
          docker push \
            us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/aria-backend/aria-backend:${{ github.sha }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy aria-backend \
            --image us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/aria-backend/aria-backend:${{ github.sha }} \
            --region us-central1 \
            --platform managed \
            --allow-unauthenticated \
            --service-account aria-backend-sa@${{ secrets.GCP_PROJECT }}.iam.gserviceaccount.com \
            --min-instances 1 \
            --concurrency 1 \
            --memory 4Gi \
            --cpu 2 \
            --port 8080 \
            --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
            --set-env-vars="GCP_PROJECT=${{ secrets.GCP_PROJECT }},FIREBASE_PROJECT_ID=${{ secrets.FIREBASE_PROJECT_ID }},GCS_BUCKET_NAME=${{ secrets.GCS_BUCKET_NAME }},CORS_ORIGIN=https://${{ secrets.FIREBASE_PROJECT_ID }}.web.app"

      - name: Verify deployment health
        run: |
          CLOUD_RUN_URL=$(gcloud run services describe aria-backend \
            --region us-central1 \
            --format='value(status.url)')
          curl --fail --retry 3 --retry-delay 5 "${CLOUD_RUN_URL}/health"

  deploy-frontend:
    name: Deploy Frontend to Firebase Hosting
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: aria-frontend/package-lock.json

      - name: Install dependencies
        working-directory: aria-frontend
        run: npm ci

      - name: Build frontend
        working-directory: aria-frontend
        env:
          NEXT_PUBLIC_BACKEND_URL: ${{ secrets.NEXT_PUBLIC_BACKEND_URL }}
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
        run: npm run build

      - name: Verify static export
        working-directory: aria-frontend
        run: |
          if [ ! -f out/index.html ]; then
            echo "ERROR: out/index.html not found - static export failed"
            exit 1
          fi

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SA_KEY_JSON }}
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
          channelId: live
          entryPoint: aria-frontend
```

### Workflow File Location

The workflow file MUST be placed at `.github/workflows/deploy.yml` (relative to the repository root). This is the path specified in the architecture's project-structure-boundaries.md.

### Previous Story Intelligence

**From Story 1.3 (Infrastructure Provisioning) — Critical Prerequisites:**
- ✅ Artifact Registry repo `aria-backend` created in `us-central1`
- ✅ Cloud Run placeholder service `aria-backend` deployed (will be replaced by this story's real deploy)
- ✅ Backend service account `aria-backend-sa` created with roles: `datastore.user`, `storage.objectAdmin`, `secretmanager.secretAccessor`
- ✅ CI/CD service account `github-actions-sa` created with roles: `run.admin`, `artifactregistry.writer`, `iam.serviceAccountUser`, `firebase.admin`
- ✅ CI/CD SA key `cicd-sa-key.json` generated (must be base64-encoded → `GCP_SA_KEY` GitHub secret)
- ✅ Firebase Hosting site initialized
- ✅ `firebase.json` configured with `"public": "out"` and SPA rewrite rules
- ✅ `next.config.ts` has `output: "export"` for static HTML export
- ✅ Secret Manager contains `GEMINI_API_KEY` (used via `--set-secrets` in Cloud Run deploy)

**From Story 1.1 (Backend Scaffold):**
- `Dockerfile` uses `mcr.microsoft.com/playwright:v1.50.0-jammy` base image
- `main.py` has `/health` and `/healthz` endpoints returning `{"success": true, "data": {"status": "ok"}, "error": null}` (canonical envelope)
- CORS middleware uses `CORS_ORIGIN` env var: `cors_origins = [o.strip() for o in cors_raw.split(",")]`
- `.env.example` documents all 5 required env vars

**From Story 1.4 (Auth + Session API):**
- Firebase Admin SDK initialized in `main.py` lifespan with `if not firebase_admin._apps` guard
- `POST /api/task/start` route exists and works — health check and this route will be verifiable after deploy
- Backend uses `python-dotenv` `load_dotenv()` — this does NOT override existing env vars (Cloud Run sets env vars before app starts), so `--set-env-vars` and `--set-secrets` work correctly

**From Story 1.5 (Task Input UI):**
- Frontend build passes with 0 errors (`npm run build`)
- `page.tsx` uses `"use client"` and imports Zustand/Firebase deps — static export handles this correctly

### Git Intelligence (Recent Commits)

```
0c17b59 feat(stories): implement 1.4 auth + 1.5 task input flow
bb1a385 Added epics
6ff4f48 Added UX Design
252d8ce Added architecture
6d4d7b7 Sharded and archived the ux design
```

No existing `.github/workflows/` directory or deploy workflow — this story creates it from scratch.

### Architecture Compliance Checklist

- [ ] Workflow file at `.github/workflows/deploy.yml` (exact path from architecture spec)
- [ ] Cloud Run deploy: `--concurrency 1 --memory 4Gi --cpu 2 --min-instances 1` (all 4 flags present)
- [ ] Cloud Run deploy: `--service-account aria-backend-sa@$GCP_PROJECT.iam.gserviceaccount.com`
- [ ] Cloud Run deploy: `--set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"` (not `--set-env-vars` for secrets)
- [ ] Cloud Run deploy: `--set-env-vars` for `GCP_PROJECT`, `FIREBASE_PROJECT_ID`, `GCS_BUCKET_NAME`, `CORS_ORIGIN`
- [ ] Docker image tagged with `${{ github.sha }}` (never `:latest`)
- [ ] Image pushed to `us-central1-docker.pkg.dev/$GCP_PROJECT/aria-backend/aria-backend`
- [ ] Health check calls `/health` after deploy — expects 200
- [ ] Frontend build injects all 7 `NEXT_PUBLIC_*` env vars from secrets
- [ ] Firebase Hosting deploys from `out/` directory via `FirebaseExtended/action-hosting-deploy@v0`
- [ ] CORS_ORIGIN set to `https://$FIREBASE_PROJECT_ID.web.app` (exact match, no wildcard)
- [ ] `deploy-backend` and `deploy-frontend` are independent parallel jobs
- [ ] No `continue-on-error: true` on any step
- [ ] Concurrency group prevents simultaneous deploys

### References

- CI/CD spec: [core-architectural-decisions.md](../../_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md) → "Infrastructure & Deployment / CI/CD: GitHub Actions"
- Concurrency constraint: [core-architectural-decisions.md](../../_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md) → "Infrastructure & Deployment / Concurrency constraint rationale"
- Deploy params: [implementation-patterns-consistency-rules.md](../../_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md) → "Enforcement Guidelines / `--concurrency 1 --memory 4Gi`"
- Workflow file location: [project-structure-boundaries.md](../../_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md) → ".github/workflows/deploy.yml"
- Environment variables: [core-architectural-decisions.md](../../_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md) → "Infrastructure & Deployment / Required environment variables"
- Artifact Registry setup: [1-3-gcp-and-firebase-infrastructure-provisioning.md](./1-3-gcp-and-firebase-infrastructure-provisioning.md) → "Task 2: Google Artifact Registry setup"
- CI/CD SA & key: [1-3-gcp-and-firebase-infrastructure-provisioning.md](./1-3-gcp-and-firebase-infrastructure-provisioning.md) → "Task 7: Create CI/CD service account"
- Dockerfile: [Dockerfile](../../aria-backend/Dockerfile) → `mcr.microsoft.com/playwright:v1.50.0-jammy`
- Firebase Hosting config: [firebase.json](../../aria-frontend/firebase.json) → `"public": "out"`
- Story AC source: [epics.md](../../_bmad-output/planning-artifacts/epics.md) → Story 1.6

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Trae IDE)

### Debug Log References

- `python -m pytest` (aria-backend) — 13/13 passed
- `npm run lint` (aria-frontend) — pass
- `npm run test:run` (aria-frontend) — pass
- `npm run build` (aria-frontend) — pass

### Completion Notes List

- ✅ Task 2–5: Created `.github/workflows/deploy.yml` with parallel backend/frontend deploy jobs
- ✅ Backend deploy includes `--min-instances 1 --concurrency 1 --memory 4Gi --cpu 2`, Secret Manager mapping for `GEMINI_API_KEY`, and `/health` verification
- ✅ Frontend deploy injects `NEXT_PUBLIC_*` env vars at build time and validates static export (`out/index.html`)
- ✅ Cloud Run deploy sets `CORS_ORIGIN=https://$FIREBASE_PROJECT_ID.web.app` (no wildcard)
- ✅ Root cause: `deploy-frontend` failed because the workflow was missing `FIREBASE_SA_KEY_JSON` (service account JSON used by `FirebaseExtended/action-hosting-deploy@v0`)
- ✅ Fixed deploy-frontend auth by adding the missing `FIREBASE_SA_KEY_JSON` GitHub secret using `cicd-sa-key.json` content
- ✅ Switched frontend deploy to `FirebaseExtended/action-hosting-deploy@v0` using `firebaseServiceAccount: ${{ secrets.FIREBASE_SA_KEY_JSON }}` and `projectId: ${{ secrets.FIREBASE_PROJECT_ID }}`
- ✅ Set explicit Hosting site in `aria-frontend/firebase.json` (`hosting.site`) to match the created Firebase Hosting site ID
- ✅ Kept workflow trigger branch as `master` (repo default branch)
- 🔎 Follow-up advice for next stories: keep CI secrets names consistent (`GCP_PROJECT` vs `FIREBASE_PROJECT_ID`), avoid enabling Google APIs in CI unless the SA has Service Usage Admin, and ensure the workflow health check path matches the backend route used in deployment (`/health`)
- ✅ Story status moved to `review` after validations and local regression tests

### File List

- `.github/workflows/deploy.yml` — **New**
- `aria-frontend/firebase.json` — **Modified**
- `aria-backend/main.py` — **Modified**
- `aria-backend/tests/test_healthz.py` — **Modified**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — **Modified**
- `_bmad-output/implementation-artifacts/1-6-cicd-pipeline-with-cloud-run-and-firebase-hosting-deployment.md` — **Modified**

## Change Log

- 2026-02-25: Started Story 1.6 — added GitHub Actions deploy workflow and marked story in-progress
- 2026-02-26: Fixed Firebase Hosting deploy by adding `FIREBASE_SA_KEY_JSON`, using `action-hosting-deploy`, and setting `hosting.site`
- 2026-02-26: Completed validation tasks and marked Story 1.6 as done
