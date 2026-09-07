# Minutes AI strict audit — 7 September 2026

This supersedes the earlier completion report. Actual source, production browser behavior, live HTTP endpoints and SQLite constraints were inspected and tested on Windows with Node 24.14.0, Python 3.14.7, Next 16.3.4 and Google Chrome.

| Requirement | Result | Evidence |
| --- | --- | --- |
| Original branding and required stack | PASS | Minutes AI purple waveform/spark; strict Next/TypeScript frontend and separate FastAPI/SQLAlchemy/SQLite backend |
| Seed library and statistics | PASS | Five diverse meetings, 20 segments each, realistic participants, summaries, topics, chapters and tasks |
| Search, combined filters, sorting, pagination | PASS | Backend coverage plus repeated/same/rapid searches, URL persistence, combined filters and pagination recovery |
| Detail visual quality | PASS | Desktop/mobile screenshots reviewed; readable panels and original styling |
| Player/transcript synchronization | PASS | Play/pause/speed, seek both directions, segment/chapter clicks, gaps, duration end and shortened duration |
| Active transcript visibility | PASS | Actual bounding rectangles inside scroll container, without moving the page |
| Safe transcript search | PASS | Literal HTML-like content stays text, all occurrences highlighted, match cycling and speaker filters |
| Summary, decisions, topics, chapters | PASS | Deterministic analysis; all supplied topics retained within documented 20-topic limit |
| Meeting CRUD | PASS | Creation, read, metadata edit, confirmed deletion and refresh persistence |
| Action CRUD and completion | PASS | Add/edit/complete/delete, persisted refresh and optimistic rollback on API failure |
| TXT/VTT/JSON upload | PASS | Actual browser uploads and refresh; invalid, empty, oversized and malformed data rejected |
| SQLite relationships and persistence | PASS | Direct SQL cascades, orphan rejection, server restart persistence and no deleted-seed resurrection |
| API routes and response codes | PASS | Live HTTP and pytest: 200/201/204/404/422, health, docs, validation and CORS |
| Loading, empty, error, confirmation states | PASS | Delayed responses, injected 503, retry, empty database/search, invalid dates, missing meeting and cancel |
| Responsive and keyboard access | PASS | Desktop/mobile, 320/768/1024 widths, drawer, focus restoration, arrow-key tabs and focusable scroll panel |
| Accessibility | PASS | Zero axe WCAG A/AA violations on library/detail/create/settings in both browser projects |
| Visible controls and exports | PASS | Working handlers/navigation or explicit Coming Soon states; TXT/Markdown exports implemented |
| Environment variables and CORS | PASS | Production API build variable, origin allow/deny tests, configurable DB and seeding |
| README and deployment configuration | PASS | Architecture, schema, API, setup, tradeoffs and Render/Railway/Vercel settings |
| Python, lint, TypeScript, build | PASS | All checks exited 0 |
| Browser console/network | PASS | Zero unexpected console errors, page exceptions, failed requests or HTTP errors on audited normal routes |
| Public deployment | NOT VERIFIED | Requires hosting/repository connection and production domains |
| Docker execution | NOT VERIFIED | Docker daemon unavailable |

## Final checks

From backend/:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
# 30 passed, 2 upstream deprecation warnings, 1.42 seconds
.\.venv\Scripts\python.exe -m compileall -q app
# exit 0
.\.venv\Scripts\python.exe tests/http_smoke.py
# PASS: 36 real HTTP, CORS, CRUD, SQLite cascade, and process-restart checks
```

From frontend/:

```powershell
npm run lint
npm run typecheck
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:8010/api'
npm run build
# all exit 0
$env:E2E_BASE_URL='http://localhost:3100'
$env:E2E_API_URL='http://127.0.0.1:8010/api'
npx playwright test
# 20 passed (10 desktop + 10 mobile), 57.6 seconds
```

Browser tests used the production frontend on 3100 and a separate seeded database backend/audit_data/audit.db on 8010. Create audit_data first and set DATABASE_URL=sqlite:///./audit_data/audit.db and CORS_ORIGINS=http://localhost:3100,http://127.0.0.1:3100 for that API. Start the frontend with npm run start -- --port 3100 after building with its audit URL. Tests expect exactly five seed meetings. User data was not used for destructive checks. Screenshots are in docs/screenshots/.

Injected API failures are intentional recovery tests, separate from the error-free normal-route audit. Starlette/AnyIO report two upstream deprecations; Playwright reports an environment NO_COLOR/FORCE_COLOR conflict. No application error remains. Mobile uses Chrome emulation, not physical iOS. Automated accessibility results are limited to the tested routes/states.

## Repairs and changed files

This workspace has no Git repository. This explicit edit inventory is not a Git diff.

- backend/app/services/analysis.py: retain all supplied topics, constrain generated fields to editable limits.
- backend/app/services/ingestion.py: strict VTT, entities, plain-text preservation and speaker continuity.
- backend/app/routers.py: update timestamps for relationship-only edits.
- backend/tests/test_api.py and new backend/tests/http_smoke.py: expanded backend and real server-restart checks.
- backend/Dockerfile, new backend/railway.toml, backend/.dockerignore and .gitignore: process handling, deployment configuration and ignored audit artifacts.
- frontend/src/components/library.tsx: repeated search loading, stale requests, rapid filters, resets and pagination.
- frontend/src/components/transcript.tsx: scroll geometry, stable speaker colors and accessible transcript descriptions.
- frontend/src/hooks/use-meeting-player.ts: clamp playback after duration edits.
- frontend/src/components/ui.tsx, meeting-form.tsx and action-items.tsx: dialog focus restoration and valid minimum duration.
- frontend/src/components/shell.tsx, frontend/src/app/globals.css and frontend/src/lib/utils.ts: mobile drawer, honest unavailable controls, readable text/avatar contrast, obsolete style removal.
- frontend/src/components/insights.tsx: keyboard-focusable scroll panel.
- Links in frontend/src/app/not-found.tsx, frontend/src/app/[section]/page.tsx and library/detail/form/shell components: disable speculative prefetch requests cancelled during navigation.
- frontend/tests/audit.spec.ts, frontend/playwright.config.ts, frontend/package.json and frontend/package-lock.json: strict browser/axe checks and isolated test URLs.
- README.md, docs/VERIFICATION.md, new docs/DEPLOYMENT.md and docs/screenshots/: current evidence and deployment instructions.

## Limitations

Playback has no audio; analysis is deterministic. Both are labelled. No authentication, real transcription, LLM chat, calendar integration or collaboration. Metadata edits do not replace transcripts. SQLite needs one replica and a persistent volume. Public deployment and Docker execution remain unverified. No core workflow failure remains in the completed checks.

See [exact startup and deployment instructions](DEPLOYMENT.md).
