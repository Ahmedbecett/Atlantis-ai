# Atlantis AI — Repair Report

## Completed

- Fixed the Vercel API entrypoint to use the actual Atlantis Express server.
- Exported the Express app for serverless use and prevented `app.listen()` from running on Vercel.
- Loaded `.env` before server configuration is evaluated.
- Added Vercel configuration and SPA fallback.
- Added API security headers and request-size limits.
- Added process-local API rate limiting for all API routes.
- Removed the shared guest account; every guest now receives an isolated user/session.
- Protected authenticated endpoints with token authentication.
- Added conversation ownership checks for read/update/delete and chat reuse.
- Upgraded password hashing to PBKDF2-SHA512 with 310,000 iterations and legacy-hash migration.
- Added timing-safe password comparison.
- Added server-side chat/image credit consumption.
- Refunded image/chat credits when provider requests fail.
- Removed the fake SVG image-generation fallback.
- Switched image generation to the official `gemini-3.1-flash-image` model.
- Kept TTS on the official `gemini-3.8-flash-lite-tts` model.
- Changed Deep Thinking to use official `gemini-3.8-flash` with high thinking instead of a fake model ID.
- Removed the obsolete Deep model ID from the frontend model selector.
- Prevented client requests from granting paid plans unless a verified server-side entitlement exists.
- Protected manual quota reset behind admin/development configuration.
- Reduced sensitive error leakage in production.
- Added production environment switches and deployment documentation.

## Important production limitation

The archive still contains a legacy JSON file database for the Atlantis AI chat service. It is not a durable multi-instance production database on Vercel/serverless. A real production deployment should move users, sessions, conversations, messages, quotas, and usage logs to PostgreSQL/Prisma (or another durable database) and use a shared Redis/edge rate limiter before horizontal scaling.

The repository also contains a separate video/social Prisma backend from the older project. It was intentionally preserved rather than deleted because removing it could break existing Android features. It is not used as the Atlantis AI chat database by the current root Express server.

Paid subscriptions intentionally are not simulated: a payment provider webhook must grant `pro`/`enterprise` entitlements server-side.
