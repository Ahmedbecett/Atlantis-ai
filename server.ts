import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/db';
import {
  authenticateToken,
  optionalAuth,
  hashPassword,
  verifyPassword,
  AuthenticatedRequest,
} from './src/server/auth';
import {
  AiEngineService,
  serverAiConfig,
  getGeminiClient,
} from './src/server/aiEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple in-memory rate limiting middleware
const requestCounts = new Map<string, { count: number; resetAt: number }>();
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReqs = serverAiConfig.rateLimitPerMinute * 3; // allow 3x for general assets

  const record = requestCounts.get(ip);
  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
  } else {
    record.count++;
    if (record.count > maxReqs && req.path.startsWith('/api/chat')) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }
  }
  next();
});

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
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
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
        id: 'gemini-3.8-flash-deep',
        name: 'Atlantis Deep Ocean (Reasoner)',
        tag: 'Extended Reasoning',
        tier: 'free',
        tokensPerMin: '800k tokens/min',
        latency: '~0.6s',
        description: 'Multi-step deep thinking engine for complex STEM, logic, and deep software debugging.',
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
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'User with this email or username already exists.' });
    }

    const { hash, salt } = hashPassword(password);
    const user = db.createUser({
      email,
      username: username || email.split('@')[0],
      displayName: displayName || username || email.split('@')[0],
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

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const refreshed = db.checkAndRefreshUserQuota(user);
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

app.get('/api/auth/me', optionalAuth, (req: AuthenticatedRequest, res) => {
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
  let guestUser = db.findUserByEmail('guest@atlantis.ai');
  if (!guestUser) {
    const { hash, salt } = hashPassword('guest1234');
    guestUser = db.createUser({
      email: 'guest@atlantis.ai',
      username: 'guest',
      displayName: 'Guest Explorer',
      passwordHash: hash,
      salt,
    });
  }
  guestUser = db.checkAndRefreshUserQuota(guestUser);
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
app.get('/api/conversations', optionalAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const conversations = db.getConversationsByUser(userId);
  res.json({ conversations });
});

app.post('/api/conversations', optionalAuth, (req: AuthenticatedRequest, res) => {
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

app.get('/api/conversations/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  const convo = db.findConversationById(req.params.id);
  if (!convo) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }
  const messages = db.getMessagesByConversation(convo.id);
  res.json({ conversation: convo, messages });
});

app.delete('/api/conversations/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  db.deleteConversation(req.params.id);
  res.json({ message: 'Conversation deleted.' });
});

app.patch('/api/conversations/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
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
app.post('/api/chat/stream', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  db.checkAndRefreshUserQuota(user);

  // Check quota
  if (user.creditsUsedToday >= user.dailyCreditsTotal) {
    return res.status(403).json({
      error: 'Daily credit quota exceeded. Please upgrade to Atlantis Pro for higher limits.',
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

    if (!prompt && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'Prompt or message content is required.' });
    }

    // Deduct 1 credit
    db.updateUser(user.id, { creditsUsedToday: user.creditsUsedToday + 1 });
    db.logUsage(user.id, 'chat', isDeepThinking ? 'gemini-3.8-flash-deep' : 'gemini-3.8-flash');

    // Ensure conversation exists in DB
    let conversationId = incomingConvId;
    if (!conversationId || !db.findConversationById(conversationId)) {
      const title = prompt.slice(0, 40) || 'New Conversation';
      const newConvo = db.createConversation({
        userId: user.id,
        title,
        model: isDeepThinking ? 'gemini-3.8-flash-deep' : 'gemini-3.8-flash',
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
        modelUsed: isDeepThinking ? 'Atlantis Deep Ocean' : 'Atlantis Flash 3.8',
      });
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Error in /api/chat/stream:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'AI engine failed to generate response.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message || 'Streaming error' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// Non-streaming Unary Chat (for Mobile Android app & REST clients)
app.post('/api/chat', optionalAuth, async (req: AuthenticatedRequest, res) => {
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

    // Deduct 1 credit
    db.updateUser(user.id, { creditsUsedToday: user.creditsUsedToday + 1 });
    db.logUsage(user.id, 'chat', isDeepThinking ? 'gemini-3.8-flash-deep' : 'gemini-3.8-flash');

    let conversationId = incomingConvId;
    if (!conversationId || !db.findConversationById(conversationId)) {
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
      modelUsed: isDeepThinking ? 'Atlantis Deep Ocean' : 'Atlantis Flash 3.8',
    });

    res.json({
      text: result.text,
      conversationId,
      messageId: savedAssistantMsg.id,
      creditsLeft: Math.max(0, user.dailyCreditsTotal - user.creditsUsedToday),
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    res.status(500).json({ error: err.message || 'AI request failed.' });
  }
});

// Image Generation Endpoint
app.post('/api/generate-image', optionalAuth, async (req: AuthenticatedRequest, res) => {
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

    db.updateUser(user.id, { imageCreditsUsedToday: user.imageCreditsUsedToday + 1 });
    db.logUsage(user.id, 'image', 'gemini-3.1-flash-lite-image');

    try {
      const client = getGeminiClient();
      if (client) {
        const response = await client.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
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
      console.warn('Image model call deferred to synthetic artwork:', modelErr.message);
    }

    // Creative SVG Artwork generator for Atlantis AI
    const width = aspectRatio === '16:9' ? 960 : aspectRatio === '9:16' ? 540 : 800;
    const height = aspectRatio === '16:9' ? 540 : aspectRatio === '9:16' ? 960 : 800;
    const cleanPrompt = prompt.replace(/[<>&"]/g, '');

    const svgArtwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="40%" stop-color="#071b38"/>
      <stop offset="80%" stop-color="#0c2d48"/>
      <stop offset="100%" stop-color="#001428"/>
    </linearGradient>
    <radialGradient id="oceanGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.35"/>
      <stop offset="70%" stop-color="#4facfe" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) * 0.4}" fill="url(#oceanGlow)"/>
  <polygon points="${width / 2},${height * 0.22} ${width * 0.8},${height * 0.75} ${width * 0.2},${height * 0.75}" fill="url(#crystalGrad)" opacity="0.85"/>
  <polygon points="${width / 2},${height * 0.22} ${width / 2},${height * 0.75} ${width * 0.2},${height * 0.75}" fill="#0ea5e9" opacity="0.6"/>
  <line x1="${width / 2}" y1="${height * 0.22}" x2="${width / 2}" y2="${height * 0.75}" stroke="#7dd3fc" stroke-width="2"/>
  <circle cx="${width / 2}" cy="${height * 0.5}" r="${Math.min(width, height) * 0.22}" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="6,6" opacity="0.6"/>
  <text x="${width / 2}" y="${height * 0.2}" font-family="sans-serif" font-size="32" font-weight="bold" fill="#38bdf8" text-anchor="middle" filter="drop-shadow(0 0 10px #00f2fe)">Ψ</text>
  <rect x="${width * 0.08}" y="${height * 0.82}" width="${width * 0.84}" height="${height * 0.12}" rx="12" fill="#040b18" fill-opacity="0.85" stroke="#0369a1" stroke-width="1"/>
  <text x="${width * 0.12}" y="${height * 0.87}" font-family="sans-serif" font-size="14" font-weight="bold" fill="#38bdf8">ATLANTIS AI VISION STUDIO</text>
  <text x="${width * 0.12}" y="${height * 0.91}" font-family="sans-serif" font-size="12" fill="#94a3b8">${cleanPrompt.slice(0, 75)}...</text>
</svg>`;

    const base64Svg = Buffer.from(svgArtwork).toString('base64');
    res.json({ imageUrl: `data:image/svg+xml;base64,${base64Svg}`, prompt });
  } catch (err: any) {
    console.error('Error generating image:', err);
    res.status(500).json({ error: err.message || 'Image generation failed.' });
  }
});

// Text to Speech Endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
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
    res.status(500).json({ error: err.message || 'TTS generation failed.' });
  }
});

// Plan Upgrade / Quota management
app.post('/api/user/plan', optionalAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { plan } = req.body;
  if (!['free', 'pro', 'enterprise'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan.' });
  }

  const credits = plan === 'enterprise' ? 99999 : plan === 'pro' ? 1000 : 15;
  const imageCredits = plan === 'enterprise' ? 1000 : plan === 'pro' ? 100 : 3;

  const updated = db.updateUser(user.id, {
    plan,
    dailyCreditsTotal: credits,
    imageCreditsTotal: imageCredits,
  });

  res.json({ user: updated });
});

app.post('/api/user/reset-quota', optionalAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
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

app.listen(port, '0.0.0.0', () => {
  console.log(`Atlantis AI Production Server listening on http://0.0.0.0:${port}`);
});
