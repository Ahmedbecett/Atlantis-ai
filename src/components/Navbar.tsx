import React, { useState } from 'react';
import {
  Menu,
  Zap,
  Crown,
  Sparkles,
  Sliders,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';
import { AppSettings, AuthUser, Persona, UserQuota } from '../types';
import { ATLANTIS_PERSONAS } from '../data/constants';

interface NavbarProps {
  onToggleSidebar: () => void;
  quota: UserQuota;
  currentUser: AuthUser | null;
  onOpenAuthModal: () => void;
  onOpenUpgradeModal: () => void;
  onOpenSettings: () => void;
  settings: AppSettings;
  activePersonaId: string;
  onSelectPersona: (id: string) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  quota,
  currentUser,
  onOpenAuthModal,
  onOpenUpgradeModal,
  onOpenSettings,
  settings,
  activePersonaId,
  onSelectPersona,
  selectedModel,
  onSelectModel,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);

  const creditsRemaining = Math.max(0, quota.dailyCreditsTotal - quota.creditsUsedToday);
  const activePersona =
    ATLANTIS_PERSONAS.find((p) => p.id === activePersonaId) || ATLANTIS_PERSONAS[0];

  const models = [
    {
      id: 'gemini-3.8-flash',
      name: 'Atlantis Flash 3.8',
      desc: 'Default ultra-fast multimodal model for general queries and code generation.',
      badge: 'Standard',
    },
    {
      id: 'gemini-3.8-flash-deep',
      name: 'Atlantis Deep Ocean (Reasoner)',
      desc: 'High-level multi-step reasoning for complex STEM, logic, and deep analysis.',
      badge: 'Deep Thinking',
    },
  ];

  return (
    <header className="h-14 lg:h-16 border-b border-cyan-950/70 bg-[#040814]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-20 shrink-0">
      {/* Left side: Hamburger Toggle & Model / Persona Selectors */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-cyan-900/40 text-xs font-semibold text-slate-200 transition-all shadow-sm"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="font-bold text-white tracking-wide">
              {selectedModel.includes('deep') ? 'Atlantis Deep Ocean' : 'Atlantis Flash 3.8'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {modelDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#070e1e] border border-cyan-800/60 shadow-2xl p-2 z-50">
              <span className="text-[10px] font-bold text-slate-400 px-2 py-1 block uppercase">
                Available Atlantis Models:
              </span>
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m.id);
                    setModelDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1 text-xs ${
                    selectedModel === m.id
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold'
                      : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{m.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal leading-relaxed">{m.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Persona Pill Selector */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate max-w-[130px]">{activePersona.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {personaDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-[#070e1e] border border-cyan-800/60 shadow-2xl p-2 z-50">
              {ATLANTIS_PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPersona(p.id);
                    setPersonaDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl transition-colors text-xs flex items-center justify-between ${
                    activePersonaId === p.id
                      ? 'bg-cyan-500/20 text-cyan-200 font-bold'
                      : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <span>{p.name}</span>
                  <span className="text-[10px] text-slate-500">{p.badge}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Daily Credits, Upgrade, Account, Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Daily Quota Counter Pill */}
        <button
          onClick={onOpenUpgradeModal}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-900 to-[#071328] border border-cyan-900/50 hover:border-cyan-500/50 transition-all text-xs shadow-sm group"
          title="Click to view daily quota & plans"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <div className="flex items-baseline gap-1">
            <span className="font-mono font-bold text-cyan-300">
              {quota.dailyCreditsTotal > 5000 ? '∞' : creditsRemaining}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">credits left</span>
          </div>
        </button>

        {/* Upgrade to Pro Action Button */}
        {quota.plan === 'free' && (
          <button
            onClick={onOpenUpgradeModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Crown className="w-3.5 h-3.5 fill-slate-950" />
            <span>Upgrade Pro</span>
          </button>
        )}

        {/* User Account Button */}
        <button
          onClick={onOpenAuthModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-medium"
        >
          <div className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-300 flex items-center justify-center text-[10px] font-bold">
            {currentUser && currentUser.displayName
              ? currentUser.displayName[0].toUpperCase()
              : <UserIcon className="w-3 h-3" />}
          </div>
          <span className="hidden sm:inline truncate max-w-[90px]">
            {currentUser && currentUser.displayName ? currentUser.displayName : 'Sign In'}
          </span>
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title="Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
