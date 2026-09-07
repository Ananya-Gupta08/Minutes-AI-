# Minutes AI project conventions

- The product name is **Minutes AI**. Interpret alternative product names in follow-up briefs as Minutes AI and use that name in UI, documentation, metadata, and configuration.
- Keep the original purple waveform-and-spark icon. Fireflies.ai is a workflow/design reference only; never copy its logo, proprietary assets, or source code.
- Preserve the Next.js/TypeScript frontend and FastAPI/SQLAlchemy/SQLite backend separation.
- Transcript ingestion, deterministic analysis, persistence, and presentation are separate concerns. Playback and analysis are intentionally simulated and must be described accurately.
- Run checks appropriate to changes. Core checks: backend pytest, frontend typecheck, lint, production build, and Playwright for changed browser workflows.
