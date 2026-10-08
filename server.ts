import express from 'express';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/db';
import {
  authenticateToken,
  hashPassword,
  verifyPassword,
  verifyLegacyPassword,
  AuthenticatedRequest,
} from './src/server/auth';
import {
  AiEngineService,
  serverAiConfig,
  getGeminiClient,
} from './src/server/aiEngine';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Lightweight process-local rate limiter. It protects single-instance deployments;
// production multi-instance deployments should additionally use Redis/edge limits.
const requestCounts = new Map<string, { count: number; resetAt: number }>();
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const maxReqs = Math.max(30, serverAiConfig.rateLimitPerMinute * 2);
  const key = `${ip}:${req.method}:${req.path.split('/').slice(0, 4).join('/')}`;
  const record = requestCounts.get(key);
  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }
  record.count += 1;
  if (record.count > maxReqs) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  next();
});

// Basic security headers without adding another runtime dependency.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  next();
});

const isNonEmptyString = (value: unknown, max = 20000): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const safeError = (err: any) => process.env.NODE_ENV === 'production' ? 'Request failed. Please try again.' : (err?.message || 'Request failed.');

// -------------------------------------------------------------
// System & Health Endpoints
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Atlantis AI',
    version: '3.0.0-production',
    provider: serverAiConfig.provider,
    model: serverAiConfig.model,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ai/config', (req, res) => {
  res.json({
    provider: serverAiConfig.provider,
    model: serverAiConfig.model,
    maxDailyCreditsFree: serverAiConfig.maxDailyCreditsFree,
    maxDailyCreditsPro: serverAiConfig.maxDailyCreditsPro,
    rateLimitPerMinute: serverAiConfig.rateLimitPerMinute,
    temperature: serverAiConfig.temperature,
  });
});

// Available models list
app.get('/api/models', (req, res) => {
  res.json({
    models: [
      {
        id: 'gemini-3.8-flash',
        name: 'Atlantis Flash 3.8',
        tag: 'Standard Speed & Reasoning',
        tier: 'free',
        tokensPerMin: '1M tokens/min',
        latency: '~0.2s',
        description: 'Flagship fast polymath model for general queries, coding, and structured workflows.',
      },
      {
        id: 'gemini-3.8-flash',
        name: 'Atlantis Deep Ocean (Reasoner)',
        tag: 'Extended Reasoning • High Thinking',
        tier: 'free',
        tokensPerMin: '1M tokens/min',
        latency: '~0.6s',
        description: 'Gemini 3.8 Flash with high thinking enabled for complex reasoning.',
      },
    ],
  });
});

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;
    if (!isNonEmptyString(email, 320) || !isNonEmptyString(password, 200)) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const requestedUsername = String(username || email.split('@')[0]).trim().slice(0, 32);
    const existing = db.findUserByEmail(normalizedEmail) || db.findUserByUsername(requestedUsername);
    if (existing) {
      return res.status(409).json({ error: 'User with this email or username already exists.' });
    }

    const { hash, salt } = hashPassword(password);
    const user = db.createUser({
      email: normalizedEmail,
      username: requestedUsername,
      displayName: String(displayName || requestedUsername).trim().slice(0, 80),
      passwordHash: hash,
      salt,
    });

    const session = db.createSession(user.id);
    res.json({
      message: 'Account created successfully.',
      token: session.token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        plan: user.plan,
        dailyCreditsTotal: user.dailyCreditsTotal,
        creditsUsedToday: user.creditsUsedToday,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = identifier || email;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Login identifier and password are required.' });
    }

    const user = db.findUserByEmail(loginId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) isValid = verifyLegacyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const refreshed = db.checkAndRefreshUserQuota(user);
    // Migrate legacy PBKDF2 hashes to the stronger 310k-iteration format after login.
    if (verifyLegacyPassword(password, user.passwordHash, user.salt)) {
      const upgraded = hashPassword(password);
      db.updateUser(user.id, { passwordHash: upgraded.hash, salt: upgraded.salt });
    }
    const session = db.createSession(refreshed.id);

    res.json({
      message: 'Logged in successfully.',
      token: session.token,
      user: {
        id: refreshed.id,
        email: refreshed.email,
        username: refreshed.username,
        displayName: refreshed.displayName,
        plan: refreshed.plan,
        dailyCreditsTotal: refreshed.dailyCreditsTotal,
        creditsUsedToday: refreshed.creditsUsedToday,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      plan: user.plan,
      dailyCreditsTotal: user.dailyCreditsTotal,
      creditsUsedToday: user.creditsUsedToday,
      imageCreditsTotal: user.imageCreditsTotal,
      imageCreditsUsedToday: user.imageCreditsUsedToday,
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    db.deleteSession(token);
  }
  res.json({ message: 'Logged out successfully.' });
});

// Guest Session Endpoint
app.post('/api/auth/guest', (req, res) => {
  // Every guest gets an isolated account/session; no shared guest data or quota.
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const email = `guest-${suffix}@guest.atlantis.ai`;
  const username = `guest_${suffix}`;
  const { hash, salt } = hashPassword(crypto.randomBytes(24).toString('hex'));
  const guestUser = db.createUser({
    email,
    username,
    displayName: 'Guest Explorer',
    passwordHash: hash,
    salt,
  });
  const session = db.createSession(guestUser.id);
  res.json({
    token: session.token,
    user: {
      id: guestUser.id,
      email: guestUser.email,
      username: guestUser.username,
      displayName: guestUser.displayName,
      plan: guestUser.plan,
      dailyCreditsTotal: guestUser.dailyCreditsTotal,
      creditsUsedToday: guestUser.creditsUsedToday,
    },
  });
});

// -------------------------------------------------------------
// Conversations & Messages Endpoints
// -------------------------------------------------------------
app.get('/api/conversations', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const conversations = db.getConversationsByUser(userId);
  res.json({ conversations });
});

