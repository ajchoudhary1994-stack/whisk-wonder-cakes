# Repository audit

The latest source-code review is documented in [SECURITY-AUDIT-2026-11-20.md](SECURITY-AUDIT-2026-11-20.md). It supersedes earlier audit notes in this file.

Automated tests in the patched working copy: `npm test` — 34 backend checks and 12 static-site checks passing. Browser checks were attempted but could not launch Chromium in the execution environment. No live deployment or production configuration was accessed or changed.
