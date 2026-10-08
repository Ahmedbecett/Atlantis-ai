export type PlanTier = 'free' | 'pro' | 'enterprise';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  plan: PlanTier;
  dailyCreditsTotal: number;
  creditsUsedToday: number;
  imageCreditsTotal?: number;
  imageCreditsUsedToday?: number;
}

export interface Artifact {
  id: string;
  title: string;
  type: 'html' | 'react' | 'javascript' | 'python' | 'svg' | 'markdown' | 'css' | 'json';
  code: string;
  language: string;
}

export interface MessageImage {
  data: string; // base64
  mimeType: string;
  name?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  images?: MessageImage[];
  isThinking?: boolean;
  thinkingContent?: string;
  status?: 'idle' | 'streaming' | 'complete' | 'error';
  artifacts?: Artifact[];
  modelUsed?: string;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  personaId?: string;
  isPinned?: boolean;
}

export interface UserQuota {
  plan: PlanTier;
  dailyCreditsTotal: number;
  creditsUsedToday: number;
  imageCreditsTotal: number;
  imageCreditsUsedToday: number;
  lastResetDay: string; // YYYY-MM-DD
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  systemInstruction: string;
  badge: string;
}

export interface AppSettings {
  language: 'en';
  isDeepThinking: boolean;
  enableSearch: boolean;
  voiceName: string;
  customInstructions: string;
  autoScroll: boolean;
}
