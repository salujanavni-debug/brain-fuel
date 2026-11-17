import { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ShieldAlert,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { HandIllustration } from '../components/HandIllustration';
import { useAccessibility } from '../context/AccessibilityContext';
import { requestTextToSign } from '../services/translationService';
import { matchTextToSigns, SIGN_VOCABULARY, SignEntry, TokenMatch } from '../utils/signVocabulary';
import { speakTextDetailed, stopSpeech } from '../utils/speech';

const QUICK_PHRASES = ['Hello', 'Thank you please', 'I need help', 'Water please', 'I love you'];

const DEFAULT_GRAMMAR_NOTICE =
  'Demonstrates matching individual signs from our verified starter library in English token order — NOT a grammatically complete Indian Sign Language (ISL) sentence translation.';

interface TranslationPreview {
  input: string;
  matched: SignEntry[];
  unsupported: string[];
  tokens: TokenMatch[];
  grammarNotice: string;
  sourceLabel: string;
}

export function TextToSignPage() {
  const { reducedMotion } = useAccessibility();
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<TranslationPreview | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingSequence, setPlayingSequence] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTranslate = async (event: FormEvent | null, overrideText?: string) => {
    if (event) event.preventDefault();
    const target = (overrideText ?? inputText).trim();
    if (!target) return;

    setPlayingSequence(false);
    setActiveIndex(0);
    setLoading(true);

    try {
      const apiRes = await requestTextToSign(target);
      const matched: SignEntry[] = apiRes.demonstration_sequence.map((item) => {
        const localMatch = SIGN_VOCABULARY.find((v) => v.id === item.id);
        return {
          id: item.id,
          word: item.label,
          aliases: item.aliases || [],
          category: (localMatch?.category ?? 'Greetings') as SignEntry['category'],
          difficulty: (localMatch?.difficulty ?? 'Beginner') as SignEntry['difficulty'],
          illustration: item.demonstration_assets?.[0]?.identifier || item.id,
          handshape: item.handshape,
          movement: item.movement,
          tip: item.tip,
        };
      });

      const tokens: TokenMatch[] = apiRes.tokens.map((tok) => {
        if (!tok.supported || !tok.gesture) {
          return { token: tok.token, supported: false, sign: null };
        }
        const localMatch = SIGN_VOCABULARY.find((v) => v.id === tok.gesture!.id);
        return {
          token: tok.token,
          supported: true,
          sign: {
            id: tok.gesture.id,
            word: tok.gesture.label,
            aliases: tok.gesture.aliases || [],
            category: (localMatch?.category ?? 'Greetings') as SignEntry['category'],
            difficulty: (localMatch?.difficulty ?? 'Beginner') as SignEntry['difficulty'],
            illustration:
              tok.gesture.demonstration_assets?.[0]?.identifier || tok.gesture.id,
            handshape: tok.gesture.handshape,
            movement: tok.gesture.movement,
            tip: tok.gesture.tip,
          },
        };
      });

      setResult({
        input: apiRes.input_text,
        matched,
        unsupported: apiRes.unsupported_tokens,
        tokens,
        grammarNotice: apiRes.grammar_notice || DEFAULT_GRAMMAR_NOTICE,
        sourceLabel: 'Matched via POST /api/translation/text-to-sign verified demonstration library.',
      });
    } catch {
      const matchedResult = matchTextToSigns(target);
      setResult({
        input: target,
        ...matchedResult,
        grammarNotice: DEFAULT_GRAMMAR_NOTICE,
        sourceLabel: 'Offline fallback: matched using local verified demonstration library.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!playingSequence || !result?.matched?.length) return;
    const stepMs = reducedMotion ? 2200 : 1700;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= result.matched.length - 1) {
          setPlayingSequence(false);
          return prev;
        }
        return prev + 1;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [playingSequence, reducedMotion, result]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const handleClear = () => {
    setPlayingSequence(false);
    setInputText('');
    setResult(null);
    setActiveIndex(0);
    stopSpeech();
  };

  const activeSign = result?.matched?.[activeIndex] || null;

  // Map matched token indices to demonstration sequence index for highlighting
  let matchedCursor = -1;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold text-[#6D28D9]">Reverse Translation Guide</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#292544]">
          Text-to-Sign Explorer
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#292544]/75">
          Type a sentence to match supported words and phrases against verified sign
          demonstrations via <code className="font-mono font-semibold">POST /api/translation/text-to-sign</code>.
          Unsupported words are clearly marked and never invented.
        </p>
      </div>

      {/* Explicit Individual Sign Demonstration Notice */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-3xl border border-[#FDBA74] bg-[#FED7AA]/45 px-5 py-4 text-xs text-[#292544]"
      >
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9A3412]" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-extrabold">
            Individual Sign Demonstration Only — Not Complete ISL Sentence Grammar
          </p>
          <p className="font-semibold leading-relaxed text-[#292544]/85">
            {result?.grammarNotice || DEFAULT_GRAMMAR_NOTICE}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <Card tone="lavender">
            <form onSubmit={(e) => handleTranslate(e)} className="space-y-4">
              <label htmlFor="text-to-sign-input" className="block text-sm font-bold text-[#292544]">
                Enter sentence or phrase
              </label>
              <textarea
                id="text-to-sign-input"
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Try: Hello friend, thank you please"
                className="w-full rounded-2xl border border-[#DDD6FE] bg-white px-4 py-3 text-base text-[#292544] placeholder:text-[#292544]/40 focus:border-[#A78BFA] focus:outline-none"
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <Button type="submit" variant="primary" size="md" disabled={!inputText.trim() || loading}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span>{loading ? 'Matching...' : 'Show Sign Sequence'}</span>
                </Button>
                <Button
                  type="button"
                  variant="mint"
                  size="sm"
                  onClick={() => speakTextDetailed(inputText)}
                  disabled={!inputText.trim()}
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>Speak Input</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={!inputText && !result}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Clear</span>
                </Button>
              </div>
            </form>

            <div className="mt-5 border-t border-[#DDD6FE] pt-4">
              <p className="text-xs font-bold text-[#292544]/70">Quick Try Phrases</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => {
                      setInputText(phrase);
                      void handleTranslate(null, phrase);
                    }}
                    className="min-h-[38px] cursor-pointer rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#292544] shadow-2xs transition-colors hover:bg-[#BFDBFE]/45"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card tone="default">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#292544]">Verified Demonstration Library</h2>
              <span className="font-mono text-xs font-bold tabular-nums text-[#6D28D9]">
                {SIGN_VOCABULARY.length} signs
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#292544]/70">
              Only these verified signs are demonstrated — unsupported words are explicitly flagged:
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#292544]/85">
              {SIGN_VOCABULARY.map((item) => item.word).join(' · ')}
            </p>

            {result && (
              <div className="mt-4 space-y-2 border-t border-[#EDE9FE] pt-4 text-xs">
                <p className="font-bold text-[#292544]">
                  Matched {result.matched.length} sign{result.matched.length === 1 ? '' : 's'} across{' '}
                  {result.tokens.length} token{result.tokens.length === 1 ? '' : 's'}
                </p>
                {result.unsupported.length > 0 && (
                  <p className="flex items-start gap-1.5 font-bold text-[#9A3412]">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      Unsupported words (no sign invented): {result.unsupported.join(', ')}
                    </span>
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card tone="default" className="h-full">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDE9FE] pb-4">
              <h2 className="text-lg font-bold text-[#292544]">Sign Demonstration Sequence</h2>
              {result?.matched?.length ? (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant={playingSequence ? 'peach' : 'mint'}
                    size="sm"
                    onClick={() => {
                      if (!playingSequence && activeIndex >= result.matched.length - 1) {
                        setActiveIndex(0);
                      }
                      setPlayingSequence((prev) => !prev);
                    }}
                  >
                    {playingSequence ? (
                      <>
                        <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Pause Sequence</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Play Sequence</span>
                      </>
                    )}
                  </Button>
                  <span className="font-mono text-xs font-bold tabular-nums text-[#292544]/70">
                    Sign {activeIndex + 1} of {result.matched.length}
                  </span>
                </div>
              ) : null}
            </div>

            {!result ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center p-6 text-center">
                <div className="w-40">
                  <HandIllustration gesture="hello" className="h-32 w-full" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#292544]">
                  Enter a phrase to preview signs
                </h3>
                <p className="mt-1.5 max-w-md text-sm text-[#292544]/70">
                  Type a greeting or request on the left and click Show Sign Sequence to step through
                  each verified hand gesture in order.
                </p>
              </div>
            ) : result.matched.length === 0 ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FED7AA] text-[#9A3412]">
                  <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#292544]">
                  No Verified Vocabulary Match Found
                </h3>
                <p className="mt-2 max-w-md text-sm text-[#292544]/75">
                  Unsupported words: <strong>{result.unsupported.join(', ')}</strong>. SignSpeak
                  does not invent or synthesize unverified sign translations — try words from the
                  Verified Demonstration Library.
                </p>
              </div>
            ) : (
              activeSign && (
                <div className="space-y-6 pt-6">
                  <div className="grid items-center gap-6 sm:grid-cols-2">
                    <HandIllustration gesture={activeSign.illustration} className="h-56 w-full" />
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-[#6D28D9]">
                        {activeSign.category} · {activeSign.difficulty}
                      </p>
                      <h3 className="text-3xl font-extrabold text-[#292544]">{activeSign.word}</h3>
                      <div>
                        <p className="text-xs font-bold text-[#292544]/60">Handshape</p>
                        <p className="mt-0.5 text-sm font-semibold text-[#292544]">
                          {activeSign.handshape}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#292544]/60">Movement</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-[#292544]/80">
                          {activeSign.movement}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Full Ordered Token Breakdown (Supported + Unsupported in Exact Sequence) */}
                  <div className="space-y-3 border-t border-[#EDE9FE] pt-4">
                    <p className="text-xs font-bold text-[#292544]/70">
                      Ordered Input Sequence (click supported signs to inspect):
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {result.tokens.map((tok, idx) => {
                        if (tok.supported && tok.sign) {
                          matchedCursor += 1;
                          const targetIdx = matchedCursor;
                          const isCurrent = targetIdx === activeIndex;
                          return (
                            <button
                              key={`${tok.token}-${idx}`}
                              type="button"
                              onClick={() => {
                                setPlayingSequence(false);
                                setActiveIndex(targetIdx);
                              }}
                              className={`inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                                isCurrent
                                  ? 'bg-[#7C3AED] text-white'
                                  : 'bg-[#EDE9FE] text-[#292544] hover:bg-[#DDD6FE]'
                              }`}
                            >
                              <span>{tok.sign.word}</span>
                              {idx < result.tokens.length - 1 && (
                                <ArrowRight className="h-3 w-3 opacity-70" aria-hidden="true" />
                              )}
                            </button>
                          );
                        }
                        return (
                          <span
                            key={`${tok.token}-${idx}`}
                            title="Unsupported word — no verified sign demonstration"
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#FDBA74] bg-[#FED7AA]/55 px-3 py-1.5 text-xs font-bold text-[#9A3412]"
                          >
                            <span>{tok.token} (unsupported)</span>
                            {idx < result.tokens.length - 1 && (
                              <ArrowRight className="h-3 w-3 opacity-60" aria-hidden="true" />
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDE9FE] pt-4">
                    <p className="text-xs font-semibold text-[#292544]/65">{result.sourceLabel}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeIndex === 0}
                        onClick={() => {
                          setPlayingSequence(false);
                          setActiveIndex((prev) => Math.max(0, prev - 1));
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        <span>Prev</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={activeIndex >= result.matched.length - 1}
                        onClick={() => {
                          setPlayingSequence(false);
                          setActiveIndex((prev) => Math.min(result.matched.length - 1, prev + 1));
                        }}
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
