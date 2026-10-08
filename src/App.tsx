import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ArtifactPanel } from './components/ArtifactPanel';
import { UpgradeModal } from './components/UpgradeModal';
import { ImageStudioModal } from './components/ImageStudioModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { Artifact, AuthUser, ChatSession, Message, MessageImage, PlanTier, UserQuota } from './types';
import { ATLANTIS_PERSONAS, INITIAL_USER_QUOTA } from './data/constants';
import { extractArtifacts } from './utils/artifactExtractor';

const TOKEN_KEY = 'atlantis_auth_token_v3';

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activePersonaId, setActivePersonaId] = useState<string>('atlantis-core');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [quota, setQuota] = useState<UserQuota>(INITIAL_USER_QUOTA);
  const [settings, setSettings] = useState({
    language: 'en' as const,
    isDeepThinking: false,
    enableSearch: false,
    voiceName: 'Kore',
    customInstructions: '',
    autoScroll: true,
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  // Modals state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper for authenticated fetch
  const authFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }
    return fetch(url, { ...options, headers });
  };

  // Sync LTR and English language in HTML document
  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }, []);

  // Initialize Auth & Load User and Conversations from Backend
  useEffect(() => {
    async function initUser() {
      try {
        let tokenToUse = authToken;
        if (!tokenToUse) {
          // Auto-initiate guest session for instant access
          const guestRes = await fetch('/api/auth/guest', { method: 'POST' });
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            tokenToUse = guestData.token;
            setAuthToken(tokenToUse);
            if (tokenToUse) localStorage.setItem(TOKEN_KEY, tokenToUse);
            setCurrentUser(guestData.user);
            setQuota({
              plan: guestData.user.plan,
              dailyCreditsTotal: guestData.user.dailyCreditsTotal,
              creditsUsedToday: guestData.user.creditsUsedToday,
              imageCreditsTotal: guestData.user.imageCreditsTotal || 3,
              imageCreditsUsedToday: guestData.user.imageCreditsUsedToday || 0,
              lastResetDay: new Date().toISOString().split('T')[0],
            });
          }
        } else {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${tokenToUse}` },
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data.user);
            setQuota({
              plan: data.user.plan,
              dailyCreditsTotal: data.user.dailyCreditsTotal,
              creditsUsedToday: data.user.creditsUsedToday,
              imageCreditsTotal: data.user.imageCreditsTotal || 3,
              imageCreditsUsedToday: data.user.imageCreditsUsedToday || 0,
              lastResetDay: new Date().toISOString().split('T')[0],
            });
          } else {
            // Invalid token, remove and fallback to guest
            localStorage.removeItem(TOKEN_KEY);
            setAuthToken(null);
          }
        }

        // Fetch Conversations from server database
        if (tokenToUse) {
          const convRes = await fetch('/api/conversations', {
            headers: { Authorization: `Bearer ${tokenToUse}` },
          });
          if (convRes.ok) {
            const convData = await convRes.json();
            const loadedSessions: ChatSession[] = (convData.conversations || []).map((c: any) => ({
              id: c.id,
              title: c.title,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
              messages: [],
              personaId: c.personaId || 'atlantis-core',
              isPinned: c.isPinned || false,
            }));
            setSessions(loadedSessions);
            if (loadedSessions.length > 0) {
              loadSessionMessages(loadedSessions[0].id, tokenToUse);
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize user session:', err);
      }
    }

    initUser();
  }, [authToken]);

  // Load conversation messages from backend
  const loadSessionMessages = async (convoId: string, token: string | null = authToken) => {
    setActiveSessionId(convoId);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/conversations/${convoId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const loadedMessages: Message[] = (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
          images: m.images,
          isThinking: m.isThinking,
          status: 'complete',
          artifacts: extractArtifacts(m.content),
          modelUsed: m.modelUsed,
        }));

        setSessions((prev) =>
          prev.map((s) => (s.id === convoId ? { ...s, messages: loadedMessages } : s))
        );
      }
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    }
  };

  const handleSelectSession = (id: string) => {
    loadSessionMessages(id);
    setIsSidebarOpen(false);
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setActiveArtifact(null);
  };

  const handleDeleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
    try {
      await authFetch(`/api/conversations/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete conversation on server:', err);
    }
  };

  const handleTogglePinSession = async (id: string) => {
    const target = sessions.find((s) => s.id === id);
    const newPinned = !target?.isPinned;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isPinned: newPinned } : s))
    );
    try {
      await authFetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newPinned }),
      });
    } catch (err) {
      console.error('Failed to update pin on server:', err);
    }
  };

  const handleClearAllSessions = async () => {
    for (const s of sessions) {
      authFetch(`/api/conversations/${s.id}`, { method: 'DELETE' }).catch(() => {});
    }
    setSessions([]);
    setActiveSessionId(null);
    setActiveArtifact(null);
  };

  // Auth Callbacks
  const handleLoginSuccess = (user: AuthUser, token: string) => {
    setAuthToken(token);
    localStorage.setItem(TOKEN_KEY, token);
    setCurrentUser(user);
    setQuota({
      plan: user.plan,
      dailyCreditsTotal: user.dailyCreditsTotal,
      creditsUsedToday: user.creditsUsedToday,
      imageCreditsTotal: user.imageCreditsTotal || 3,
      imageCreditsUsedToday: user.imageCreditsUsedToday || 0,
      lastResetDay: new Date().toISOString().split('T')[0],
    });
  };

  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setSessions([]);
    setActiveSessionId(null);
  };

  const handleSelectPlan = async (newPlan: PlanTier) => {
    try {
      const res = await authFetch('/api/user/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setQuota({
          plan: data.user.plan,
          dailyCreditsTotal: data.user.dailyCreditsTotal,
          creditsUsedToday: data.user.creditsUsedToday,
          imageCreditsTotal: data.user.imageCreditsTotal || 3,
          imageCreditsUsedToday: data.user.imageCreditsUsedToday || 0,
          lastResetDay: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err) {
      console.error('Failed to update plan:', err);
    }
  };

  const handleResetTodayQuota = async () => {
    try {
      const res = await authFetch('/api/user/reset-quota', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setQuota((prev) => ({
          ...prev,
          creditsUsedToday: 0,
          imageCreditsUsedToday: 0,
        }));
      }
    } catch (err) {
      console.error('Failed to reset quota:', err);
    }
  };

  const handleConsumeImageCredit = (): boolean => {
    if (quota.imageCreditsUsedToday >= quota.imageCreditsTotal) {
      return false;
    }
    setQuota((prev) => ({
      ...prev,
      imageCreditsUsedToday: prev.imageCreditsUsedToday + 1,
    }));
    return true;
  };

  // Main Streaming AI Message Handler
  const handleSendMessage = async (
    prompt: string,
    images: MessageImage[],
    options: { isDeepThinking: boolean; enableSearch: boolean }
  ) => {
    if (quota.creditsUsedToday >= quota.dailyCreditsTotal) {
      setIsUpgradeModalOpen(true);
      return;
    }

    // Decrement 1 credit locally
    setQuota((prev) => ({
      ...prev,
      creditsUsedToday: prev.creditsUsedToday + 1,
    }));

    const userMessage: Message = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      images: images.length > 0 ? images : undefined,
    };

    const assistantMessageId = `msg-${Date.now()}-a`;
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'streaming',
      isThinking: options.isDeepThinking,
      modelUsed: options.isDeepThinking ? 'Atlantis Deep Ocean' : 'Atlantis Flash 3.8',
    };

    let sessionToUseId = activeSessionId;
    let nextSessions = [...sessions];

    if (!sessionToUseId) {
      const newTitle = prompt.trim().slice(0, 36) || 'New Conversation';
      const tempId = `conv-${Date.now()}`;
      const newSession: ChatSession = {
        id: tempId,
        title: newTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [userMessage, initialAssistantMessage],
        personaId: activePersonaId,
      };
      sessionToUseId = tempId;
      nextSessions = [newSession, ...nextSessions];
      setActiveSessionId(tempId);
    } else {
      nextSessions = nextSessions.map((s) => {
        if (s.id === sessionToUseId) {
          return {
            ...s,
            updatedAt: Date.now(),
            messages: [...s.messages, userMessage, initialAssistantMessage],
          };
        }
        return s;
      });
    }

    setSessions(nextSessions);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      const activeConvo = nextSessions.find((s) => s.id === sessionToUseId);
      const historyToSend = (activeConvo ? activeConvo.messages : [])
        .filter((m) => m.id !== initialAssistantMessage.id && m.id !== userMessage.id)
        .map((m) => ({
          role: m.role,
          content: m.content,
          images: m.images,
        }));

      const activePersona =
        ATLANTIS_PERSONAS.find((p) => p.id === activePersonaId) || ATLANTIS_PERSONAS[0];

      const res = await authFetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          conversationId: sessionToUseId.startsWith('conv-') ? sessionToUseId : undefined,
          prompt,
          messages: historyToSend,
          systemInstruction: `${activePersona.systemInstruction}\n${settings.customInstructions || ''}`,
          isDeepThinking: options.isDeepThinking,
          enableSearch: options.enableSearch,
          images,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to connect to real AI engine.');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let serverConfirmedConvId = sessionToUseId;

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.conversationId) {
                serverConfirmedConvId = parsed.conversationId;
              }
              if (parsed.text) {
                accumulatedContent += parsed.text;

                setSessions((prev) =>
                  prev.map((s) => {
                    if (s.id === sessionToUseId) {
                      return {
                        ...s,
                        id: serverConfirmedConvId,
                        messages: s.messages.map((m) =>
                          m.id === assistantMessageId
                            ? { ...m, content: accumulatedContent, status: 'streaming' }
                            : m
                        ),
                      };
                    }
                    return s;
                  })
                );
              }
            } catch (err) {
              console.error('SSE JSON parse error:', err);
            }
          }
        }
      }

      // Finalize artifacts
      const artifacts = extractArtifacts(accumulatedContent);

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === sessionToUseId || s.id === serverConfirmedConvId) {
            return {
              ...s,
              id: serverConfirmedConvId,
              messages: s.messages.map((m): Message =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: accumulatedContent,
                      status: 'complete' as const,
                      artifacts,
                    }
                  : m
              ),
            };
          }
          return s;
        })
      );

      setActiveSessionId(serverConfirmedConvId);

      if (artifacts.length > 0 && !activeArtifact) {
        setActiveArtifact(artifacts[0]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream stopped by user.');
      } else {
        console.error('Streaming error:', err);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === sessionToUseId) {
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: m.content || `⚠️ Error receiving response: ${err.message}`,
                        status: 'error' as const,
                      }
                    : m
                ),
              };
            }
            return s;
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const currentSession = sessions.find((s) => s.id === activeSessionId);
  const currentMessages = currentSession ? currentSession.messages : [];
  const activePersona =
    ATLANTIS_PERSONAS.find((p) => p.id === activePersonaId) || ATLANTIS_PERSONAS[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#030712] text-slate-100 font-sans select-text">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onTogglePinSession={handleTogglePinSession}
        activePersonaId={activePersonaId}
        onSelectPersona={setActivePersonaId}
        quota={quota}
        onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        onOpenImageStudio={() => setIsImageStudioOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 lg:pl-80">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          quota={quota}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          settings={settings}
          activePersonaId={activePersonaId}
          onSelectPersona={setActivePersonaId}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />

        <div className="flex-1 flex relative overflow-hidden">
          <ChatArea
            messages={currentMessages}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            onOpenArtifact={(art) => setActiveArtifact(art)}
            onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            quota={quota}
            activePersona={activePersona}
          />

          <ArtifactPanel
            artifact={activeArtifact}
            onClose={() => setActiveArtifact(null)}
          />
        </div>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentQuota={quota}
        onSelectPlan={handleSelectPlan}
        onResetTodayQuota={handleResetTodayQuota}
      />

      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        quota={quota}
        onConsumeImageCredit={handleConsumeImageCredit}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
        onClearAllSessions={handleClearAllSessions}
      />
    </div>
  );
}
