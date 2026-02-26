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
