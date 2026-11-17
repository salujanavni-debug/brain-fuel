export type QuickMessageCategoryId =
  | 'basic-needs'
  | 'family-personal'
  | 'healthcare'
  | 'emergency'
  | 'custom';

export type SupportedLanguage = 'en' | 'hi' | 'pa';

export interface QuickMessageItem {
  id: string;
  category: QuickMessageCategoryId;
  translations: {
    en: string;
    hi: string;
    pa: string;
  };
  iconKey: string;
  toneClass: string;
  requiresExternalContactNotice?: boolean;
  isHealthcare?: boolean;
  isEmergency?: boolean;
  isCustom?: boolean;
  createdAt?: string;
}

export interface QuickCategoryMeta {
  id: QuickMessageCategoryId;
  label: string;
  description: string;
  badgeTone: string;
}

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string; nativeLabel: string; bcp47: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', bcp47: 'en-US' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', bcp47: 'pa-IN' },
];

export const QUICK_CATEGORIES: QuickCategoryMeta[] = [
  {
    id: 'basic-needs',
    label: 'Basic Needs',
    description: 'Water, meals, restroom, comfort, and rest.',
    badgeTone: 'bg-[#A7F3D0]/70 text-[#292544]',
  },
  {
    id: 'family-personal',
    label: 'Family & Personal',
    description: 'Reaching family, guardians, going home, or personal items.',
    badgeTone: 'bg-[#BFDBFE]/80 text-[#292544]',
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    description: 'Sharing discomfort, symptoms, medicine, or requesting a doctor.',
    badgeTone: 'bg-[#EDE9FE] text-[#292544]',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    description: 'Immediate alerts and safety requests.',
    badgeTone: 'bg-[#FED7AA] text-[#292544]',
  },
  {
    id: 'custom',
    label: 'My Custom Messages',
    description: 'Personal phrases saved locally in your browser for offline use.',
    badgeTone: 'bg-[#DDD6FE] text-[#292544]',
  },
];