app.post('/api/conversations', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { title, personaId, model } = req.body;
  const convo = db.createConversation({
    userId,
    title: title || 'New Conversation',
    personaId,
    model,
  });
  res.json({ conversation: convo });
});

app.get('/api/conversations/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const convo = db.findConversationById(req.params.id);
  if (!convo || convo.userId !== req.user!.id) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }
  const messages = db.getMessagesByConversation(convo.id);
  res.json({ conversation: convo, messages });
});

app.delete('/api/conversations/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const convo = db.findConversationById(req.params.id);
  if (!convo || convo.userId !== req.user!.id) return res.status(404).json({ error: 'Conversation not found.' });
  db.deleteConversation(req.params.id);
  res.json({ message: 'Conversation deleted.' });
});

app.patch('/api/conversations/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const convo = db.findConversationById(req.params.id);
  if (!convo || convo.userId !== req.user!.id) return res.status(404).json({ error: 'Conversation not found.' });
  const { title, isPinned } = req.body;
  const updated = db.updateConversation(req.params.id, {
    ...(title !== undefined ? { title } : {}),
    ...(isPinned !== undefined ? { isPinned } : {}),
  });
  res.json({ conversation: updated });
});

// -------------------------------------------------------------
// Real AI Chat Endpoints
// -------------------------------------------------------------

