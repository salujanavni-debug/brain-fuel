import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Droplets,
  HandHelping,
  HeartPulse,
  HelpCircle,
  Maximize2,
  MessageSquareHeart,
  PhoneCall,
  Pin,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { HandIllustration } from '../components/HandIllustration';
import { fetchEmergencyMessagesFromApi } from '../services/translationService';
import { copyToClipboard, speakTextDetailed, stopSpeech } from '../utils/speech';

const EMERGENCY_PHRASES = [
  {
    id: 'help',
    text: 'I need help.',
    illustration: 'help',
    icon: AlertCircle,
    toneClass: 'bg-[#FED7AA] hover:bg-[#FDBA74] border-[#FB923C]/50',
  },
  {
    id: 'pain',
    text: 'I am in pain.',
    illustration: 'pain',
    icon: HeartPulse,
    toneClass: 'bg-[#FCA5A5]/65 hover:bg-[#FCA5A5]/85 border-[#EF4444]/40',
  },
  {
    id: 'doctor',
    text: 'Call a doctor.',
    illustration: 'doctor',
    icon: PhoneCall,
    toneClass: 'bg-[#BFDBFE] hover:bg-[#93C5FD] border-[#60A5FA]/50',
  },
  {
    id: 'water',
    text: 'I need water.',
    illustration: 'water',
    icon: Droplets,
    toneClass: 'bg-[#A7F3D0] hover:bg-[#6EE7B7] border-[#34D399]/50',
  },
  {
    id: 'cannot-understand',
    text: 'I cannot understand.',
    illustration: 'learn',
    icon: HelpCircle,
    toneClass: 'bg-[#EDE9FE] hover:bg-[#DDD6FE] border-[#A78BFA]/50',
  },
  {
    id: 'contact-family',
    text: 'Please contact my family.',
    illustration: 'friend',
    icon: Users,
    toneClass: 'bg-[#FDE68A]/75 hover:bg-[#FDE68A] border-[#F59E0B]/45',
  },
  {
    id: 'assistance',
    text: 'I need assistance.',
    illustration: 'help',
    icon: HandHelping,
    toneClass: 'bg-[#E9D5FF]/70 hover:bg-[#DDD6FE] border-[#9333EA]/35',
  },
];

const USAGE_STORAGE_KEY = 'signspeak_emergency_usage_v1';

function loadUsageState() {
  if (typeof window === 'undefined') {
    return { counts: {}, pinned: ['help', 'doctor', 'contact-family'] };
  }
  try {
    const raw = window.localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) return { counts: {}, pinned: ['help', 'doctor', 'contact-family'] };
    const parsed = JSON.parse(raw);
    return {
      counts: parsed?.counts && typeof parsed.counts === 'object' ? parsed.counts : {},
      pinned: Array.isArray(parsed?.pinned) ? parsed.pinned : ['help', 'doctor', 'contact-family'],
    };
  } catch {
    return { counts: {}, pinned: ['help', 'doctor', 'contact-family'] };
  }
}

