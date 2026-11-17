import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  Copy,
  DoorOpen,
  Droplets,
  Edit3,
  Frown,
  Globe,
  HandHelping,
  HeartPulse,
  Home,
  Info,
  Maximize2,
  MessageSquarePlus,
  Moon,
  Phone,
  PhoneCall,
  Pill,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Trash2,
  Users,
  Utensils,
  Volume2,
  Wind,
  X,
} from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import {
  copyToClipboard,
  speakTextDetailed,
} from '../utils/speech';
import {
  createCustomMessageItem,
  getCustomMessages,
  getOfflinePredefinedMessages,
  LANGUAGE_OPTIONS,
  QUICK_CATEGORIES,
  QuickMessageCategoryId,
  QuickMessageItem,
  saveCustomMessages,
  SupportedLanguage,
  syncPredefinedMessagesOffline,
} from '../utils/quickMessages';

interface QuickMessagesBoardProps {
  initialCategory?: QuickMessageCategoryId;
  compactHeader?: boolean;
}

function renderMessageIcon(iconKey: string) {
  const props = { className: 'h-6 w-6 shrink-0 text-[#292544]', 'aria-hidden': true as const };
  switch (iconKey) {
    case 'droplets':
      return <Droplets {...props} />;
    case 'utensils':
      return <Utensils {...props} />;
    case 'door':
      return <DoorOpen {...props} />;
    case 'frown':
      return <Frown {...props} />;
    case 'moon':
      return <Moon {...props} />;
    case 'phone':
      return <Phone {...props} />;
    case 'users':
      return <Users {...props} />;
    case 'shield-user':
      return <ShieldCheck {...props} />;
    case 'home':
      return <Home {...props} />;
    case 'smartphone':
      return <Smartphone {...props} />;
    case 'heart-pulse':
      return <HeartPulse {...props} />;
    case 'activity':
      return <Activity {...props} />;
    case 'wind':
      return <Wind {...props} />;
    case 'pill':
      return <Pill {...props} />;
    case 'stethoscope':
      return <Stethoscope {...props} />;
    case 'alert':
      return <AlertCircle {...props} />;
    case 'siren':
      return <AlertTriangle {...props} />;
    case 'hand-helping':
      return <HandHelping {...props} />;
    case 'shield-alert':
      return <ShieldAlert {...props} />;
    case 'phone-call':
      return <PhoneCall {...props} />;
    default:
      return <MessageSquarePlus {...props} />;
  }
}

