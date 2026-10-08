import React, { useState } from 'react';
import {
  MessageSquarePlus,
  Sparkles,
  Zap,
  Trash2,
  Pin,
  Search,
  Sliders,
  Image as ImageIcon,
  ChevronLeft,
  Brain,
  Code2,
  Briefcase,
  Layers,
  Crown,
} from 'lucide-react';
import { ChatSession, Persona, UserQuota } from '../types';
import { ATLANTIS_PERSONAS, PLANS_CONFIG } from '../data/constants';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onTogglePinSession: (id: string) => void;
  activePersonaId: string;
  onSelectPersona: (id: string) => void;
  quota: UserQuota;
  onOpenUpgradeModal: () => void;
  onOpenImageStudio: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onTogglePinSession,
  activePersonaId,
  onSelectPersona,
  quota,
  onOpenUpgradeModal,
  onOpenImageStudio,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPersonas, setShowPersonas] = useState(false);

  const plan = PLANS_CONFIG[quota.plan];
  const creditsRemaining = Math.max(0, quota.dailyCreditsTotal - quota.creditsUsedToday);
  const usagePercent = Math.min(
    100,
    Math.round((quota.creditsUsedToday / quota.dailyCreditsTotal) * 100)
  );

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter((s) => s.isPinned);
  const normalSessions = filteredSessions.filter((s) => !s.isPinned);

  const getPersonaIcon = (iconName: string) => {
    switch (iconName) {
      case 'Code2':
        return <Code2 className="w-4 h-4 text-cyan-400" />;
      case 'Search':
        return <Search className="w-4 h-4 text-emerald-400" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'Briefcase':
        return <Briefcase className="w-4 h-4 text-violet-400" />;
      default:
        return <Brain className="w-4 h-4 text-cyan-300" />;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 transition-all duration-300 flex flex-col bg-[#050b18] border-r border-cyan-950/70 w-72 lg:w-80 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-cyan-950/80 bg-[#070f22]">
          <div className="flex items-center gap-2.5">
            {/* Glowing Atlantis Trident Emblem */}
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-900 shadow-md shadow-cyan-500/30 ring-1 ring-cyan-300/40">
              <span className="text-white font-black text-lg select-none">Ψ</span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-300 animate-ping opacity-75"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-wide text-white">ATLANTIS</span>
                <span className="text-xs px-1.5 py-0.2 rounded font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AI
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-sans block leading-none mt-0.5">
                Oceanic Intelligence Platform
              </span>
            </div>
          </div>

          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Actions: New Chat & Studio */}
        <div className="p-3 space-y-2 border-b border-cyan-950/60">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98]"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={onOpenImageStudio}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-900/90 hover:bg-cyan-950/50 text-slate-300 hover:text-cyan-300 border border-slate-800 transition-all"
            >
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-medium">Image Studio</span>
            </button>

            <button
              onClick={() => setShowPersonas(!showPersonas)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border transition-all text-xs ${
                showPersonas
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-cyan-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-medium">Personas</span>
            </button>
          </div>
        </div>

        {/* Persona Drawer (when opened) */}
        {showPersonas && (
          <div className="p-3 bg-[#081226] border-b border-cyan-950/80 space-y-1.5 animate-fadeIn">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Select AI Specialist:
            </span>
            {ATLANTIS_PERSONAS.map((p) => {
              const isSelected = activePersonaId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPersona(p.id);
                    setShowPersonas(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold'
                      : 'hover:bg-slate-900/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {getPersonaIcon(p.icon)}
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search bar */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full py-1.5 pl-8 pr-3 rounded-lg bg-slate-900/70 border border-slate-800/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Pinned section */}
          {pinnedSessions.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-cyan-400/80 px-2 uppercase tracking-wider flex items-center gap-1">
                <Pin className="w-2.5 h-2.5" />
                Pinned
              </span>
              {pinnedSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={activeSessionId === session.id}
                  onSelect={() => onSelectSession(session.id)}
                  onDelete={() => onDeleteSession(session.id)}
                  onTogglePin={() => onTogglePinSession(session.id)}
                />
              ))}
            </div>
          )}

          {/* Normal Sessions section */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 px-2 uppercase tracking-wider">
              Recent Chats
            </span>
            {normalSessions.length === 0 && pinnedSessions.length === 0 ? (
              <p className="text-xs text-slate-500 px-2 py-4 text-center">
                No conversations yet. Start a new chat!
              </p>
            ) : (
              normalSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={activeSessionId === session.id}
                  onSelect={() => onSelectSession(session.id)}
                  onDelete={() => onDeleteSession(session.id)}
                  onTogglePin={() => onTogglePinSession(session.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Quota / Tier Card */}
        <div className="p-3 border-t border-cyan-950/80 bg-[#060e20]">
          <div className="p-3 rounded-xl bg-gradient-to-b from-[#09152e] to-[#060e20] border border-cyan-900/40 shadow-inner space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crown
                  className={`w-4 h-4 ${
                    quota.plan === 'pro'
                      ? 'text-cyan-400'
                      : quota.plan === 'enterprise'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}
                />
                <span className="text-xs font-bold text-white">{plan.name}</span>
              </div>
              <button
                onClick={onOpenUpgradeModal}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-colors"
              >
                {quota.plan === 'free' ? 'Upgrade ⭐' : 'Manage'}
              </button>
            </div>

            {/* Daily Credit Usage Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Daily Credits Left:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {quota.dailyCreditsTotal > 5000 ? '∞' : `${creditsRemaining} / ${quota.dailyCreditsTotal}`}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    usagePercent > 85 ? 'bg-rose-500' : usagePercent > 60 ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${quota.dailyCreditsTotal > 5000 ? 10 : usagePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Settings & Platform Info footer */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-800/80 hover:text-slate-200 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Settings</span>
            </button>
            <span className="text-[10px] font-mono text-slate-500">v3.0 Production</span>
          </div>
        </div>
      </aside>
    </>
  );
};

const SessionItem: React.FC<{
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}> = ({ session, isActive, onSelect, onDelete, onTogglePin }) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all text-xs ${
        isActive
          ? 'bg-cyan-950/60 text-cyan-200 border border-cyan-800/50 shadow-sm'
          : 'hover:bg-slate-900/60 text-slate-300'
      }`}
    >
      <div className="truncate flex-1 pr-2">
        <p className="truncate font-medium text-[12px]">{session.title}</p>
        <span className="text-[10px] text-slate-500 block">
          {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`p-1 rounded hover:bg-slate-800 text-slate-400 ${
            session.isPinned ? 'text-cyan-400 opacity-100' : ''
          }`}
          title={session.isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400"
          title="Delete Chat"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
