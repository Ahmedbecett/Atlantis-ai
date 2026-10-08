import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  X,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Brain,
  Sparkles,
  Mic,
  MicOff,
  AlertTriangle,
  Globe,
  Zap,
} from 'lucide-react';
import { Artifact, Message, MessageImage, Persona, UserQuota } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SUGGESTED_PROMPTS } from '../data/constants';

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (
    prompt: string,
    images: MessageImage[],
    options: { isDeepThinking: boolean; enableSearch: boolean }
  ) => void;
  onStopStreaming: () => void;
  onOpenArtifact: (artifact: Artifact) => void;
  onOpenUpgradeModal: () => void;
  quota: UserQuota;
  activePersona: Persona;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onOpenArtifact,
  onOpenUpgradeModal,
  quota,
  activePersona,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedImages, setSelectedImages] = useState<MessageImage[]>([]);
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const creditsRemaining = Math.max(0, quota.dailyCreditsTotal - quota.creditsUsedToday);
  const isOutOfCredits = creditsRemaining <= 0;

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Dynamic textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputPrompt]);

  // Voice dictation handler (SpeechRecognition)
  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setSelectedImages((prev) => [
            ...prev,
            {
              data: result,
              mimeType: file.type || 'image/jpeg',
              name: file.name,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if ((!inputPrompt.trim() && selectedImages.length === 0) || isStreaming) return;
    if (isOutOfCredits) {
      onOpenUpgradeModal();
      return;
    }

    onSendMessage(inputPrompt, selectedImages, {
      isDeepThinking,
      enableSearch,
    });

    setInputPrompt('');
    setSelectedImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Copy message text
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Text-to-Speech audio playback
  const handlePlayAudio = async (text: string, id: string) => {
    if (playingAudioId === id) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    setIsAudioLoading(true);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 800) }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          if (currentAudioRef.current) {
            currentAudioRef.current.pause();
          }
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          currentAudioRef.current = audio;
          audio.onended = () => setPlayingAudioId(null);
          audio.onerror = () => fallbackBrowserSpeech(text, id);
          audio.play();
          setPlayingAudioId(id);
          setIsAudioLoading(false);
          return;
        }
      }
      fallbackBrowserSpeech(text, id);
    } catch (e) {
      fallbackBrowserSpeech(text, id);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const fallbackBrowserSpeech = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 600));
      utterance.onend = () => setPlayingAudioId(null);
      utterance.onerror = () => setPlayingAudioId(null);
      window.speechSynthesis.speak(utterance);
      setPlayingAudioId(id);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4rem)] overflow-hidden bg-[#030712] relative">
      {/* Background bioluminescent ambient subtle glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty / Welcome State */
          <div className="max-w-3xl mx-auto py-8 sm:py-14 text-center space-y-8 animate-fadeIn">
            {/* Atlantis Emblem */}
            <div className="inline-flex relative items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-950 p-[1.5px] shadow-2xl shadow-cyan-500/25">
                <div className="w-full h-full rounded-[22px] bg-[#050d1e] flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl text-cyan-300 font-black">Ψ</span>
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono">
                Flash 3.8
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-400">
                Welcome to Atlantis AI
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                Production-grade intelligence for full-stack coding, deep reasoning, live web artifacts, and multimodal vision.
              </p>
            </div>

            {/* Quota reminder pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-900/40 text-xs text-slate-300 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>You have {creditsRemaining} free daily credits remaining</span>
              <button
                onClick={onOpenUpgradeModal}
                className="text-cyan-400 hover:text-cyan-300 font-bold ml-1 underline"
              >
                Upgrade
              </button>
            </div>

            {/* Suggested Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 text-left max-w-2xl mx-auto">
              {SUGGESTED_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    onSendMessage(item.prompt, [], { isDeepThinking, enableSearch })
                  }
                  className="p-4 rounded-2xl bg-[#070f20]/90 hover:bg-[#0c1836] border border-cyan-950/80 hover:border-cyan-600/50 transition-all text-xs space-y-2 group shadow-lg text-slate-200 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between text-cyan-400">
                    <span className="font-bold text-[11px] uppercase tracking-wider">
                      {item.category}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                  </div>
                  <p className="text-slate-300 line-clamp-2 leading-relaxed text-[12px]">
                    {item.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages List */
          messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <div
                key={message.id}
                className={`flex gap-3 max-w-4xl mx-auto ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-700 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-300/30 mt-1">
                    <span className="text-white text-xs font-black">Ψ</span>
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  className={`flex flex-col space-y-2 max-w-[85%] sm:max-w-[78%] ${
                    isUser ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Attached images preview (if any) */}
                  {message.images && message.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {message.images.map((img, i) => (
                        <img
                          key={i}
                          src={img.data}
                          alt="attached"
                          className="w-24 h-24 object-cover rounded-xl border border-cyan-900/60 shadow-md"
                        />
                      ))}
                    </div>
                  )}

                  {/* Message Bubble Box */}
                  <div
                    className={`rounded-2xl p-4 sm:p-5 text-sm leading-relaxed shadow-lg ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-700 to-cyan-700 text-white font-medium rounded-tr-none'
                        : 'bg-[#091122]/95 border border-cyan-950/80 text-slate-100 rounded-tl-none w-full'
                    }`}
                  >
                    {/* Deep Reasoning block */}
                    {!isUser && message.isThinking && (
                      <div className="mb-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300 flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                        <span>Atlantis Deep Ocean Reasoning Applied</span>
                      </div>
                    )}

                    {isUser ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <>
                        <MarkdownRenderer
                          content={message.content}
                          onOpenArtifact={onOpenArtifact}
                        />

                        {/* Streaming cursor pulse */}
                        {message.status === 'streaming' && (
                          <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse align-middle" />
                        )}
                      </>
                    )}
                  </div>

                  {/* Message Footer Actions */}
                  {!isUser && message.content && (
                    <div className="flex items-center gap-2 pt-1 text-slate-400 text-xs px-1">
                      {/* Read Aloud Button */}
                      <button
                        onClick={() => handlePlayAudio(message.content, message.id)}
                        disabled={isAudioLoading}
                        className="flex items-center gap-1 hover:text-cyan-300 transition-colors p-1 rounded"
                        title="Read aloud"
                      >
                        {playingAudioId === message.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            <span className="text-[11px] text-cyan-400">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Listen</span>
                          </>
                        )}
                      </button>

                      {/* Copy message button */}
                      <button
                        onClick={() => handleCopy(message.content, message.id)}
                        className="flex items-center gap-1 hover:text-cyan-300 transition-colors p-1 rounded"
                        title="Copy message"
                      >
                        {copiedMsgId === message.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>

                      {/* Model badge */}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {message.modelUsed || 'Atlantis Flash 3.8'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quota Exhausted Warning Banner */}
      {isOutOfCredits && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-950/80 to-rose-950/80 border-t border-amber-800/60 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You have consumed your 15 daily free credits. Upgrade to Atlantis Pro for 1,000 daily messages!
            </span>
          </div>
          <button
            onClick={onOpenUpgradeModal}
            className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-all shrink-0"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {/* Bottom Chat Composer Input Area */}
      <div className="p-3 sm:p-4 bg-[#050b18]/95 border-t border-cyan-950/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Selected image previews */}
          {selectedImages.length > 0 && (
            <div className="flex items-center gap-2 pb-1 overflow-x-auto">
              {selectedImages.map((img, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-cyan-800 shrink-0">
                  <img src={img.data} alt="preview" className="w-14 h-14 object-cover" />
                  <button
                    onClick={() => setSelectedImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Box Shell */}
          <div className="relative rounded-2xl bg-[#091124] border border-cyan-950 focus-within:border-cyan-500/80 shadow-2xl transition-all">
            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isOutOfCredits
                  ? 'Daily credits exhausted... Upgrade to continue chatting'
                  : `Ask ${activePersona.name} anything, paste code, or request an artifact...`
              }
              rows={1}
              disabled={isOutOfCredits}
              className="w-full px-4 pt-3.5 pb-12 rounded-2xl bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-sm resize-none disabled:opacity-50"
            />

            {/* Bottom Bar: Tools & Send Button */}
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
              {/* Left tools: Attachment, Deep Thinking, Web Search, Voice */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* File / Image Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors"
                  title="Attach image for vision analysis"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Deep Thinking Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setIsDeepThinking(!isDeepThinking)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs transition-all border ${
                    isDeepThinking
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50 shadow-sm shadow-cyan-500/20 font-bold'
                      : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'
                  }`}
                  title="Enable multi-step deep reasoning"
                >
                  <Brain className={`w-3.5 h-3.5 ${isDeepThinking ? 'text-cyan-300' : ''}`} />
                  <span className="hidden sm:inline">Thinking</span>
                </button>

                {/* Live Search Grounding Toggle */}
                <button
                  type="button"
                  onClick={() => setEnableSearch(!enableSearch)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs transition-all border ${
                    enableSearch
                      ? 'bg-blue-500/20 text-blue-200 border-blue-500/50 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'
                  }`}
                  title="Include live web search grounding"
                >
                  <Globe className={`w-3.5 h-3.5 ${enableSearch ? 'text-blue-300' : ''}`} />
                  <span className="hidden sm:inline">Search</span>
                </button>

                {/* Voice Dictation (Mic) */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-1.5 rounded-xl transition-all ${
                    isListening
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                      : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80'
                  }`}
                  title="Voice input"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Right side: Send or Stop generation */}
              <div>
                {isStreaming ? (
                  <button
                    onClick={onStopStreaming}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                    title="Stop generating"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={(!inputPrompt.trim() && selectedImages.length === 0) || isOutOfCredits}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 fill-slate-950" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-2">
            <span>Atlantis AI can make mistakes. Verify critical facts and code before production.</span>
            <span className="hidden sm:inline font-mono text-[10px] text-cyan-900">
              Gemini 3.8 Flash • Server-Side Backend
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