export function EmergencyPage() {
  const [phrases, setPhrases] = useState(EMERGENCY_PHRASES);
  const [activePhrase, setActivePhrase] = useState(EMERGENCY_PHRASES[0]);
  const [speaking, setSpeaking] = useState(false);
  const [speechNotice, setSpeechNotice] = useState(null);
  const [copied, setCopied] = useState(false);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [usage, setUsage] = useState(() => loadUsageState());

  useEffect(() => {
    let active = true;
    fetchEmergencyMessagesFromApi()
      .then((res) => {
        if (!active || !Array.isArray(res.messages) || res.messages.length === 0) return;
        const metaById = new Map(EMERGENCY_PHRASES.map((item) => [item.id, item]));
        const hydrated = res.messages.map((msg) => {
          const fallback = metaById.get(msg.id);
          return {
            id: msg.id,
            text: msg.message,
            illustration: msg.gesture_id || fallback?.illustration || 'help',
            icon: fallback?.icon || AlertCircle,
            toneClass:
              fallback?.toneClass || 'bg-[#EDE9FE] hover:bg-[#DDD6FE] border-[#A78BFA]/50',
            speechRate: msg.speech_rate || 0.9,
          };
        });
        setPhrases(hydrated);
        setActivePhrase((prev) => hydrated.find((item) => item.id === prev.id) || hydrated[0]);
      })
      .catch(() => {
        // Offline fallback keeps all 7 urgent phrases immediately usable
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage));
    } catch {
      // Ignore storage errors
    }
  }, [usage]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (!fullScreenOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setFullScreenOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullScreenOpen]);

  const frequentPhrases = useMemo(() => {
    const scored = phrases.map((p) => ({
      phrase: p,
      isPinned: usage.pinned.includes(p.id),
      count: usage.counts[p.id] || 0,
    }));
    scored.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.count - a.count;
    });
    return scored.slice(0, 4).map((item) => item.phrase);
  }, [phrases, usage]);

  const handleTogglePin = (phraseId) => {
    setUsage((prev) => {
      const exists = prev.pinned.includes(phraseId);
      return {
        ...prev,
        pinned: exists
          ? prev.pinned.filter((id) => id !== phraseId)
          : [phraseId, ...prev.pinned],
      };
    });
  };

  const handleTriggerPhrase = (phrase) => {
    setActivePhrase(phrase);
    setCopied(false);
    setSpeechNotice(null);
    setUsage((prev) => ({
      ...prev,
      counts: {
        ...prev.counts,
        [phrase.id]: (prev.counts[phrase.id] || 0) + 1,
      },
    }));

    const res = speakTextDetailed(phrase.text, {
      rate: typeof phrase.speechRate === 'number' ? phrase.speechRate : 0.9,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: (msg) => {
        setSpeaking(false);
        setSpeechNotice(msg);
      },
    });
    if (!res.started && res.error) setSpeechNotice(res.error);
  };

  const handleCopy = async () => {
    if (!activePhrase) return;
    const ok = await copyToClipboard(activePhrase.text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#B91C1C]">
            Instant Communication Aid · Works Offline &amp; Without Login
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#292544]">
            Emergency Mode
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#292544]/75">
            Tap any high-visibility card below to display your urgent message in large text, speak
            it aloud via browser SpeechSynthesis, or copy it immediately.
          </p>
        </div>
        <Button to="/quick-messages?category=healthcare" variant="outline" size="md">
          <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
          <span>More Healthcare &amp; Needs Phrases</span>
        </Button>
      </div>

      <div
        role="note"
        className="rounded-3xl border-2 border-[#F87171]/60 bg-[#FCA5A5]/25 px-5 py-4 text-sm text-[#292544]"
      >
        <p className="flex items-center gap-2 font-extrabold text-[#991B1B]">
          <PhoneCall className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Important: Display &amp; Speech Aid Only — Does Not Contact Emergency Services</span>
        </p>
        <p className="mt-1 font-semibold leading-relaxed">
          Selecting these buttons displays and speaks your message locally on your device. It does
          not automatically dial emergency services (911 / 112), contact a hospital, or message
          your family. Always place an emergency call directly when urgent medical care is needed.
        </p>
      </div>

      <Card tone="default" padding="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#6D28D9]">
            <Pin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Quick Access · Frequently Used &amp; Pinned</span>
          </p>
          <span className="text-[11px] font-semibold text-[#292544]/60">
            Tap to speak immediately · Use pin icons below to customize
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {frequentPhrases.map((phrase) => (
            <button
              key={`quick-${phrase.id}`}
              type="button"
              onClick={() => handleTriggerPhrase(phrase)}
              className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-extrabold text-[#292544] transition-colors ${
                activePhrase.id === phrase.id
                  ? 'border-[#7C3AED] bg-[#EDE9FE]'
                  : 'border-[#EDE9FE] bg-[#FFFCF8] hover:bg-[#EDE9FE]/55'
              }`}
            >
              <Volume2 className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />
              <span>{phrase.text}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card tone="peach" className="border-2 border-[#FB923C]/40">
        <div className="grid items-center gap-6 md:grid-cols-12">
          <div className="md:col-span-4">
            <HandIllustration gesture={activePhrase.illustration} className="h-44 w-full" />
          </div>
          <div className="space-y-4 md:col-span-8">
            <p className="text-xs font-bold text-[#9A3412]">
              Active Display Message · Tap any phrase card below to update or repeat
            </p>
            <p className="text-3xl font-extrabold tracking-tight text-[#292544] sm:text-5xl">
              {activePhrase.text}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                variant="primary"
                size="md"
                onClick={() => handleTriggerPhrase(activePhrase)}
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                <span>{speaking ? 'Speaking...' : 'Speak Aloud'}</span>
              </Button>
              <Button variant="outline" size="md" onClick={() => setFullScreenOpen(true)}>
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
                <span>Full Screen</span>
              </Button>
              <Button variant="outline" size="md" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </Button>
            </div>
            {speechNotice && (
              <p className="rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-[#9A3412]">
                {speechNotice}
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {phrases.map((phrase, idx) => {
          const Icon = phrase.icon;
          const isActive = activePhrase.id === phrase.id;
          const isPinned = usage.pinned.includes(phrase.id);
          const count = usage.counts[phrase.id] || 0;
          return (
            <div
              key={phrase.id}
              className={`flex min-h-[92px] items-center justify-between gap-3 rounded-3xl border-2 px-5 py-4 transition-all duration-150 ${
                phrase.toneClass
              } ${isActive ? 'ring-3 ring-[#292544]/25' : ''} ${
                idx === phrases.length - 1 ? 'sm:col-span-2' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => handleTriggerPhrase(phrase)}
                className="flex flex-1 cursor-pointer items-center gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#292544]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-[#292544]">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <span className="block text-xl font-extrabold text-[#292544] sm:text-2xl">
                    {phrase.text}
                  </span>
                  {count > 0 && (
                    <span className="font-mono text-[11px] font-bold text-[#292544]/65">
                      Used {count} time{count === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTogglePin(phrase.id)}
                  aria-label={isPinned ? `Unpin ${phrase.text}` : `Pin ${phrase.text}`}
                  title={isPinned ? 'Unpin from Quick Access' : 'Pin to Quick Access'}
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-colors ${
                    isPinned
                      ? 'bg-[#292544] text-white'
                      : 'bg-white/75 text-[#292544]/70 hover:bg-white'
                  }`}
                >
                  <Pin className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerPhrase(phrase)}
                  aria-label={`Speak ${phrase.text}`}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/75 text-[#292544] hover:bg-white"
                >
                  <Volume2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {fullScreenOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full screen emergency display"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-[#292544] p-6 text-white sm:p-10"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#FED7AA]">
              Emergency Communication Display
            </span>
            <button
              type="button"
              onClick={() => setFullScreenOpen(false)}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-white/15 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-white/25 cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span>Close (Esc)</span>
            </button>
          </div>
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-5xl font-extrabold leading-tight text-white sm:text-7xl">
              {activePhrase.text}
            </p>
            <p className="mt-6 text-sm font-semibold text-[#FED7AA]">
              Note: Showing this message does not dial emergency services automatically. Please call
              using your phone if needed.
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => handleTriggerPhrase(activePhrase)}
              className="inline-flex min-h-[56px] items-center gap-3 rounded-2xl bg-[#FED7AA] px-8 py-4 text-lg font-extrabold text-[#292544] hover:bg-[#FDBA74] cursor-pointer"
            >
              <Volume2 className="h-6 w-6" aria-hidden="true" />
              <span>{speaking ? 'Speaking...' : 'Speak Aloud'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
