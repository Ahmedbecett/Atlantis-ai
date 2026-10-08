import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro' | 'enterprise';
  dailyCreditsTotal: number;
  creditsUsedToday: number;
  imageCreditsTotal: number;
  imageCreditsUsedToday: number;
  lastResetDay: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface ConversationRecord {
  id: string;
  userId: string;
  title: string;
  personaId: string;
  model: string;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: Array<{ data: string; mimeType: string }>;
  isThinking?: boolean;
  modelUsed?: string;
  createdAt: number;
}

export interface DatabaseSchema {
  users: UserRecord[];
  sessions: SessionRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  usageLogs: Array<{
    id: string;
    userId: string;
    type: string;
    model: string;
    timestamp: number;
  }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'atlantis_database.json');

class Database {
  private data: DatabaseSchema = {
    users: [],
    sessions: [],
    conversations: [],
    messages: [],
    usageLogs: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        // Seed default demo admin / guest user
        this.save();
      }
    } catch (err) {
      console.error('Failed to initialize database, using in-memory store:', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  public getTodayDate(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // --- Users ---
  public findUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByEmail(email: string): UserRecord | undefined {
    return this.data.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase()
    );
  }

  public createUser(params: {
    email: string;
    username: string;
    displayName: string;
    passwordHash: string;
    salt: string;
    role?: 'user' | 'admin';
  }): UserRecord {
    const today = this.getTodayDate();
    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      email: params.email,
      username: params.username,
      displayName: params.displayName || params.username,
      passwordHash: params.passwordHash,
      salt: params.salt,
      role: params.role || 'user',
      plan: 'free',
      dailyCreditsTotal: 15,
      creditsUsedToday: 0,
      imageCreditsTotal: 3,
      imageCreditsUsedToday: 0,
      lastResetDay: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<UserRecord>): UserRecord | undefined {
    const user = this.findUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return user;
  }

  public checkAndRefreshUserQuota(user: UserRecord): UserRecord {
    const today = this.getTodayDate();
    if (user.lastResetDay !== today) {
      user.creditsUsedToday = 0;
      user.imageCreditsUsedToday = 0;
      user.lastResetDay = today;
      this.save();
    }
    return user;
  }

  // --- Sessions ---
  public createSession(userId: string): SessionRecord {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  public findSessionByToken(token: string): SessionRecord | undefined {
    return this.data.sessions.find((s) => s.token === token && new Date(s.expiresAt) > new Date());
  }

  public deleteSession(token: string): void {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.save();
  }

  // --- Conversations ---
  public getConversationsByUser(userId: string): ConversationRecord[] {
    return this.data.conversations
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public findConversationById(id: string): ConversationRecord | undefined {
    return this.data.conversations.find((c) => c.id === id);
  }

  public createConversation(params: {
    userId: string;
    title: string;
    personaId?: string;
    model?: string;
  }): ConversationRecord {
    const convo: ConversationRecord = {
      id: `conv-${crypto.randomUUID()}`,
      userId: params.userId,
      title: params.title || 'New Conversation',
      personaId: params.personaId || 'atlantis-core',
      model: params.model || 'gemini-3.8-flash',
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.conversations.unshift(convo);
    this.save();
    return convo;
  }

  public updateConversation(id: string, updates: Partial<ConversationRecord>): ConversationRecord | undefined {
    const convo = this.findConversationById(id);
    if (!convo) return undefined;
    Object.assign(convo, updates, { updatedAt: Date.now() });
    this.save();
    return convo;
  }

  public deleteConversation(id: string): void {
    this.data.conversations = this.data.conversations.filter((c) => c.id !== id);
    this.data.messages = this.data.messages.filter((m) => m.conversationId !== id);
    this.save();
  }

  // --- Messages ---
  public getMessagesByConversation(conversationId: string): MessageRecord[] {
    return this.data.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  public addMessage(params: {
    conversationId: string;
    userId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    images?: Array<{ data: string; mimeType: string }>;
    isThinking?: boolean;
    modelUsed?: string;
  }): MessageRecord {
    const msg: MessageRecord = {
      id: `msg-${crypto.randomUUID()}`,
      conversationId: params.conversationId,
      userId: params.userId,
      role: params.role,
      content: params.content,
      images: params.images,
      isThinking: params.isThinking,
      modelUsed: params.modelUsed,
      createdAt: Date.now(),
    };
    this.data.messages.push(msg);

    // Update conversation timestamp
    const convo = this.findConversationById(params.conversationId);
    if (convo) {
      convo.updatedAt = Date.now();
    }

    this.save();
    return msg;
  }

  // --- Usage Logs ---
  public logUsage(userId: string, type: string, model: string): void {
    this.data.usageLogs.push({
      id: crypto.randomUUID(),
      userId,
      type,
      model,
      timestamp: Date.now(),
    });
    this.save();
  }
}

export const db = new Database();
