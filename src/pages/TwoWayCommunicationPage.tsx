import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  MessageCircle,
  Mic,
  MicOff,
  Send,
  Trash2,
  User,
  Volume2,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import {
  getCustomMessages,
  getOfflinePredefinedMessages,
  PICTURE_BOARD_CARDS,
} from '../utils/quickMessages';
import {
  BrowserSpeechRecognition,
  createSpeechRecognizer,
  getSpeechRecognitionErrorMessage,
  isSpeechRecognitionSupported,
  speakTextDetailed,
} from '../utils/speech';

interface ConversationEntry {
  id: string;
  sender: 'side-a' | 'side-b';
  text: string;
  timestamp: string;
  inputMethod: 'board' | 'typed' | 'voice';
}

export function TwoWayCommunicationPage() {
  // Side A state (non-speaking user)
  const [sideAMessage, setSideAMessage] = useState('I need water.');
  const [sideATTSNotice, setSideATTSNotice] = useState<string | null>(null);
  const [sideASpeaking, setSideASpeaking] = useState(false);

  // Side B state (speaking / hearing partner)
  const [sideBText, setSideBText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [micSupported] = useState(() => isSpeechRecognitionSupported());
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [sideBTTSNotice, setSideBTTSNotice] = useState<string | null>(null);
  const recognizerRef = useRef<BrowserSpeechRecognition | null>(null);

  // Shared temporary session conversation (never stored permanently by default)
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);

  const predefinedQuickPicks = useRef(getOfflinePredefinedMessages().slice(0, 8)).current;
  const [customMessages] = useState(() => getCustomMessages());

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        try {
          recognizerRef.current.abort();
        } catch {
          // Ignore cleanup abort errors
        }
        recognizerRef.current = null;
      }
    };
  }, []);

  const appendMessage = (
    sender: 'side-a' | 'side-b',
    text: string,
    inputMethod: ConversationEntry['inputMethod']
  ) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setConversation((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        text: cleaned,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        inputMethod,
      },
    ]);
  };

  const handleSideASpeakAndSend = (method: 'board' | 'typed' = 'typed') => {
    const cleaned = sideAMessage.trim();
    if (!cleaned) return;

    setSideATTSNotice(null);
    appendMessage('side-a', cleaned, method);

    const result = speakTextDetailed(cleaned, {
      rate: 0.94,
      onStart: () => setSideASpeaking(true),
      onEnd: () => setSideASpeaking(false),
      onError: (msg) => {
        setSideASpeaking(false);
        setSideATTSNotice(msg);
      },
    });

    if (!result.started && result.error) {
      setSideATTSNotice(result.error);
    }
  };

  const handleSideASelectChip = (text: string) => {
    setSideAMessage(text);
    setSideATTSNotice(null);
  };

  const handleToggleMicrophone = () => {
    setMicNotice(null);

    if (isListening && recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      setIsListening(false);
      return;
    }

    const recognizer = createSpeechRecognizer('en-US');
    if (!recognizer) {
      setMicNotice(
        'Voice input (Web Speech API) is not supported in this browser. Please type your reply in the text box below.'
      );
      return;
    }

    recognizerRef.current = recognizer;
    let producedTranscript = false;

    recognizer.onstart = () => {
      setIsListening(true);
      setMicNotice('Listening... Speak clearly into your microphone.');
    };

    recognizer.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i += 1) {
        combined += event.results[i][0]?.transcript || '';
      }
      const cleaned = combined.trim();
      if (cleaned) {
        producedTranscript = true;
        setSideBText(cleaned);
      }
    };

    recognizer.onerror = (event) => {
      setIsListening(false);
      setMicNotice(getSpeechRecognitionErrorMessage(event.error));
    };

    recognizer.onend = () => {
      setIsListening(false);
      if (!producedTranscript) {
        setMicNotice((prev) =>
          prev && prev.startsWith('Listening')
            ? 'No speech was captured. Please try again or type your response below.'
            : prev
        );
      } else {
        setMicNotice('Speech converted to text. Review or click Send Response.');
      }
    };

    try {
      recognizer.start();
    } catch {
      setIsListening(false);
      setMicNotice(
        'Could not start microphone recognition. Please type your response in the box below.'
      );
    }
  };

  const handleSideBSend = (event?: FormEvent) => {
    if (event) event.preventDefault();
    const cleaned = sideBText.trim();
    if (!cleaned) return;
    appendMessage('side-b', cleaned, isListening ? 'voice' : 'typed');
    setSideBText('');
    setMicNotice(null);
  };

  const handleSideBPlayVoice = () => {
    const cleaned = sideBText.trim();
    if (!cleaned) return;
    setSideBTTSNotice(null);
    const res = speakTextDetailed(cleaned, {
      onError: (msg) => setSideBTTSNotice(msg),
    });
    if (!res.started && res.error) {
      setSideBTTSNotice(res.error);
    }
  };

  const handleClearConversation = () => {
    setConversation([]);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#6D28D9]">
            Live Bridge · No Login Required · Session-Only Privacy
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#292544]">
            Two-Way Communication
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#292544]/75">
            Side-by-side conversation space so a person who cannot speak and a speaking partner can
            communicate naturally using touch cards, text, voice playback, and optional microphone
            input. Conversations are kept in memory only and cleared when you leave or press Clear.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={handleClearConversation}
          disabled={conversation.length === 0}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span>Clear Conversation History</span>
        </Button>
      </div>

      {/* Split Two-Way Interface */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* SIDE A: User who cannot speak */}
        <Card tone="lavender" className="space-y-5 border-2 border-[#C4B5FD]">
          <div className="flex items-center justify-between border-b border-[#DDD6FE] pb-3">
            <div>
              <p className="text-xs font-extrabold text-[#6D28D9]">SIDE A</p>
              <h2 className="text-xl font-extrabold text-[#292544]">
                User Who Cannot Speak
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#6D28D9]">
              <User className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          {/* Large Readable Message Preview */}
          <div className="rounded-2xl border border-[#DDD6FE] bg-white p-5">
            <p className="text-xs font-bold text-[#292544]/65">Selected / Ready to Speak</p>
            <p className="mt-1.5 min-h-[56px] text-2xl font-extrabold leading-snug text-[#292544] sm:text-3xl">
              {sideAMessage.trim() || 'Select a picture card, quick phrase, or type below.'}
            </p>
          </div>

          {/* Picture-Based Communication Board */}
          <div>
            <p className="text-xs font-extrabold text-[#292544]/80">
              Picture Communication Board (Tap to select)
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {PICTURE_BOARD_CARDS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleSideASelectChip(card.message)}
                  className={`flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-2xl border border-[#DDD6FE] px-2 py-2 text-center transition-transform active:scale-95 cursor-pointer ${card.tone} ${
                    sideAMessage === card.message ? 'ring-2 ring-[#7C3AED]' : ''
                  }`}
                >
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {card.emoji}
                  </span>
                  <span className="text-xs font-extrabold text-[#292544]">{card.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Predefined & Custom Phrases */}
          <div>
            <p className="text-xs font-extrabold text-[#292544]/80">
              Quick Predefined &amp; Custom Phrases
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {predefinedQuickPicks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSideASelectChip(item.translations.en)}
                  className="min-h-[38px] rounded-xl border border-[#DDD6FE] bg-white px-3 py-1.5 text-xs font-bold text-[#292544] hover:bg-[#EDE9FE] cursor-pointer"
                >
                  {item.translations.en}
                </button>
              ))}
              {customMessages.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSideASelectChip(item.translations.en)}
                  className="min-h-[38px] rounded-xl border border-[#A7F3D0] bg-[#A7F3D0]/55 px-3 py-1.5 text-xs font-bold text-[#292544] hover:bg-[#A7F3D0] cursor-pointer"
                >
                  {item.translations.en}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message Input + Speak Button */}
          <div className="space-y-3 border-t border-[#DDD6FE] pt-4">
            <label htmlFor="side-a-input" className="block text-xs font-extrabold text-[#292544]">
              Or Type Your Own Message
            </label>
            <textarea
              id="side-a-input"
              rows={2}
              value={sideAMessage}
              onChange={(e) => setSideAMessage(e.target.value)}
              placeholder="Type what you want to say..."
              className="w-full rounded-2xl border border-[#C4B5FD] bg-white px-4 py-3 text-base font-semibold text-[#292544] placeholder:text-[#292544]/40 focus:border-[#7C3AED] focus:outline-none"
            />
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleSideASpeakAndSend('board')}
                disabled={!sideAMessage.trim()}
                className="flex-1"
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                <span>{sideASpeaking ? 'Speaking...' : 'Speak Message'}</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  appendMessage('side-a', sideAMessage, 'typed');
                }}
                disabled={!sideAMessage.trim()}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>Send Silently</span>
              </Button>
            </div>
            {sideATTSNotice && (
              <p className="rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-[#9A3412]">
                {sideATTSNotice}
              </p>
            )}
          </div>
        </Card>

        {/* SIDE B: Other Person (Speaking / Hearing Partner) */}
        <Card tone="blue" className="flex flex-col justify-between space-y-5 border-2 border-[#93C5FD]">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#93C5FD]/60 pb-3">
              <div>
                <p className="text-xs font-extrabold text-[#1E40AF]">SIDE B</p>
                <h2 className="text-xl font-extrabold text-[#292544]">
                  Other Person (Response)
                </h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#1E40AF]">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <form onSubmit={handleSideBSend} className="space-y-3">
              <label htmlFor="side-b-input" className="block text-sm font-extrabold text-[#292544]">
                Type a Reply or Use Microphone Voice-to-Text
              </label>
              <textarea
                id="side-b-input"
                rows={4}
                value={sideBText}
                onChange={(e) => setSideBText(e.target.value)}
                placeholder="Type your response here, or tap the Microphone button to speak..."
                className="w-full rounded-2xl border border-[#93C5FD] bg-white px-4 py-3 text-lg font-semibold text-[#292544] placeholder:text-[#292544]/40 focus:border-[#2563EB] focus:outline-none"
              />

              <div className="flex flex-wrap gap-2.5">
                <Button
                  type="button"
                  variant={isListening ? 'danger' : 'mint'}
                  size="lg"
                  onClick={handleToggleMicrophone}
                  aria-pressed={isListening}
                >
                  {isListening ? (
                    <MicOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Mic className="h-5 w-5" aria-hidden="true" />
                  )}
                  <span>{isListening ? 'Stop Listening' : 'Speak (Microphone)'}</span>
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!sideBText.trim()}
                  className="flex-1"
                >
                  <Send className="h-5 w-5" aria-hidden="true" />
                  <span>Send Response</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleSideBPlayVoice}
                  disabled={!sideBText.trim()}
                  aria-label="Read typed response aloud"
                >
                  <Volume2 className="h-5 w-5" aria-hidden="true" />
                  <span>Play Voice</span>
                </Button>
              </div>
            </form>

            {!micSupported && (
              <div className="rounded-2xl border border-[#FDBA74] bg-[#FED7AA]/65 px-4 py-3 text-xs font-bold text-[#292544]">
                <p className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#9A3412]" aria-hidden="true" />
                  <span>
                    Speech recognition is not supported in this browser. Please type your reply in
                    the text box above.
                  </span>
                </p>
              </div>
            )}

            {micNotice && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-2xl border border-[#93C5FD] bg-white px-4 py-3 text-xs font-bold text-[#292544]"
              >
                {micNotice}
              </div>
            )}

            {sideBTTSNotice && (
              <div className="rounded-2xl border border-[#FDBA74] bg-white px-4 py-3 text-xs font-bold text-[#9A3412]">
                {sideBTTSNotice}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/80 p-4 text-xs leading-relaxed text-[#292544]/80">
            <p className="font-extrabold text-[#292544]">Latest Response Preview</p>
            <p className="mt-1.5 text-lg font-extrabold text-[#292544]">
              {conversation.filter((m) => m.sender === 'side-b').slice(-1)[0]?.text ||
                sideBText.trim() ||
                'Responses from Side B appear here in large text for easy reading.'}
            </p>
          </div>
        </Card>
      </div>

      {/* Shared Readable Conversation History */}
      <Card tone="default" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDE9FE] pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#292544]">
              Shared Conversation History
            </h2>
            <p className="text-xs text-[#292544]/70">
              Temporary session view · Never saved permanently unless you copy it
            </p>
          </div>
          <span className="font-mono text-xs font-bold tabular-nums text-[#6D28D9]">
            {conversation.length} message{conversation.length === 1 ? '' : 's'}
          </span>
        </div>

        {conversation.length === 0 ? (
          <div className="rounded-2xl bg-[#EDE9FE]/35 p-8 text-center">
            <p className="text-base font-extrabold text-[#292544]">No messages exchanged yet</p>
            <p className="mt-1 text-sm text-[#292544]/75">
              Side A can tap a picture or phrase and press &ldquo;Speak Message&rdquo;, and Side B
              can reply by typing or tapping the microphone button.
            </p>
          </div>
        ) : (
          <div className="space-y-4" aria-live="polite">
            {conversation.map((entry) => {
              const isSideA = entry.sender === 'side-a';
              return (
                <div
                  key={entry.id}
                  className={`flex flex-col ${isSideA ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-xl rounded-3xl border px-5 py-4 shadow-2xs ${
                      isSideA
                        ? 'border-[#C4B5FD] bg-[#EDE9FE]/70 text-[#292544]'
                        : 'border-[#93C5FD] bg-[#BFDBFE]/65 text-[#292544]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-xs font-extrabold text-[#292544]/75">
                      <span>
                        {isSideA ? 'Side A · Non-speaking User' : 'Side B · Speaking Partner'}
                      </span>
                      <span className="font-mono tabular-nums">{entry.timestamp}</span>
                    </div>
                    <p className="mt-1.5 text-lg font-extrabold leading-snug text-[#292544] sm:text-xl">
                      {entry.text}
                    </p>
                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => speakTextDetailed(entry.text)}
                        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-white/85 px-3 py-1 text-xs font-bold text-[#292544] hover:bg-white cursor-pointer"
                        aria-label={`Play voice for ${entry.text}`}
                      >
                        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Play Voice</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
