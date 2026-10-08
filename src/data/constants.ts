import { Persona, PlanTier, UserQuota } from '../types';

export const ATLANTIS_PERSONAS: Persona[] = [
  {
    id: 'atlantis-core',
    name: 'Atlantis Core',
    role: 'General Polymath Intelligence',
    description: 'Flagship cognitive AI engine for general queries, analytical tasks, and everyday problem-solving.',
    icon: 'Brain',
    badge: 'Flagship',
    systemInstruction: `You are Atlantis Core, the flagship intelligence engine of Atlantis AI.
You communicate fluently and naturally in both Arabic and English.
- If the user writes in Arabic, respond in rich, clear, and comprehensive Arabic.
- If the user writes in English, respond in clear, articulate English.
- When generating code, provide complete, production-ready code inside Markdown code blocks.`,
  },
  {
    id: 'triton-coder',
    name: 'Triton Software Engineer',
    role: 'Full-Stack Software Architect',
    description: 'Specialized in clean architecture, debugging, algorithms, and interactive web artifacts.',
    icon: 'Code2',
    badge: 'Code & Dev',
    systemInstruction: `You are Triton, Senior Software Architect at Atlantis AI.
- Write complete, clean, modular code with zero shortcuts.
- Always wrap code in Markdown blocks with exact language identifier (e.g. \`\`\`html, \`\`\`tsx, \`\`\`python).
- For web applications or components, write self-contained runnable HTML/CSS/JS so users can preview it immediately in the live Sandbox runner.
- If the user writes in Arabic, explain technical concepts and logic clearly in Arabic while keeping code identifiers standard.`,
  },
  {
    id: 'oceanic-researcher',
    name: 'Deep Oceanic Researcher',
    role: 'Academic & Market Analyst',
    description: 'Synthesizes complex data, prepares structured analytical reports, and evaluates market trends.',
    icon: 'Search',
    badge: 'Deep Research',
    systemInstruction: `You are the Deep Oceanic Researcher at Atlantis AI. Provide in-depth, structured analytical reports with clear sections, evidence-based reasoning, SWOT analysis, and logical conclusions. Communicate in Arabic or English based on user request.`,
  },
  {
    id: 'siren-creative',
    name: 'Siren Creative Studio',
    role: 'Storyteller & Copywriter',
    description: 'Crafts persuasive marketing copy, engaging narratives, speeches, and creative writing.',
    icon: 'Sparkles',
    badge: 'Creative',
    systemInstruction: `You are Siren Creative at Atlantis AI. You craft engaging, creative, articulate stories, screenplays, and marketing copy. Respond in Arabic or English as requested.`,
  },
  {
    id: 'poseidon-strategy',
    name: 'Poseidon Business Strategist',
    role: 'Executive Startup & Strategy Advisor',
    description: 'Feasibility studies, monetization strategies, pitch decks, and operational roadmaps.',
    icon: 'Briefcase',
    badge: 'Strategy',
    systemInstruction: `You are Poseidon Strategist at Atlantis AI. You provide executive-level strategic advice, business models, financial projections, and go-to-market strategies. Respond in Arabic or English as requested.`,
  },
];

export const PLANS_CONFIG: Record<
  PlanTier,
  {
    id: PlanTier;
    name: string;
    tagline: string;
    price: string;
    billingPeriod: string;
    creditsPerDay: number;
    imagesPerDay: number;
    badge: string;
    popular?: boolean;
    features: string[];
  }
> = {
  free: {
    id: 'free',
    name: 'Ocean Free',
    tagline: 'Essential intelligence for everyday exploration',
    price: '$0',
    billingPeriod: 'Free forever',
    creditsPerDay: 15,
    imagesPerDay: 3,
    badge: 'Current Plan',
    features: [
      '15 Real AI messages every day',
      'Atlantis Flash 3.8 high-speed model',
      '3 High-resolution image generations / day',
      'Interactive Live Artifact Sandbox (HTML/JS/SVG)',
      'Multimodal image & document vision analysis',
      'Live web grounding & source citations',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Atlantis Pro',
    tagline: 'For developers and power creators requiring deep reasoning',
    price: '$19',
    billingPeriod: 'per month',
    creditsPerDay: 1000,
    imagesPerDay: 100,
    badge: 'Most Popular ⭐',
    popular: true,
    features: [
      '1,000 Real AI messages per day',
      'Atlantis Deep Ocean Reasoning mode',
      '100 High-resolution 4K image generations',
      'Priority server compute & lowest latency',
      'Full live interactive artifact execution',
      'Neural text-to-speech audio readouts',
      'Unlimited conversation history & sync',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Atlantis Enterprise',
    tagline: 'Dedicated cloud compute and custom models for teams',
    price: '$49',
    billingPeriod: 'per user / month',
    creditsPerDay: 99999,
    imagesPerDay: 1000,
    badge: 'Enterprise',
    features: [
      'Unlimited AI messages & reasoning tokens',
      'Custom company persona & knowledge base',
      '1,000 High-speed image generations / day',
      'Dedicated 24/7 technical support & SLA',
      'Custom API keys & webhook integration',
      'Enterprise security & zero data retention',
    ],
  },
};

export const INITIAL_USER_QUOTA: UserQuota = {
  plan: 'free',
  dailyCreditsTotal: 15,
  creditsUsedToday: 0,
  imageCreditsTotal: 3,
  imageCreditsUsedToday: 0,
  lastResetDay: new Date().toISOString().split('T')[0],
};

export const SUGGESTED_PROMPTS = [
  {
    category: 'Coding & Artifacts',
    prompt: 'Build a complete interactive Glassmorphism Calculator in HTML, CSS, and JS ready to run in the live sandbox.',
    icon: 'Code2',
  },
  {
    category: 'Deep Reasoning',
    prompt: 'Compare decentralized vs centralized cloud architecture regarding security, cost, and scalability.',
    icon: 'Brain',
  },
  {
    category: 'Business & Startup',
    prompt: 'Draft an executive feasibility study for an AI-powered personalized e-commerce recommendation platform.',
    icon: 'Briefcase',
  },
  {
    category: 'Creative Sci-Fi',
    prompt: 'Write an intriguing sci-fi short story about rediscovering Atlantis as an ancient quantum AI hub.',
    icon: 'Sparkles',
  },
];
