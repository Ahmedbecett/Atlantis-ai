import React from 'react';
import { X, Check, Crown, Zap, Shield, RefreshCw } from 'lucide-react';
import { PlanTier, UserQuota } from '../types';
import { PLANS_CONFIG } from '../data/constants';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuota: UserQuota;
  onSelectPlan: (plan: PlanTier) => void;
  onResetTodayQuota: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentQuota,
  onSelectPlan,
  onResetTodayQuota,
}) => {
  if (!isOpen) return null;

  const plans: PlanTier[] = ['free', 'pro', 'enterprise'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#070e1e] border border-cyan-800/40 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
            <Crown className="w-3.5 h-3.5" />
            <span>Atlantis AI Plans & Subscriptions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Choose Your Tier & Unlock Full Power
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-2">
            Atlantis offers a generous daily free quota with flexible upgrades for software engineers and power creators.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((tierKey) => {
            const plan = PLANS_CONFIG[tierKey];
            const isCurrent = currentQuota.plan === tierKey;

            return (
              <div
                key={tierKey}
                className={`relative flex flex-col justify-between p-6 rounded-2xl border transition-all duration-200 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-[#0e2142] to-[#07132a] border-cyan-500/60 shadow-xl shadow-cyan-950/50'
                    : 'bg-[#091224] border-slate-800 hover:border-slate-700'
                } ${isCurrent ? 'ring-2 ring-cyan-400/80' : ''}`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Current
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mb-4 min-h-[32px]">{plan.tagline}</p>

                  <div className="flex items-baseline gap-1 mb-5 pb-4 border-b border-slate-800">
                    <span className="text-3xl font-black text-cyan-300">{plan.price}</span>
                    <span className="text-xs text-slate-400">/ {plan.billingPeriod}</span>
                  </div>

                  {/* Quota Highlights */}
                  <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-300">
                      <span>Daily Messages:</span>
                      <span className="font-bold text-cyan-400">
                        {plan.creditsPerDay > 5000 ? 'Unlimited' : plan.creditsPerDay.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Image Generations:</span>
                      <span className="font-bold text-cyan-400">
                        {plan.imagesPerDay > 500 ? 'Unlimited' : `${plan.imagesPerDay} / day`}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2.5 mb-6 text-xs text-slate-300">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Plan Action Button */}
                <button
                  onClick={() => {
                    onSelectPlan(tierKey);
                    onClose();
                  }}
                  disabled={isCurrent}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-slate-800 text-slate-400 cursor-default'
                      : plan.popular
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20 active:scale-[0.98]'
                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-slate-700 active:scale-[0.98]'
                  }`}
                >
                  {isCurrent ? (
                    <span>Active Plan</span>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>{tierKey === 'free' ? 'Switch to Free Tier' : `Upgrade to ${plan.name}`}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Quota Management & Testing Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>
              Today's Usage: {currentQuota.creditsUsedToday} of {currentQuota.dailyCreditsTotal} credits
            </span>
          </div>

          <button
            onClick={onResetTodayQuota}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors border border-slate-700/60"
            title="Reset daily usage counter for testing"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Daily Usage (Test)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
