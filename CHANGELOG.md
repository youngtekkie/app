# YoungTekkie Changelog

## M1 — Zero external calls
- Removed external Google Fonts import (no automatic network calls for fonts).
- Replaced external QR generation (api.qrserver.com) with a self-hosted QR image: assets/img/btc-qr.png.
- Added Debug external request audit panel (flags embedded http(s) resources).
- Added tests/smoke-pages.txt (manual smoke list).
- Fixed missing <body> tag issue on several pages (stray \\1 placeholder).
- Updated assets/regression.js to reference print.html.
