# Repository audit

The latest source-code review is documented in [SECURITY-AUDIT-2026-11-20.md](SECURITY-AUDIT-2026-11-20.md). It supersedes earlier audit notes in this file.

Automated tests in the patched working copy: `npm test` — 36 backend checks and 8 static-site checks passing, plus a real-Chromium CSP check (0 violations, 0 JS errors) on all four pages.
