# Atlantis AI — Repair Notes

- Unified the Vercel API entrypoint with the real root Express server.
- Protected authenticated resources and enforced conversation ownership.
- Removed shared guest fallback; guest sessions are created explicitly.
- Replaced fake client-controlled paid-plan upgrades with server-side entitlement protection.
- Added request limits/security headers and smaller request body limits.
- Upgraded password hashing to PBKDF2-SHA512 with 310,000 iterations while migrating legacy hashes after successful login.
- Added server-side chat/image credit consumption helpers.
- Replaced the fake image fallback with a real Gemini image-model response or an explicit service-unavailable error.
- Normalized Gemini 3.8 Flash thinking to the official model plus `thinkingConfig`.
- Kept TTS on the official `gemini-3.8-flash-lite-tts` model.
- Added `vercel.json` and production environment switches.

## Production note

The included JSON database is suitable for a single-instance/demo deployment only. For horizontally scaled production, move users/sessions/conversations/usage to PostgreSQL/Prisma and add a shared Redis rate limiter before scaling to multiple instances.

Paid subscriptions still require a real payment provider webhook; the API intentionally refuses to grant paid entitlements from a browser request.
