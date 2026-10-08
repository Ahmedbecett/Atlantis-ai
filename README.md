# Atlantis AI

**Atlantis AI** is a modern AI workspace built with React, TypeScript, Vite, Express, and the Google Gemini API.

## ✨ Features

- AI chat with Gemini
- Fast standard mode and deep-thinking mode
- Conversation history and isolated user sessions
- Image generation through the configured Gemini image model
- Text-to-speech support
- Artifacts and structured responses
- Authentication and protected API routes
- Usage quotas and server-side credit checks
- Responsive dark interface for desktop and mobile
- Vercel-ready deployment

## 🧱 Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Node.js + Express
- **AI:** Google Gemini API via `@google/genai`
- **Deployment:** Vercel
- **Styling:** Tailwind CSS

## 📱 Android APK

[**⬇️ تحميل Atlantis AI APK**](https://github.com/Ahmedbecett/Atlantis-ai/actions/runs/37799811116/artifacts/11560915150)

> آخر إصدار Debug ناجح. افتح الرابط واضغط على `Atlantis-AI-debug-apk` لتنزيل حزمة التطبيق.

## 🚀 Run locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and add your Gemini API key:

```env
GEMINI_API_KEY=your_key_here
```

3. Start the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## ☁️ Vercel

The project is configured for Vercel with:

- Build command: `npm run build`
- Output directory: `dist`
- Serverless API entrypoint: `api/index.ts`
- SPA fallback for client-side routes

Add `GEMINI_API_KEY` in Vercel Environment Variables for **Production** and **Preview**, then redeploy.

## 🔐 Security

- Never commit real API keys or private credentials.
- Paid-plan entitlements are not granted from untrusted client requests.
- Protected resources require authentication and ownership checks.
- Rate limiting and security headers are enabled on API routes.

## 👨‍💻 Developer

**Ahmed Becetti**

Repository: [Ahmedbecett/Atlantis-ai](https://github.com/Ahmedbecett/Atlantis-ai)

© 2026 Atlantis AI. All rights reserved.