export function QuickMessagesBoard({
  initialCategory = 'basic-needs',
  compactHeader = false,
}: QuickMessagesBoardProps) {
  const [predefinedMessages, setPredefinedMessages] = useState<QuickMessageItem[]>(() =>
    getOfflinePredefinedMessages()
  );
  const [customMessages, setCustomMessages] = useState<QuickMessageItem[]>(() =>
    getCustomMessages()
  );
  const [activeCategory, setActiveCategory] = useState<QuickMessageCategoryId>(initialCategory);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [selectedMessage, setSelectedMessage] = useState<QuickMessageItem>(
    () => getOfflinePredefinedMessages()[0]
  );

  const [speaking, setSpeaking] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);

  // Personal Custom Message form states
  const [newCustomText, setNewCustomText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [customFeedback, setCustomFeedback] = useState<string | null>(null);

  useEffect(() => {
    setActiveCategory(initialCategory);
    const matching =
      initialCategory === 'custom'
        ? customMessages[0]
        : predefinedMessages.find((item) => item.category === initialCategory);
    if (matching) {
      setSelectedMessage(matching);
    }
  }, [initialCategory]);

  useEffect(() => {
    setPredefinedMessages(syncPredefinedMessagesOffline());
  }, []);

  useEffect(() => {
    if (!fullScreenOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFullScreenOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullScreenOpen]);

  const activeCategoryMessages = useMemo(() => {
    if (activeCategory === 'custom') {
      return customMessages;
    }
    return predefinedMessages.filter((item) => item.category === activeCategory);
  }, [activeCategory, customMessages, predefinedMessages]);

  const activeLanguageMeta = useMemo(
    () => LANGUAGE_OPTIONS.find((l) => l.code === selectedLanguage) || LANGUAGE_OPTIONS[0],
    [selectedLanguage]
  );

  const activeDisplayText = selectedMessage
    ? selectedMessage.translations[selectedLanguage] || selectedMessage.translations.en
    : '';

  const playMessageVoice = (text: string, langCode: SupportedLanguage = selectedLanguage) => {
    const langMeta = LANGUAGE_OPTIONS.find((l) => l.code === langCode) || LANGUAGE_OPTIONS[0];
    setSpeechNotice(null);
    const res = speakTextDetailed(text, {
      rate: 0.92,
      lang: langMeta.bcp47,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: (msg) => {
        setSpeaking(false);
        setSpeechNotice(msg);
      },
    });
    if (res.error) {
      setSpeechNotice(res.error);
    }
  };

  const handleSelectMessage = (item: QuickMessageItem) => {
    setSelectedMessage(item);
    setCopied(false);
    setSpeechNotice(null);
  };

  const handleCopy = async () => {
    if (!activeDisplayText) return;
    const ok = await copyToClipboard(activeDisplayText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleAddCustomMessage = (event: FormEvent) => {
    event.preventDefault();
    const cleaned = newCustomText.trim();
    if (!cleaned) return;
    const newItem = createCustomMessageItem(cleaned);
    const next = [newItem, ...customMessages];
    setCustomMessages(next);
    saveCustomMessages(next);
    setNewCustomText('');
    setSelectedMessage(newItem);
    setCustomFeedback(`Saved "${cleaned}" locally for offline use.`);
    setTimeout(() => setCustomFeedback(null), 2500);
  };

  const handleStartEdit = (item: QuickMessageItem) => {
    setEditingId(item.id);
    setEditingText(item.translations.en);
  };

  const handleSaveEdit = (id: string) => {
    const cleaned = editingText.trim();
    if (!cleaned) return;
    const next = customMessages.map((item) =>
      item.id === id
        ? {
            ...item,
            translations: { en: cleaned, hi: cleaned, pa: cleaned },
          }
        : item
    );
    setCustomMessages(next);
    saveCustomMessages(next);
    if (selectedMessage?.id === id) {
      const updated = next.find((i) => i.id === id);
      if (updated) setSelectedMessage(updated);
    }
    setEditingId(null);
    setEditingText('');
    setCustomFeedback('Custom message updated.');
    setTimeout(() => setCustomFeedback(null), 2500);
  };

  const handleDeleteCustom = (id: string) => {
    const next = customMessages.filter((item) => item.id !== id);
    setCustomMessages(next);
    saveCustomMessages(next);
    if (selectedMessage?.id === id) {
      setSelectedMessage(next[0] || predefinedMessages[0]);
    }
    setCustomFeedback('Custom message removed.');
    setTimeout(() => setCustomFeedback(null), 2500);
  };

  const currentCategoryMeta = QUICK_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <section id="quick-messages" aria-labelledby="quick-messages-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#6D28D9]">
            Offline-Ready Communication Board · Predefined &amp; Custom Phrases
          </p>
          <h2
            id="quick-messages-heading"
            className={`mt-1 font-extrabold tracking-tight text-[#292544] ${
              compactHeader ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
            }`}
          >
            Quick Messages
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[#292544]/75">
            Tap any message to display it in large, readable text, play audible voice output, copy
            it, or open Full-Screen Mode so another person can read it effortlessly.
          </p>
        </div>

        {/* Language Selector */}
        <div
          className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#EDE9FE] bg-white p-1.5 shadow-2xs"
          role="group"
          aria-label="Select voice and display language"
        >
          <span className="inline-flex items-center gap-1.5 px-2.5 text-xs font-extrabold text-[#292544]/70">
            <Globe className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />
            <span>Language:</span>
          </span>
          {LANGUAGE_OPTIONS.map((lang) => {
            const isSelected = selectedLanguage === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedLanguage(lang.code)}
                aria-pressed={isSelected}
                className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#292544] text-white'
                    : 'text-[#292544]/80 hover:bg-[#EDE9FE]/60'
                }`}
              >
                {lang.label}
                {lang.code !== 'en' ? ` (${lang.nativeLabel})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Quick message categories">
        {QUICK_CATEGORIES.map((category) => {
          const isSelected = activeCategory === category.id;
          const count =
            category.id === 'custom'
              ? customMessages.length
              : predefinedMessages.filter((m) => m.category === category.id).length;

          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveCategory(category.id)}
              className={`inline-flex min-h-[46px] items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'border-[#7C3AED] bg-[#A78BFA] text-white shadow-sm'
                  : 'border-[#EDE9FE] bg-white text-[#292544] hover:border-[#A78BFA] hover:bg-[#EDE9FE]/40'
              }`}
            >
              <span>{category.label}</span>
              <span
                className={`rounded-lg px-2 py-0.5 font-mono text-xs tabular-nums ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-[#EDE9FE] text-[#292544]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left/Main Grid of Large Accessible Buttons */}
        <div className="space-y-5 lg:col-span-7">
          {currentCategoryMeta && (
            <p className="text-sm font-bold text-[#292544]/75">{currentCategoryMeta.description}</p>
          )}

          {/* Custom Message Creation Bar when on Custom tab */}
          {activeCategory === 'custom' && (
            <Card tone="lavender" padding="p-5">
              <form onSubmit={handleAddCustomMessage} className="space-y-3">
                <label
                  htmlFor="custom-message-input"
                  className="block text-sm font-extrabold text-[#292544]"
                >
                  Add a Personal Custom Message (Saved Locally for Offline Use)
                </label>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    id="custom-message-input"
                    type="text"
                    value={newCustomText}
                    onChange={(e) => setNewCustomText(e.target.value)}
                    placeholder="e.g., Please wait for me. / I want to speak to my brother."
                    maxLength={180}
                    className="min-h-[48px] flex-1 rounded-2xl border border-[#C4B5FD] bg-white px-4 py-2.5 text-base font-semibold text-[#292544] placeholder:text-[#292544]/45 focus:border-[#7C3AED] focus:outline-none"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={!newCustomText.trim()}
                  >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                    <span>Save Message</span>
                  </Button>
                </div>
                {customFeedback && (
                  <p className="text-xs font-bold text-[#047857]" role="status">
                    {customFeedback}
                  </p>
                )}
              </form>
            </Card>
          )}

          {activeCategoryMessages.length === 0 ? (
            <Card tone="default" className="text-center">
              <p className="text-base font-extrabold text-[#292544]">No custom messages saved yet</p>
              <p className="mt-1 text-sm text-[#292544]/70">
                Add your frequently used phrases above so they stay available anytime, even offline.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {activeCategoryMessages.map((item) => {
                const isSelected = selectedMessage?.id === item.id;
                const displayLabel = item.translations[selectedLanguage] || item.translations.en;

                if (item.isCustom && editingId === item.id) {
                  return (
                    <div
                      key={item.id}
                      className="sm:col-span-2 rounded-3xl border-2 border-[#7C3AED] bg-white p-4 shadow-sm"
                    >
                      <label htmlFor={`edit-${item.id}`} className="sr-only">
                        Edit custom message
                      </label>
                      <div className="flex flex-col gap-2.5 sm:flex-row">
                        <input
                          id={`edit-${item.id}`}
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          maxLength={180}
                          className="min-h-[44px] flex-1 rounded-xl border border-[#DDD6FE] bg-[#FFFCF8] px-3.5 py-2 text-sm font-bold text-[#292544]"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={!editingText.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingId(null);
                              setEditingText('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={item.id} className="relative flex flex-col">
                    <button
                      type="button"
                      onClick={() => handleSelectMessage(item)}
                      aria-pressed={isSelected}
                      className={`flex min-h-[78px] w-full items-center justify-between gap-3 rounded-3xl border-2 px-5 py-4 text-left transition-all cursor-pointer ${
                        item.toneClass
                      } ${isSelected ? 'ring-3 ring-[#7C3AED]/45 shadow-md' : 'shadow-2xs'}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow-2xs">
                          {renderMessageIcon(item.iconKey)}
                        </div>
                        <div>
                          <span className="block text-base font-extrabold leading-snug text-[#292544] sm:text-lg">
                            {displayLabel}
                          </span>
                          {selectedLanguage !== 'en' && !item.isCustom && (
                            <span className="mt-0.5 block text-xs font-semibold text-[#292544]/65">
                              {item.translations.en}
                            </span>
                          )}
                        </div>
                      </div>
                      <Volume2 className="h-5 w-5 shrink-0 text-[#292544]/65" aria-hidden="true" />
                    </button>

                    {item.isCustom && (
                      <div className="mt-1.5 flex items-center justify-end gap-1.5 px-2">
                        <button
                          type="button"
                          onClick={() => playMessageVoice(displayLabel)}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-xl bg-[#A7F3D0]/70 px-2.5 py-1 text-xs font-bold text-[#292544] hover:bg-[#A7F3D0] cursor-pointer"
                          aria-label={`Play voice for ${displayLabel}`}
                        >
                          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Play</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-xl bg-white border border-[#EDE9FE] px-2.5 py-1 text-xs font-bold text-[#292544] hover:bg-[#EDE9FE] cursor-pointer"
                          aria-label={`Edit ${displayLabel}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustom(item.id)}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-xl bg-[#FCA5A5]/45 px-2.5 py-1 text-xs font-bold text-[#991B1B] hover:bg-[#FCA5A5]/75 cursor-pointer"
                          aria-label={`Delete ${displayLabel}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Spotlight Panel: Large Readable Message + Voice + Copy + Full-Screen */}
        <div className="lg:col-span-5">
          <Card tone="default" className="sticky top-24 space-y-5 border-2 border-[#DDD6FE]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDE9FE] pb-3.5">
              <div>
                <p className="text-xs font-bold text-[#6D28D9]">
                  Selected Message · {activeLanguageMeta.label}
                </p>
                <h3 className="text-base font-extrabold text-[#292544]">Large Display Reader</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFullScreenOpen(true)}
                aria-label="Open message in full-screen mode"
              >
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
                <span>Full Screen</span>
              </Button>
            </div>

            <div className="min-h-[168px] rounded-3xl border border-[#EDE9FE] bg-gradient-to-br from-[#EDE9FE]/45 via-[#FFFCF8] to-[#BFDBFE]/30 p-6">
              <p className="text-3xl font-extrabold leading-tight tracking-tight text-[#292544] sm:text-4xl">
                {activeDisplayText}
              </p>
              {selectedLanguage !== 'en' && !selectedMessage?.isCustom && (
                <p className="mt-3 text-sm font-bold text-[#292544]/70">
                  English: {selectedMessage?.translations.en}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="primary"
                size="lg"
                onClick={() => playMessageVoice(activeDisplayText)}
                className="flex-1"
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                <span>{speaking ? 'Speaking...' : 'Play Voice'}</span>
              </Button>

              <Button variant="blue" size="lg" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Copy className="h-5 w-5" aria-hidden="true" />
                )}
                <span>{copied ? 'Copied' : 'Copy Message'}</span>
              </Button>
            </div>

            {speechNotice && (
              <div
                role="status"
                className="rounded-2xl border border-[#FDBA74] bg-[#FED7AA]/50 px-4 py-3 text-xs font-bold text-[#292544]"
              >
                {speechNotice}
              </div>
            )}

            {/* Honest Contact & Healthcare Safety Notices */}
            {selectedMessage?.requiresExternalContactNotice && (
              <div className="rounded-2xl border border-[#F87171]/60 bg-[#FCA5A5]/25 px-4 py-3.5 text-xs leading-relaxed text-[#292544]">
                <p className="flex items-center gap-1.5 font-extrabold text-[#991B1B]">
                  <PhoneCall className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Important Calling Notice</span>
                </p>
                <p className="mt-1 font-semibold">
                  SignSpeak displays and speaks this message on your screen, but it{' '}
                  <strong>does not</strong> automatically call your family, guardian, doctor, or
                  emergency services. Please use your phone or another available contact method.
                </p>
              </div>
            )}

            {selectedMessage?.isHealthcare && (
              <div className="rounded-2xl border border-[#93C5FD] bg-[#BFDBFE]/35 px-4 py-3 text-xs leading-relaxed text-[#292544]">
                <p className="flex items-center gap-1.5 font-extrabold text-[#1E3A8A]">
                  <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Healthcare Communication Aid</span>
                </p>
                <p className="mt-1 font-semibold">
                  Messages describe your stated symptoms or requests for clarity. SignSpeak never
                  provides medical diagnoses or replaces clinical care.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Full-Screen High-Legibility Reader Modal */}
      {fullScreenOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full screen message display"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-[#292544] p-6 text-white sm:p-10"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-[#EDE9FE]">
              SignSpeak Full-Screen Reader · {activeLanguageMeta.label}
            </span>
            <button
              type="button"
              onClick={() => setFullScreenOpen(false)}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-white/15 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-white/25 cursor-pointer"
              aria-label="Exit full-screen mode"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span>Close (Esc)</span>
            </button>
          </div>

          <div className="mx-auto flex max-w-4xl flex-col items-center justify-center text-center">
            <p className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              {activeDisplayText}
            </p>
            {selectedLanguage !== 'en' && !selectedMessage?.isCustom && (
              <p className="mt-6 text-xl font-bold text-[#EDE9FE] sm:text-2xl">
                {selectedMessage?.translations.en}
              </p>
            )}
            {selectedMessage?.requiresExternalContactNotice && (
              <p className="mt-6 max-w-xl rounded-2xl border border-[#FED7AA]/40 bg-white/10 px-4 py-3 text-sm font-semibold text-[#FED7AA]">
                Reminder: Showing this screen does not dial a phone or emergency number automatically.
                Please place a call with your phone or ask a nearby person for help.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => playMessageVoice(activeDisplayText)}
              className="inline-flex min-h-[56px] items-center gap-3 rounded-2xl bg-[#A7F3D0] px-8 py-4 text-lg font-extrabold text-[#292544] transition-colors hover:bg-[#6EE7B7] cursor-pointer"
            >
              <Volume2 className="h-6 w-6" aria-hidden="true" />
              <span>{speaking ? 'Speaking...' : 'Play Voice'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-[56px] items-center gap-3 rounded-2xl bg-white/15 px-7 py-4 text-lg font-extrabold text-white transition-colors hover:bg-white/25 cursor-pointer"
            >
              {copied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
