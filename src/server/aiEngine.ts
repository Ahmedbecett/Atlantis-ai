import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export interface ServerAiConfig {
  provider: 'gemini' | 'openai-compatible' | 'custom';
  model: string;
  apiKey: string;
  systemPrompt: string;
  temperature: number;
  maxDailyCreditsFree: number;
  maxDailyCreditsPro: number;
  rateLimitPerMinute: number;
}

// Configurable Server-Side Settings
export const serverAiConfig: ServerAiConfig = {
  provider: (process.env.AI_PROVIDER as any) || 'gemini',
  model: process.env.AI_MODEL || 'gemini-3.8-flash',
  apiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
  systemPrompt:
    process.env.AI_SYSTEM_PROMPT ||
    `You are Atlantis AI, an advanced multimodal artificial intelligence platform.
You communicate fluently and naturally in both Arabic and English.
- If the user addresses you in Arabic, provide comprehensive, eloquent, and accurate Arabic responses.
- If the user addresses you in English, provide comprehensive, clear, and structured English responses.
- For software engineering and coding requests, write complete, production-grade code formatted in Markdown code blocks (e.g. \`\`\`html, \`\`\`tsx, \`\`\`python). When generating web apps or components, ensure the code is complete and ready to run.
- Deliver thoughtful, polite, structured, and insightful answers across all domains.`,
  temperature: Number(process.env.AI_TEMPERATURE) || 0.7,
  maxDailyCreditsFree: Number(process.env.AI_MAX_DAILY_CREDITS_FREE) || 15,
  maxDailyCreditsPro: Number(process.env.AI_MAX_DAILY_CREDITS_PRO) || 1000,
  rateLimitPerMinute: Number(process.env.AI_RATE_LIMIT_PER_MINUTE) || 45,
};

// Factory for getting the Gemini client dynamically
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ChatMessageParam {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
  images?: Array<{ data: string; mimeType: string }>;
}

export interface StreamChatParams {
  messages?: ChatMessageParam[];
  prompt: string;
  systemPromptOverride?: string;
  isDeepThinking?: boolean;
  enableSearch?: boolean;
  images?: Array<{ data: string; mimeType: string }>;
  modelOverride?: string;
}

