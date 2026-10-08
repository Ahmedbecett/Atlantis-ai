import React, { useState } from 'react';
import { X, Lock, Mail, User, Sparkles, LogIn, UserPlus, LogOut, ShieldCheck, AlertCircle } from 'lucide-react';
import { AuthUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLoginSuccess: (user: AuthUser, token: string) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload =
      tab === 'login'
        ? { identifier: email, password }
        : { email, username: username || email.split('@')[0], displayName, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start guest session.');
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#070e1e] border border-cyan-800/50 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser && currentUser.email !== 'guest@atlantis.ai' ? (
          /* Logged In View */
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-2xl">
              {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'A'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{currentUser.displayName}</h3>
              <p className="text-xs text-slate-400">{currentUser.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-semibold uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Plan: {currentUser.plan}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2 text-left">
              <div className="flex justify-between">
                <span>Daily Credits:</span>
                <span className="font-bold text-cyan-400">
                  {currentUser.dailyCreditsTotal - currentUser.creditsUsedToday} remaining
                </span>
              </div>
              <div className="flex justify-between">
                <span>Account ID:</span>
                <span className="font-mono text-[11px] text-slate-500">{currentUser.id.slice(0, 12)}...</span>
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/60 text-rose-300 font-bold text-xs transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Atlantis Account</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                {tab === 'login' ? 'Welcome Back' : 'Create an Account'}
              </h2>
              <p className="text-xs text-slate-400">
                {tab === 'login'
                  ? 'Access your saved conversations and cloud quota.'
                  : 'Get 15 free daily messages and sync across devices.'}
              </p>
            </div>

            {/* Tab switch */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`py-2 rounded-lg transition-all ${
                  tab === 'login'
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`py-2 rounded-lg transition-all ${
                  tab === 'register'
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email or Username</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>

              {tab === 'register' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Display Name (Optional)</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {tab === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>{isLoading ? 'Processing...' : tab === 'login' ? 'Sign In' : 'Create Account'}</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={handleGuestAccess}
                className="text-xs text-slate-400 hover:text-cyan-300 transition-colors"
              >
                Or continue as <span className="underline font-semibold">Guest Explorer</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
