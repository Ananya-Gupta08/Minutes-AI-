# Minutes AI startup and deployment

## Local startup: PowerShell

Backend terminal:

```powershell
Set-Location 'C:\Users\Ananya Gupta\Desktop\mini desktop\Minutes AI\backend'
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -c requirements.lock.txt
$env:DATABASE_URL='sqlite:///./minutes_ai.db'
$env:CORS_ORIGINS='http://localhost:3000,http://127.0.0.1:3000'
$env:SEED_DEMO='true'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend terminal:

```powershell
Set-Location 'C:\Users\Ananya Gupta\Desktop\mini desktop\Minutes AI\frontend'
npm ci
$env:NEXT_PUBLIC_API_URL='http://localhost:8000/api'
npm run build
npm run start
```

Open http://localhost:3000/meetings and http://localhost:8000/docs. Use Python 3.14 and Node 24. Existing virtual environments can be reused. For development use npm run dev instead of build/start. Explicit environment assignments override audit-session URLs. Rebuild whenever the API endpoint changes.

## Environment variables

| Variable | Local | Production |
| --- | --- | --- |
| NEXT_PUBLIC_API_URL | http://localhost:8000/api | https://YOUR-RAILWAY-DOMAIN/api (frontend build time) |
| DATABASE_URL | sqlite:///./minutes_ai.db | sqlite:////data/minutes_ai.db |
| CORS_ORIGINS | http://localhost:3000,http://127.0.0.1:3000 | Exact Vercel origin, no trailing slash |
| SEED_DEMO | true | true for demo; false for initially empty installation |
| PORT | Docker default 8000 | Railway supplies this |

No API keys required. CORS origins are comma-separated; add custom/preview origins explicitly. Backend loads backend/.env; frontend can use .env.local. Seeding happens once per database and does not resurrect deleted meetings.

## Railway backend

1. Connect the repository and create service minutes-ai-api.
2. Root Directory: /backend. Builder: Dockerfile. Dockerfile Path: Dockerfile. Config File: /backend/railway.toml (repository-relative).
3. Attach a persistent volume at /data. Use one replica.
4. Set DATABASE_URL=sqlite:////data/minutes_ai.db, SEED_DEMO=true and CORS_ORIGINS=https://YOUR-VERCEL-PROJECT.vercel.app.
5. Health Check Path: /api/health. Timeout: 120 seconds. Generate a public HTTPS domain.
6. No custom start command: Dockerfile runs `exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`. Deploy and verify /api/health and /docs.

After configuring the project/service, deploy from the repository root:

```powershell
npx @railway/cli login
npx @railway/cli link
npx @railway/cli up --service minutes-ai-api
```

Select the configured project/environment when link prompts. Official references: [CLI deployment](https://docs.railway.com/cli/deploying), [volumes](https://docs.railway.com/volumes).

## Vercel frontend

1. Import the same repository. Root Directory: frontend. Framework: Next.js. Node.js: 24.x.
2. Install Command: npm ci. Build Command: npm run build. Keep default framework output directory.
3. Production environment: NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN/api. Deploy.
4. Update Railway CORS_ORIGINS to the actual Vercel origin and restart/redeploy the API. Rebuild Vercel after API URL changes.

Alternatively, from frontend/ use CLI with a project rooted in the uploaded frontend directory; do not additionally nest its root as frontend for this directory-only upload:

```powershell
npx vercel login
npx vercel link
npx vercel env add NEXT_PUBLIC_API_URL production
npx vercel deploy --prod
```

Enter the actual Railway URL including /api at the environment prompt. Repository import is simplest for monorepo continuous deployment. See [Vercel CLI deployment](https://vercel.com/docs/cli/deploy).

## Readiness and next action

Local build and browser/backend checks pass. Hosting configuration is ready; no public deployment is claimed. **Not verified: Docker daemon unavailable.** No Docker repair is required.

Next: create/connect a Git repository to Railway and Vercel, apply these settings, and add public URLs to README. After deployment create a test meeting, restart the API, confirm persistence and delete it. This is a single-user demo without authentication; use demo content.