export const PREDEFINED_QUICK_MESSAGES: QuickMessageItem[] = [
  // Basic Needs
  {
    id: 'bn-water',
    category: 'basic-needs',
    translations: {
      en: 'I need water.',
      hi: 'मुझे पानी चाहिए।',
      pa: 'ਮੈਨੂੰ ਪਾਣੀ ਚਾਹੀਦਾ ਹੈ।',
    },
    iconKey: 'droplets',
    toneClass: 'bg-[#BFDBFE]/65 hover:bg-[#BFDBFE] border-[#93C5FD]',
  },
  {
    id: 'bn-hungry',
    category: 'basic-needs',
    translations: {
      en: 'I am hungry.',
      hi: 'मुझे भूख लगी है।',
      pa: 'ਮੈਨੂੰ ਭੁੱਖ ਲੱਗੀ ਹੈ।',
    },
    iconKey: 'utensils',
    toneClass: 'bg-[#A7F3D0]/65 hover:bg-[#A7F3D0] border-[#6EE7B7]',
  },
  {
    id: 'bn-food',
    category: 'basic-needs',
    translations: {
      en: 'I need food.',
      hi: 'मुझे खाना चाहिए।',
      pa: 'ਮੈਨੂੰ ਖਾਣਾ ਚਾਹੀਦਾ ਹੈ।',
    },
    iconKey: 'utensils',
    toneClass: 'bg-[#FED7AA]/65 hover:bg-[#FED7AA] border-[#FDBA74]',
  },
  {
    id: 'bn-bathroom',
    category: 'basic-needs',
    translations: {
      en: 'I need to use the bathroom.',
      hi: 'मुझे बाथरूम जाना है।',
      pa: 'ਮੈਨੂੰ ਬਾਥਰੂਮ ਜਾਣਾ ਹੈ।',
    },
    iconKey: 'door',
    toneClass: 'bg-[#EDE9FE]/85 hover:bg-[#EDE9FE] border-[#C4B5FD]',
  },
  {
    id: 'bn-uncomfortable',
    category: 'basic-needs',
    translations: {
      en: 'I am feeling uncomfortable.',
      hi: 'मुझे असहज महसूस हो रहा है।',
      pa: 'ਮੈਨੂੰ ਅਸੁਵਿਧਾ ਮਹਿਸੂਸ ਹੋ ਰਹੀ ਹੈ।',
    },
    iconKey: 'frown',
    toneClass: 'bg-[#FED7AA]/55 hover:bg-[#FED7AA] border-[#FDBA74]',
  },
  {
    id: 'bn-rest',
    category: 'basic-needs',
    translations: {
      en: 'I need some rest.',
      hi: 'मुझे थोड़ा आराम चाहिए।',
      pa: 'ਮੈਨੂੰ ਥੋੜ੍ਹਾ ਆਰਾਮ ਚਾਹੀਦਾ ਹੈ।',
    },
    iconKey: 'moon',
    toneClass: 'bg-[#BFDBFE]/55 hover:bg-[#BFDBFE] border-[#93C5FD]',
  },

  // Family & Personal
  {
    id: 'fp-call-family',
    category: 'family-personal',
    translations: {
      en: 'Please call my family.',
      hi: 'कृपया मेरे परिवार को कॉल करें।',
      pa: 'ਕਿਰਪਾ ਕਰਕੇ ਮੇਰੇ ਪਰਿਵਾਰ ਨੂੰ ਕਾਲ ਕਰੋ।',
    },
    iconKey: 'phone',
    toneClass: 'bg-[#BFDBFE]/65 hover:bg-[#BFDBFE] border-[#93C5FD]',
    requiresExternalContactNotice: true,
  },
  {
    id: 'fp-talk-family',
    category: 'family-personal',
    translations: {
      en: 'I want to talk to my family.',
      hi: 'मैं अपने परिवार से बात करना चाहता हूँ।',
      pa: 'ਮੈਂ ਆਪਣੇ ਪਰਿਵਾਰ ਨਾਲ ਗੱਲ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ।',
    },
    iconKey: 'users',
    toneClass: 'bg-[#EDE9FE]/85 hover:bg-[#EDE9FE] border-[#C4B5FD]',
    requiresExternalContactNotice: true,
  },
  {
    id: 'fp-guardian',
    category: 'family-personal',
    translations: {
      en: 'Please contact my guardian.',
      hi: 'कृपया मेरे अभिभावक से संपर्क करें।',
      pa: 'ਕਿਰਪਾ ਕਰਕੇ ਮੇਰੇ ਸਰਪ੍ਰਸਤ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।',
    },
    iconKey: 'shield-user',
    toneClass: 'bg-[#A7F3D0]/65 hover:bg-[#A7F3D0] border-[#6EE7B7]',
    requiresExternalContactNotice: true,
  },
  {
    id: 'fp-go-home',
    category: 'family-personal',
    translations: {
      en: 'I want to go home.',
      hi: 'मैं घर जाना चाहता हूँ।',
      pa: 'ਮੈਂ ਘਰ ਜਾਣਾ ਚਾਹੁੰਦਾ ਹਾਂ।',
    },
    iconKey: 'home',
    toneClass: 'bg-[#FED7AA]/65 hover:bg-[#FED7AA] border-[#FDBA74]',
  },
  {
    id: 'fp-need-phone',
    category: 'family-personal',
    translations: {
      en: 'I need my phone.',
      hi: 'मुझे अपना फोन चाहिए।',
      pa: 'ਮੈਨੂੰ ਆਪਣਾ ਫ਼ੋਨ ਚਾਹੀਦਾ ਹੈ।',
    },
    iconKey: 'smartphone',
    toneClass: 'bg-[#BFDBFE]/55 hover:bg-[#BFDBFE] border-[#93C5FD]',
  },

  // Healthcare
  {
    id: 'hc-pain',
    category: 'healthcare',
    translations: {
      en: 'I am in pain.',
      hi: 'मुझे दर्द हो रहा है।',
      pa: 'ਮੈਨੂੰ ਦਰਦ ਹੋ ਰਿਹਾ ਹੈ।',
    },
    iconKey: 'heart-pulse',
    toneClass: 'bg-[#FCA5A5]/45 hover:bg-[#FCA5A5]/70 border-[#F87171]/60',
    isHealthcare: true,
  },
  {
    id: 'hc-headache',
    category: 'healthcare',
    translations: {
      en: 'I have a headache.',
      hi: 'मेरे सिर में दर्द है।',
      pa: 'ਮੇਰੇ ਸਿਰ ਵਿੱਚ ਦਰਦ ਹੈ।',
    },
    iconKey: 'activity',
    toneClass: 'bg-[#FED7AA]/75 hover:bg-[#FED7AA] border-[#FB923C]/60',
    isHealthcare: true,
  },
  {
    id: 'hc-dizzy',
    category: 'healthcare',
    translations: {
      en: 'I am feeling dizzy.',
      hi: 'मुझे चक्कर आ रहे हैं।',
      pa: 'ਮੈਨੂੰ ਚੱਕਰ ਆ ਰਹੇ ਹਨ।',
    },
    iconKey: 'wind',
    toneClass: 'bg-[#EDE9FE]/90 hover:bg-[#EDE9FE] border-[#A78BFA]/70',
    isHealthcare: true,
  },
  {
    id: 'hc-breathing',
    category: 'healthcare',
    translations: {
      en: 'I am having difficulty breathing.',
      hi: 'मुझे सांस लेने में तकलीफ हो रही है।',
      pa: 'ਮੈਨੂੰ ਸਾਹ ਲੈਣ ਵਿੱਚ ਮੁਸ਼ਕਲ ਹੋ ਰਹੀ ਹੈ।',
    },
    iconKey: 'wind',
    toneClass: 'bg-[#FCA5A5]/60 hover:bg-[#FCA5A5]/80 border-[#EF4444]/60',
    isHealthcare: true,
    isEmergency: true,
    requiresExternalContactNotice: true,
  },
  {
    id: 'hc-medicine',
    category: 'healthcare',
    translations: {
      en: 'I need medicine.',
      hi: 'मुझे दवाई चाहिए।',
      pa: 'ਮੈਨੂੰ ਦਵਾਈ ਚਾਹੀਦੀ ਹੈ।',
    },
    iconKey: 'pill',
    toneClass: 'bg-[#A7F3D0]/70 hover:bg-[#A7F3D0] border-[#34D399]/60',
    isHealthcare: true,
  },
  {
    id: 'hc-doctor',
    category: 'healthcare',
    translations: {
      en: 'Please call a doctor.',
      hi: 'कृपया डॉक्टर को बुलाएं।',
      pa: 'ਕਿਰਪਾ ਕਰਕੇ ਡਾਕਟਰ ਨੂੰ ਬੁਲਾਓ।',
    },
    iconKey: 'stethoscope',
    toneClass: 'bg-[#BFDBFE]/75 hover:bg-[#BFDBFE] border-[#60A5FA]/70',
    isHealthcare: true,
    requiresExternalContactNotice: true,
  },
  {
    id: 'hc-help-now',
    category: 'healthcare',
    translations: {
      en: 'I need help immediately.',
      hi: 'मुझे तुरंत मदद चाहिए।',
      pa: 'ਮੈਨੂੰ ਤੁਰੰਤ ਮਦਦ ਚਾਹੀਦੀ ਹੈ।',
    },
    iconKey: 'alert',
    toneClass: 'bg-[#FCA5A5]/65 hover:bg-[#FCA5A5]/85 border-[#EF4444]/65',
    isHealthcare: true,
    isEmergency: true,
    requiresExternalContactNotice: true,
  },

  // Emergency
  {
    id: 'em-emergency',
    category: 'emergency',
    translations: {
      en: 'This is an emergency.',
      hi: 'यह एक आपातकालीन स्थिति है।',
      pa: 'ਇਹ ਇੱਕ ਐਮਰਜੈਂਸੀ ਹੈ।',
    },
    iconKey: 'siren',
    toneClass: 'bg-[#FCA5A5]/70 hover:bg-[#FCA5A5]/90 border-[#DC2626]/60',
    isEmergency: true,
    requiresExternalContactNotice: true,
  },
  {
    id: 'em-help',
    category: 'emergency',
    translations: {
      en: 'Please help me.',
      hi: 'कृपया मेरी मदद करें।',
      pa: 'ਕਿਰਪਾ ਕਰਕੇ ਮੇਰੀ ਮਦਦ ਕਰੋ।',
    },
    iconKey: 'hand-helping',
    toneClass: 'bg-[#FED7AA]/85 hover:bg-[#FED7AA] border-[#EA580C]/60',
    isEmergency: true,
  },
  {
    id: 'em-unsafe',
    category: 'emergency',
    translations: {
      en: 'I am not feeling safe.',
      hi: 'मैं सुरक्षित महसूस नहीं कर रहा हूँ।',
      pa: 'ਮੈਂ ਸੁਰੱਖਿਅਤ ਮਹਿਸੂਸ ਨਹੀਂ ਕਰ ਰਿਹਾ ਹਾਂ।',
    },
    iconKey: 'shield-alert',
    toneClass: 'bg-[#FCA5A5]/60 hover:bg-[#FCA5A5]/80 border-[#EF4444]/60',
    isEmergency: true,
    requiresExternalContactNotice: true,
  },
  {
    id: 'em-call-services',
    category: 'emergency',
    translations: {
      en: 'Please call emergency services.',
      hi: 'कृपया आपातकालीन सेवाओं को कॉल करें।',
      pa: 'ਕਿਰਪਾ ਕਰਕੇ ਐਮਰਜੈਂਸੀ ਸੇਵਾਵਾਂ ਨੂੰ ਕਾਲ ਕਰੋ।',
    },
    iconKey: 'phone-call',
    toneClass: 'bg-[#FCA5A5]/75 hover:bg-[#FCA5A5] border-[#DC2626]/70',
    isEmergency: true,
    requiresExternalContactNotice: true,
  },
];

