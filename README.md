# YoungTekkie (Clean Slate)

This is the clean-slate refactor scaffold built from the current YoungTekkie site.

## How to run
Because this is a static site, run via a local web server (recommended) so `fetch()` can load JSON:

- VS Code Live Server extension, or
- `python -m http.server` from the repo root

## Structure
- `scripts/main.js` — single entrypoint
- `scripts/app/*` — boot, routing, storage, helpers
- `scripts/features/*` — shared site features
- `scripts/pages/*` — page controllers
- `data/*` — JSON data (site config, curriculum, articles)

See `CODEX_CONTRACT.md`.
