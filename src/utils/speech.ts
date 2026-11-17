export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export type SpeechPlaybackState = 'idle' | 'speaking' | 'paused';

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  voiceURI?: string;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

export interface SpeakResult {
  started: boolean;
  voiceMatched: boolean;
  error?: string;
}

export function getAllVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  const voices = window.speechSynthesis.getVoices() || [];
  return [...voices].sort((a, b) => {
    const aEn = a.lang.toLowerCase().startsWith('en') ? 0 : 1;
    const bEn = b.lang.toLowerCase().startsWith('en') ? 0 : 1;
    if (aEn !== bEn) return aEn - bEn;
    if (a.localService !== b.localService) return a.localService ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function getVoicesForLanguage(lang: string): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  const voices = window.speechSynthesis.getVoices() || [];
  const baseLang = lang.split('-')[0].toLowerCase();
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith(baseLang));
}

export function pauseSpeech(): boolean {
  if (!isSpeechSupported()) return false;
  try {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function resumeSpeech(): boolean {
  if (!isSpeechSupported()) return false;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function stopSpeech(): boolean {
  if (!isSpeechSupported()) return false;
  try {
    window.speechSynthesis.cancel();
    return true;
  } catch {
    return false;
  }
}

export function speakTextDetailed(
  text: string,
  {
    rate = 0.95,
    pitch = 1,
    lang = 'en-US',
    voiceURI,
    onStart,
    onPause,
    onResume,
    onEnd,
    onError,
  }: SpeakOptions = {}
): SpeakResult {
  if (!text.trim()) {
    const msg = 'No message text available to speak.';
    onError?.(msg);
    return { started: false, voiceMatched: false, error: msg };
  }

  if (!isSpeechSupported()) {
    const msg =
      'Text-to-speech is not supported in this browser. The message remains displayed in large text for reading.';
    onError?.(msg);
    return { started: false, voiceMatched: false, error: msg };
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = lang;

    const allVoices = window.speechSynthesis.getVoices() || [];
    const exactVoice = voiceURI
      ? allVoices.find((v) => v.voiceURI === voiceURI)
      : undefined;

    const matchingVoices = getVoicesForLanguage(lang);
    const localVoice =
      exactVoice ||
      matchingVoices.find((v) => v.localService) ||
      matchingVoices[0];

    if (localVoice) {
      utterance.voice = localVoice;
      utterance.lang = localVoice.lang || lang;
    }

    if (onStart) utterance.onstart = onStart;
    if (onPause) utterance.onpause = onPause;
    if (onResume) utterance.onresume = onResume;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = () => {
      const msg =
        'Voice playback failed on this device. Please show the large screen text instead.';
      onError?.(msg);
    };

    window.speechSynthesis.speak(utterance);
    return {
      started: true,
      voiceMatched: Boolean(exactVoice || matchingVoices.length > 0),
      error:
        !exactVoice && matchingVoices.length === 0 && !lang.startsWith('en')
          ? `No dedicated ${lang} voice installed on this device; attempted default voice while showing translated text clearly.`
          : undefined,
    };
  } catch {
    const msg =
      'Unable to initialize speech output. The message is displayed clearly for reading.';
    onError?.(msg);
    return { started: false, voiceMatched: false, error: msg };
  }
}

export function speakText(text: string, options: SpeakOptions = {}): boolean {
  return speakTextDetailed(text, options).started;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export interface BrowserSpeechRecognitionResultEvent {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string; confidence: number };
  }>;
}

export interface BrowserSpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
}

export function createSpeechRecognizer(lang = 'en-US'): BrowserSpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!Ctor) return null;
  const instance = new Ctor();
  instance.lang = lang;
  instance.interimResults = true;
  instance.continuous = false;
  instance.maxAlternatives = 1;
  return instance;
}

export function getSpeechRecognitionErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission was denied. Allow microphone access in your browser site settings or type your reply directly.';
    case 'audio-capture':
      return 'No working microphone was detected. Connect a microphone or type your reply below.';
    case 'no-speech':
      return 'No speech was detected. Please speak closer to the microphone or type your reply.';
    case 'network':
      return 'Browser speech recognition requires an internet connection on most browsers. Please type your response below.';
    case 'aborted':
      return 'Voice listening stopped.';
    default:
      return 'Voice recognition did not produce a result. Please type your response in the box below.';
  }
}