export interface PictureBoardCard {
  id: string;
  label: string;
  message: string;
  emoji: string;
  tone: string;
}

export const PICTURE_BOARD_CARDS: PictureBoardCard[] = [
  { id: 'pic-water', label: 'Water', message: 'I need water.', emoji: '💧', tone: 'bg-[#BFDBFE]/70' },
  { id: 'pic-food', label: 'Food', message: 'I need food.', emoji: '🍲', tone: 'bg-[#FED7AA]/75' },
  { id: 'pic-bathroom', label: 'Bathroom', message: 'I need to use the bathroom.', emoji: '🚻', tone: 'bg-[#EDE9FE]' },
  { id: 'pic-pain', label: 'Pain', message: 'I am in pain.', emoji: '🩹', tone: 'bg-[#FCA5A5]/60' },
  { id: 'pic-doctor', label: 'Doctor', message: 'Please call a doctor.', emoji: '🩺', tone: 'bg-[#BFDBFE]/80' },
  { id: 'pic-medicine', label: 'Medicine', message: 'I need medicine.', emoji: '💊', tone: 'bg-[#A7F3D0]/75' },
  { id: 'pic-family', label: 'Family', message: 'Please call my family.', emoji: '👨‍👩‍👧', tone: 'bg-[#EDE9FE]' },
  { id: 'pic-home', label: 'Home', message: 'I want to go home.', emoji: '🏠', tone: 'bg-[#FED7AA]/70' },
  { id: 'pic-rest', label: 'Rest', message: 'I need some rest.', emoji: '🛌', tone: 'bg-[#A7F3D0]/65' },
  { id: 'pic-help', label: 'Help', message: 'Please help me.', emoji: '🆘', tone: 'bg-[#FCA5A5]/70' },
  { id: 'pic-yes', label: 'Yes', message: 'Yes.', emoji: '✅', tone: 'bg-[#A7F3D0]/85' },
  { id: 'pic-no', label: 'No', message: 'No.', emoji: '❌', tone: 'bg-[#FED7AA]/80' },
];

