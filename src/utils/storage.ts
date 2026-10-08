import { AppSettings, ChatSession, PlanTier, UserQuota } from '../types';
import { INITIAL_USER_QUOTA, PLANS_CONFIG } from '../data/constants';

const SESSIONS_KEY = 'atlantis_ai_sessions_v1';
const QUOTA_KEY = 'atlantis_ai_quota_v1';
const SETTINGS_KEY = 'atlantis_ai_settings_v1';

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadUserQuota(): UserQuota {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    const today = getTodayDateString();
    if (raw) {
      const parsed: UserQuota = JSON.parse(raw);
      // Check if day changed to reset daily counters
      if (parsed.lastResetDay !== today) {
        const planConfig = PLANS_CONFIG[parsed.plan] || PLANS_CONFIG.free;
        const refreshed: UserQuota = {
          ...parsed,
          dailyCreditsTotal: planConfig.creditsPerDay,
          creditsUsedToday: 0,
          imageCreditsTotal: planConfig.imagesPerDay,
          imageCreditsUsedToday: 0,
          lastResetDay: today,
        };
        saveUserQuota(refreshed);
        return refreshed;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load user quota:', e);
  }
  return { ...INITIAL_USER_QUOTA, lastResetDay: getTodayDateString() };
}

export function saveUserQuota(quota: UserQuota): void {
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
  } catch (e) {
    console.error('Failed to save user quota:', e);
  }
}

export function updateUserPlan(newPlan: PlanTier): UserQuota {
  const current = loadUserQuota();
  const planConfig = PLANS_CONFIG[newPlan];
  const updated: UserQuota = {
    ...current,
    plan: newPlan,
    dailyCreditsTotal: planConfig.creditsPerDay,
    imageCreditsTotal: planConfig.imagesPerDay,
    // When upgrading, give fresh allocation or preserve proportional
    creditsUsedToday: Math.min(current.creditsUsedToday, planConfig.creditsPerDay),
    imageCreditsUsedToday: Math.min(current.imageCreditsUsedToday, planConfig.imagesPerDay),
  };
  saveUserQuota(updated);
  return updated;
}

export function consumeMessageCredit(): { success: boolean; quota: UserQuota; error?: string } {
  const quota = loadUserQuota();
  if (quota.creditsUsedToday >= quota.dailyCreditsTotal) {
    return {
      success: false,
      quota,
      error: 'لقد استنفدت رصيدك المجاني اليومي. يمكنك الترقية إلى أتلانتس برو للاستمتاع بـ 1,000 رصيد يومياً!',
    };
  }

  const updated: UserQuota = {
    ...quota,
    creditsUsedToday: quota.creditsUsedToday + 1,
  };
  saveUserQuota(updated);
  return { success: true, quota: updated };
}

export function consumeImageCredit(): { success: boolean; quota: UserQuota; error?: string } {
  const quota = loadUserQuota();
  if (quota.imageCreditsUsedToday >= quota.imageCreditsTotal) {
    return {
      success: false,
      quota,
      error: 'استنفدت رصيد توليد الصور اليومي للخطة الحالية. قم بالترقية للحصول على 100 صورة يومياً!',
    };
  }

  const updated: UserQuota = {
    ...quota,
    imageCreditsUsedToday: quota.imageCreditsUsedToday + 1,
  };
  saveUserQuota(updated);
  return { success: true, quota: updated };
}

export function resetTodayCredits(): UserQuota {
  const current = loadUserQuota();
  const updated: UserQuota = {
    ...current,
    creditsUsedToday: 0,
    imageCreditsUsedToday: 0,
    lastResetDay: getTodayDateString(),
  };
  saveUserQuota(updated);
  return updated;
}

export function loadChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load chat sessions:', e);
  }
  return [];
}

export function saveChatSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save chat sessions:', e);
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  isDeepThinking: false,
  enableSearch: false,
  voiceName: 'Kore',
  customInstructions: '',
  autoScroll: true,
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}
