# YoungTekkie Changelog

## M1 — Zero external calls
- Removed external Google Fonts import (no automatic network calls for fonts).
- Replaced external QR generation (api.qrserver.com) with a self-hosted QR image: assets/img/btc-qr.png.
- Added Debug external request audit panel (flags embedded http(s) resources).
- Added tests/smoke-pages.txt (manual smoke list).
- Fixed missing <body> tag issue on several pages (stray \\1 placeholder).
- Updated assets/regression.js to reference print.html.

## M3 — Maths Engine
- Added maths engine module with MCQ + fill-in + word problems.
- Added 12 weekly question banks as JSON.
- Integrated maths sessions into phase day cards with pass rule (70%+).
- Added maths summary to parent dashboard.
- Debug page now checks maths question banks are present.

## M4–M5 (Scaffold)
- Added Python IDE module scaffold (textarea editor, autosave, optional Pyodide loader).
- Added Block Studio module scaffold (optional Blockly + Phaser loader, XML save/restore).
- Integrated Python IDE into Phase 3 day cards; integrated Game Studio into Phase 1–2.
- Added curriculum fields: starterCode (Phase 3) and unlockedBlocks tiers (Phase 1–2).
- Debug page warns if Pyodide / Blockly / Phaser vendor bundles are missing.
