# YoungTekkie — Codex Contract (Non‑Negotiables)

These guardrails exist to stop regressions and spaghetti.

## Boot & architecture
- **Single entrypoint:** `scripts/main.js` is loaded on every page.
- **Single namespace:** `window.YTA` exists on every page after init.
- **Page identity:** every page sets `<body data-page="...">`.
- **Thin pages:** page modules only wire DOM → feature functions.
- **Features live in:** `scripts/features/*`
- **Learning engines live in:** `scripts/modules/*`

## Data & storage
- **Versioned keys only** (v1 to start):
  - `yta_profiles_v1`
  - `yta_active_profile_v1`
  - `yta_settings_v1`
  - `yta_state_<profileId>_v1`
- Any schema change requires a migration in `scripts/app/storage.js`.
- No silent data loss.

## Dependencies
- No external CDN dependencies after Milestone M1.
- No runtime build step (static hosting).

## Quality gates
- No console errors on any page.
- Header never overlaps content (CSS variable `--headerH`).
- Debug page must accurately reflect real app state.
