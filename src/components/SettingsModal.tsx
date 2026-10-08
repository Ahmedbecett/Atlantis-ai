import React from 'react';
import { X, Sliders, Volume2, Sparkles, Trash2 } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearAllSessions: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAllSessions,
}) => {
  if (!isOpen) return null;

  const voices = [
    { id: 'Kore', label: 'Kore - Balanced, articulate, and natural' },
    { id: 'Puck', label: 'Puck - Energetic and clear' },
    { id: 'Charon', label: 'Charon - Deep and authoritative' },
    { id: 'Fenrir', label: 'Fenrir - Strong and resonant' },
    { id: 'Zephyr', label: 'Zephyr - Fast and lightweight' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#070e1e] border border-cyan-800/40 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Atlantis AI Settings</h2>
              <p className="text-xs text-slate-400">Configure model behavior, voices, and storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-5 text-xs">
          {/* Voice selection for TTS */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 font-semibold text-slate-300">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>Text-to-Speech Voice Persona:</span>
            </label>
            <select
              value={settings.voiceName}
              onChange={(e) => onUpdateSettings({ voiceName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom System Instruction */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 font-semibold text-slate-300">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Custom Instructions (What should Atlantis know about you?):</span>
            </label>
            <textarea
              value={settings.customInstructions}
              onChange={(e) => onUpdateSettings({ customInstructions: e.target.value })}
              placeholder="e.g. Always respond concisely, emphasize TypeScript and Tailwind in coding solutions, provide architectural rationale..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none text-xs"
            />
          </div>

          {/* Danger zone / Data management */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Data Management
            </span>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete all saved conversations?')) {
                  onClearAllSessions();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-800/50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Saved Conversations</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