export const STARTER_CUSTOM_MESSAGES = [
  'Please wait for me.',
  'I need assistance.',
  'I want to speak to my brother.',
  'Please take me home.',
];

const OFFLINE_PREDEFINED_STORAGE_KEY = 'signspeak_offline_phrases_v1';
const CUSTOM_MESSAGES_STORAGE_KEY = 'signspeak_custom_messages_v1';

export function syncPredefinedMessagesOffline(): QuickMessageItem[] {
  if (typeof window === 'undefined') return PREDEFINED_QUICK_MESSAGES;
  try {
    window.localStorage.setItem(
      OFFLINE_PREDEFINED_STORAGE_KEY,
      JSON.stringify(PREDEFINED_QUICK_MESSAGES)
    );
    return PREDEFINED_QUICK_MESSAGES;
  } catch {
    return PREDEFINED_QUICK_MESSAGES;
  }
}

export function getOfflinePredefinedMessages(): QuickMessageItem[] {
  if (typeof window === 'undefined') return PREDEFINED_QUICK_MESSAGES;
  try {
    const raw = window.localStorage.getItem(OFFLINE_PREDEFINED_STORAGE_KEY);
    if (!raw) {
      return syncPredefinedMessagesOffline();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : PREDEFINED_QUICK_MESSAGES;
  } catch {
    return PREDEFINED_QUICK_MESSAGES;
  }
}

export function getCustomMessages(): QuickMessageItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_MESSAGES_STORAGE_KEY);
    if (raw === null) {
      const seeded: QuickMessageItem[] = STARTER_CUSTOM_MESSAGES.map((text, idx) => ({
        id: `custom-starter-${idx + 1}`,
        category: 'custom',
        translations: { en: text, hi: text, pa: text },
        iconKey: 'message',
        toneClass: 'bg-[#EDE9FE]/80 hover:bg-[#EDE9FE] border-[#C4B5FD]',
        isCustom: true,
        createdAt: new Date().toISOString(),
      }));
      window.localStorage.setItem(CUSTOM_MESSAGES_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomMessages(items: QuickMessageItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUSTOM_MESSAGES_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function createCustomMessageItem(text: string): QuickMessageItem {
  const cleaned = text.trim();
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: 'custom',
    translations: {
      en: cleaned,
      hi: cleaned,
      pa: cleaned,
    },
    iconKey: 'message',
    toneClass: 'bg-[#EDE9FE]/80 hover:bg-[#EDE9FE] border-[#C4B5FD]',
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
}