// Streaming Chat (SSE)
app.post('/api/chat/stream', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  db.checkAndRefreshUserQuota(user);

  if (user.creditsUsedToday >= user.dailyCreditsTotal) {
    return res.status(403).json({ error: 'Daily credit quota exceeded. Please upgrade to Atlantis Pro for higher limits.' });
  }

  try {
    const {
      conversationId: incomingConvId,
      messages = [],
      prompt = '',
      systemInstruction = '',
      isDeepThinking = false,
      enableSearch = false,
      images = [],
    } = req.body;

    if (!prompt && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'Prompt or message content is required.' });
    }

    // Consume the credit only after request validation.
    if (!db.consumeChatCredit(user.id)) return res.status(403).json({ error: 'Daily credit quota exceeded.' });
    db.logUsage(user.id, 'chat', 'gemini-3.8-flash');

    // Ensure conversation exists in DB
    let conversationId = incomingConvId;
    if (!conversationId || !db.findConversationById(conversationId) || db.findConversationById(conversationId)!.userId !== user.id) {
      const title = prompt.slice(0, 40) || 'New Conversation';
      const newConvo = db.createConversation({
        userId: user.id,
        title,
        model: 'gemini-3.8-flash',
      });
      conversationId = newConvo.id;
    }

    // Save user message to database
    db.addMessage({
      conversationId,
      userId: user.id,
      role: 'user',
      content: prompt,
      images,
    });

    // Setup SSE response headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Stream from Real AI Engine
    const stream = await AiEngineService.streamContent({
      prompt,
      messages,
      systemPromptOverride: systemInstruction,
      isDeepThinking,
      enableSearch,
      images,
      modelOverride: 'gemini-3.8-flash',
    });

    let fullGeneratedResponse = '';

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullGeneratedResponse += text;
        res.write(`data: ${JSON.stringify({ text, conversationId })}\n\n`);
      }
    }

    // Persist assistant response in DB
    if (fullGeneratedResponse) {
      db.addMessage({
        conversationId,
        userId: user.id,
        role: 'assistant',
        content: fullGeneratedResponse,
        isThinking: isDeepThinking,
        modelUsed: isDeepThinking ? 'Atlantis Deep Ocean (Gemini 3.8 Flash • High Thinking)' : 'Atlantis Flash 3.8',
      });
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    const latest = db.findUserById(user.id);
    if (latest && latest.creditsUsedToday > 0) db.updateUser(user.id, { creditsUsedToday: latest.creditsUsedToday - 1 });
    console.error('Error in /api/chat/stream:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: safeError(err) });
    } else {
      res.write(`data: ${JSON.stringify({ error: safeError(err) })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// Non-streaming Unary Chat (for Mobile Android app & REST clients)
app.post('/api/chat', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  db.checkAndRefreshUserQuota(user);

  if (user.creditsUsedToday >= user.dailyCreditsTotal) {
    return res.status(403).json({
      error: 'Daily credit limit reached. Please upgrade to Pro.',
    });
  }

  try {
    const {
      conversationId: incomingConvId,
      messages = [],
      prompt = '',
      systemInstruction = '',
      isDeepThinking = false,
      enableSearch = false,
      images = [],
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    // Consume the credit only after request validation.
    if (!db.consumeChatCredit(user.id)) return res.status(403).json({ error: 'Daily credit quota exceeded.' });
    db.logUsage(user.id, 'chat', 'gemini-3.8-flash');

    let conversationId = incomingConvId;
    if (!conversationId || !db.findConversationById(conversationId) || db.findConversationById(conversationId)!.userId !== user.id) {
      const newConvo = db.createConversation({
        userId: user.id,
        title: prompt.slice(0, 40) || 'New Conversation',
      });
      conversationId = newConvo.id;
    }

    // Save user message
    db.addMessage({
      conversationId,
      userId: user.id,
      role: 'user',
      content: prompt,
      images,
    });

    const result = await AiEngineService.generateContent({
      prompt,
      messages,
      systemPromptOverride: systemInstruction,
      isDeepThinking,
      enableSearch,
      images,
    });

    // Save assistant message
    const savedAssistantMsg = db.addMessage({
      conversationId,
      userId: user.id,
      role: 'assistant',
      content: result.text,
      isThinking: isDeepThinking,
      modelUsed: isDeepThinking ? 'Atlantis Deep Ocean (Gemini 3.8 Flash • High Thinking)' : 'Atlantis Flash 3.8',
    });

    res.json({
      text: result.text,
      conversationId,
      messageId: savedAssistantMsg.id,
      creditsLeft: Math.max(0, user.dailyCreditsTotal - user.creditsUsedToday),
    });
  } catch (err: any) {
    const latest = db.findUserById(user.id);
    if (latest && latest.creditsUsedToday > 0) db.updateUser(user.id, { creditsUsedToday: latest.creditsUsedToday - 1 });
    console.error('Error in /api/chat:', err);
    res.status(500).json({ error: safeError(err) });
  }
});

// Image Generation Endpoint
app.post('/api/generate-image', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  db.checkAndRefreshUserQuota(user);

  if (user.imageCreditsUsedToday >= user.imageCreditsTotal) {
    return res.status(403).json({
      error: 'Daily image generation limit reached. Please upgrade to Pro for 100 images/day.',
    });
  }

  try {
    const { prompt, aspectRatio = '1:1' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Image description prompt is required.' });
    }

    if (!db.consumeImageCredit(user.id)) return res.status(403).json({ error: 'Daily image generation limit reached.' });
    db.logUsage(user.id, 'image', 'gemini-3.1-flash-image');

    try {
      const client = getGeminiClient();
      if (client) {
        const response = await client.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: prompt,
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
            },
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return res.json({ imageUrl: `data:${mime};base64,${part.inlineData.data}`, prompt });
          }
        }
      }
    } catch (modelErr: any) {
      console.warn('Image model call failed:', modelErr.message);
    }

    const latest = db.findUserById(user.id);
    if (latest && latest.imageCreditsUsedToday > 0) db.updateUser(user.id, { imageCreditsUsedToday: latest.imageCreditsUsedToday - 1 });
    return res.status(503).json({ error: 'Image generation is temporarily unavailable. Please verify the Gemini image model/API access.' });
  } catch (err: any) {
    // Refund the image credit when the provider call itself fails.
    const latest = db.findUserById(user.id);
    if (latest && latest.imageCreditsUsedToday > 0) db.updateUser(user.id, { imageCreditsUsedToday: latest.imageCreditsUsedToday - 1 });
    console.error('Error generating image:', err);
    res.status(500).json({ error: safeError(err) });
  }
});

// Text to Speech Endpoint
app.post('/api/tts', authenticateToken, async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body || {};
    if (!isNonEmptyString(text, 4000)) {
      return res.status(400).json({ error: 'Text content is required for speech synthesis.' });
    }

    const cleanText = text.slice(0, 1000);
    const client = getGeminiClient();

    if (!client) {
      return res.status(503).json({ error: 'TTS service unavailable without active API key.' });
    }

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [{ role: 'user', parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audioBase64: base64Audio });
    } else {
      res.status(500).json({ error: 'Failed to retrieve audio from TTS model.' });
    }
  } catch (err: any) {
    console.error('Error in TTS generation:', err);
    res.status(500).json({ error: safeError(err) });
  }
});

// Plan Upgrade / Quota management
app.post('/api/user/plan', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { plan } = req.body || {};
  if (!['free', 'pro', 'enterprise'].includes(plan)) return res.status(400).json({ error: 'Invalid plan.' });

  // Paid entitlements must never be granted from a client-controlled request.
  // A payment provider webhook/admin action should update these fields server-side.
  if (plan !== 'free' && user.role !== 'admin' && process.env.ALLOW_DEMO_PLAN_UPGRADE !== 'true') {
    return res.status(402).json({ error: 'Paid plans require a verified subscription. Configure billing/webhooks before enabling upgrades.' });
  }

  const credits = plan === 'enterprise' ? 99999 : plan === 'pro' ? 1000 : 15;
  const imageCredits = plan === 'enterprise' ? 1000 : plan === 'pro' ? 100 : 3;
  const updated = db.updateUser(user.id, { plan, dailyCreditsTotal: credits, imageCreditsTotal: imageCredits });
  res.json({ user: updated });
});

app.post('/api/user/reset-quota', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (user.role !== 'admin' && process.env.ALLOW_SELF_QUOTA_RESET !== 'true') {
    return res.status(403).json({ error: 'Quota reset is not available to this account.' });
  }
  const updated = db.updateUser(user.id, {
    creditsUsedToday: 0,
    imageCreditsUsedToday: 0,
    lastResetDay: db.getTodayDate(),
  });
  res.json({ user: updated });
});

// -------------------------------------------------------------
// Vite Middlewares (Dev) or Static Bundle (Production)
// -------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

export default app;

// Vercel/serverless imports this module without opening a listening socket.
// The standalone Node server still listens normally.
if (process.env.VERCEL !== '1' && process.env.SERVERLESS !== 'true') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Atlantis AI server listening on http://0.0.0.0:${port}`);
  });
}