export class AiEngineService {
  /**
   * Streaming response generator via Server-Sent Events
   */
  public static async streamContent(params: StreamChatParams): Promise<AsyncIterable<any>> {
    const client = getGeminiClient();

    // If API key is not yet set in environment, yield a helpful informative stream rather than crashing with 403
    if (!client) {
      return (async function* () {
        const isArabic = /[\u0600-\u06FF]/.test(params.prompt);
        if (isArabic) {
          yield {
            text: `مرحباً بك في أتلانتس للذكاء الاصطناعي (Atlantis AI).\n\n⚠️ **تنبيه مفتاح الربط (API Key)**:\nلتمكين التوليد المباشر عبر نماذج Gemini، يرجى اختيار وتفعيل مفتاح الـ API الخاص بك من خلال نافذة **AI Studio** أو عبر قائمة **Settings > Secrets**.\n\nبمجرد اختيار المفتاح، سيتم الاتصال المباشر بنموذج \`gemini-3.8-flash\` وبث الإجابات في الوقت الفعلي فوراً!`,
          };
        } else {
          yield {
            text: `Welcome to Atlantis AI.\n\n⚠️ **API Key Setup Required**:\nTo enable live generative responses with Gemini models, please select and connect your API key via the **AI Studio** selection dialog or in the **Settings > Secrets** panel.\n\nOnce the key is attached, real-time streaming using \`gemini-3.8-flash\` will be active automatically!`,
          };
        }
      })();
    }

    const activeModel = params.modelOverride || serverAiConfig.model;
    const finalSystemPrompt = params.systemPromptOverride
      ? `${serverAiConfig.systemPrompt}\n\nSession Context:\n${params.systemPromptOverride}`
      : serverAiConfig.systemPrompt;

    const contents: any[] = [];

    // History
    if (params.messages && params.messages.length > 0) {
      for (const msg of params.messages.slice(-12)) {
        if (msg.role === 'user') {
          const parts: any[] = [];
          if (msg.images && Array.isArray(msg.images)) {
            for (const img of msg.images) {
              if (img.data) {
                parts.push({
                  inlineData: {
                    mimeType: img.mimeType || 'image/jpeg',
                    data: img.data.replace(/^data:image\/\w+;base64,/, ''),
                  },
                });
              }
            }
          }
          if (msg.content) parts.push({ text: msg.content });
          if (parts.length > 0) contents.push({ role: 'user', parts });
        } else if (msg.role === 'assistant' || msg.role === 'model') {
          contents.push({
            role: 'model',
            parts: [{ text: msg.content || '' }],
          });
        }
      }
    }

    // Current Prompt
    const currentParts: any[] = [];
    if (params.images && Array.isArray(params.images)) {
      for (const img of params.images) {
        if (img.data) {
          currentParts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.data.replace(/^data:image\/\w+;base64,/, ''),
            },
          });
        }
      }
    }
    if (params.prompt) {
      currentParts.push({ text: params.prompt });
    }
    if (currentParts.length > 0) {
      contents.push({ role: 'user', parts: currentParts });
    }

    const config: any = {
      systemInstruction: finalSystemPrompt,
      temperature: params.isDeepThinking ? 0.35 : serverAiConfig.temperature,
    };

    if (params.enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    if (params.isDeepThinking) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    try {
      const responseStream = await client.models.generateContentStream({
        model: activeModel,
        contents,
        config,
      });

      return responseStream;
    } catch (err: any) {
      console.error('Gemini stream error:', err.message);
      // Handle scope or permission error gracefully
      return (async function* () {
        const isScopeErr =
          err.message?.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
          err.message?.includes('PERMISSION_DENIED') ||
          err.message?.includes('403');

        if (isScopeErr) {
          yield {
            text: `⚠️ **API Key Permission Alert**:\nThe request was denied because the Gemini API key is missing or needs authorization. Please ensure a valid API key is selected in **Settings > Secrets** or in the AI Studio dialog.`,
          };
        } else {
          yield {
            text: `⚠️ **Generation Error**: ${err.message || 'Failed to complete request.'}`,
          };
        }
      })();
    }
  }

  /**
   * Non-streaming Unary Chat Completion
   */
  public static async generateContent(params: StreamChatParams): Promise<{ text: string }> {
    const client = getGeminiClient();

    if (!client) {
      return {
        text: `Welcome to Atlantis AI. Please select your Gemini API key in the AI Studio dialog or under Settings > Secrets to enable live model queries.`,
      };
    }

    const activeModel = params.modelOverride || serverAiConfig.model;
    const finalSystemPrompt = params.systemPromptOverride
      ? `${serverAiConfig.systemPrompt}\n\nSession Context:\n${params.systemPromptOverride}`
      : serverAiConfig.systemPrompt;

    const contents: any[] = [];

    if (params.messages && params.messages.length > 0) {
      for (const msg of params.messages.slice(-8)) {
        if (msg.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'assistant' || msg.role === 'model') {
          contents.push({ role: 'model', parts: [{ text: msg.content }] });
        }
      }
    }

    const currentParts: any[] = [];
    if (params.images && Array.isArray(params.images)) {
      for (const img of params.images) {
        if (img.data) {
          currentParts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.data.replace(/^data:image\/\w+;base64,/, ''),
            },
          });
        }
      }
    }
    if (params.prompt) {
      currentParts.push({ text: params.prompt });
    }
    if (currentParts.length > 0) {
      contents.push({ role: 'user', parts: currentParts });
    }

    const config: any = {
      systemInstruction: finalSystemPrompt,
      temperature: params.isDeepThinking ? 0.35 : serverAiConfig.temperature,
    };

    if (params.enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    try {
      const response = await client.models.generateContent({
        model: activeModel,
        contents,
        config,
      });

      return { text: response.text || '' };
    } catch (err: any) {
      console.error('Gemini generateContent error:', err.message);
      return {
        text: `⚠️ **Notice**: Gemini API call returned an error: ${err.message}. Please verify your API key in Settings > Secrets.`,
      };
    }
  }
}
