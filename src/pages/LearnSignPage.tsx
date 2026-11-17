import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Layers,
  RotateCcw,
  Search,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { HandIllustration } from '../components/HandIllustration';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  fetchLearningProgress,
  fetchPublicGestures,
  LearningProgressRecord,
  saveQuizResult,
  upsertLearningProgress,
} from '../services/supabaseDataService';
import {
  SIGN_CATEGORIES,
  SIGN_DIFFICULTIES,
  SIGN_VOCABULARY,
  SignEntry,
} from '../utils/signVocabulary';
import { speakText } from '../utils/speech';

interface QuizQuestion {
  id: string;
  gestureId: string;
  category: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    gestureId: 'hello',
    category: 'Greetings',
    prompt: 'Which greeting matches an open flat hand waving gently outward from the forehead?',
    options: ['Hello', 'Water', 'Pain', 'No'],
    answer: 'Hello',
    explanation: 'Hello uses an open flat palm near the forehead sweeping gently outward.',
  },
  {
    id: 'q2',
    gestureId: 'water',
    category: 'Daily Needs',
    prompt: 'Forming a W-shape with three fingers and tapping your chin twice represents:',
    options: ['Friend', 'Water', 'Thank You', 'Doctor'],
    answer: 'Water',
    explanation: "Water forms a 'W' with index, middle, and ring fingers tapped against the chin.",
  },
  {
    id: 'q3',
    gestureId: 'help',
    category: 'Health & Safety',
    prompt: 'A thumbs-up resting on an open palm and lifting upward together means:',
    options: ['Please', 'Yes', 'Help', 'Learn'],
    answer: 'Help',
    explanation: 'Help places a closed thumbs-up fist on the opposite palm and lifts both upward.',
  },
  {
    id: 'q4',
    gestureId: 'love',
    category: 'Feelings & People',
    prompt: 'Thumb, index, and little finger extended together stands for:',
    options: ['I Love You', 'No', 'Doctor', 'Friend'],
    answer: 'I Love You',
    explanation: 'The I-L-Y handshape combines letters I, L, and Y into one gesture.',
  },
  {
    id: 'q5',
    gestureId: 'thank-you',
    category: 'Greetings',
    prompt: 'Touching your chin softly and moving your flat hand forward toward the listener means:',
    options: ['Please', 'Thank You', 'Pain', 'Yes'],
    answer: 'Thank You',
    explanation: 'Thank You moves a flat hand gently forward from the chin.',
  },
  {
    id: 'q6',
    gestureId: 'yes',
    category: 'Daily Needs',
    prompt: 'Holding a relaxed fist at shoulder height and nodding it forward twice means:',
    options: ['No', 'Yes', 'Please', 'Water'],
    answer: 'Yes',
    explanation: 'Yes uses a nodding fist motion from the wrist, mirroring a head nod.',
  },
  {
    id: 'q7',
    gestureId: 'doctor',
    category: 'Health & Safety',
    prompt: 'Tapping the inner wrist of your opposite arm twice as if checking a pulse signs:',
    options: ['Pain', 'Help', 'Doctor', 'Friend'],
    answer: 'Doctor',
    explanation: 'Doctor mimics checking a wrist pulse with two gentle taps.',
  },
  {
    id: 'q8',
    gestureId: 'learn',
    category: 'Feelings & People',
    prompt: 'Gathering from an open palm upward toward your forehead represents:',
    options: ['Learn', 'Hello', 'Thank You', 'No'],
    answer: 'Learn',
    explanation: 'Learn visualizes lifting knowledge from a book or open palm into your mind.',
  },
];

export function LearnSignPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'library' | 'flashcards' | 'quiz'>('library');
  const [gestures, setGestures] = useState<SignEntry[]>(SIGN_VOCABULARY);
  const [catalogSource, setCatalogSource] = useState<'supabase' | 'local'>('local');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedGesture, setSelectedGesture] = useState<SignEntry | null>(null);

  const [progressMap, setProgressMap] = useState<Record<string, LearningProgressRecord>>({});

  // Flashcard State
  const [deckOrder, setDeckOrder] = useState<string[]>(() => SIGN_VOCABULARY.map((g) => g.id));
  const [flashIndex, setFlashIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz State
  const [quizCategory, setQuizCategory] = useState<string>('All');
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Array<{ question_id: string; selected_option: string; gestureId: string }>
  >([]);
  const [score, setScore] = useState(0);
  const [quizPercentage, setQuizPercentage] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPublicGestures().then(({ gestures: loaded, source }) => {
      if (!active) return;
      setGestures(loaded);
      setCatalogSource(source);
      setDeckOrder(loaded.map((g) => g.id));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchLearningProgress(user?.id).then((loaded) => {
      if (active) setProgressMap(loaded);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const filteredGestures = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return gestures.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesDifficulty =
        selectedDifficulty === 'All' || item.difficulty === selectedDifficulty;
      const matchesQuery =
        !query ||
        item.word.toLowerCase().includes(query) ||
        (item.meaning || '').toLowerCase().includes(query) ||
        item.handshape.toLowerCase().includes(query) ||
        item.movement.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      return matchesCategory && matchesDifficulty && matchesQuery;
    });
  }, [gestures, searchQuery, selectedCategory, selectedDifficulty]);

  const flashcardDeck = useMemo(() => {
    const allowedIds = new Set(filteredGestures.map((g) => g.id));
    const byId = new Map(filteredGestures.map((g) => [g.id, g]));
    const ordered = deckOrder
      .filter((id) => allowedIds.has(id))
      .map((id) => byId.get(id)!)
      .filter(Boolean);
    return ordered.length > 0 ? ordered : filteredGestures;
  }, [deckOrder, filteredGestures]);

  const activeFlashcard = flashcardDeck[Math.min(flashIndex, Math.max(0, flashcardDeck.length - 1))] || null;

  const quizQuestions = useMemo(() => {
    if (quizCategory === 'All') return QUIZ_QUESTIONS;
    const filtered = QUIZ_QUESTIONS.filter((q) => q.category === quizCategory);
    return filtered.length > 0 ? filtered : QUIZ_QUESTIONS;
  }, [quizCategory]);

  const currentQuestion = quizQuestions[quizIndex] || quizQuestions[0];

  const completedCount = useMemo(
    () => gestures.filter((g) => progressMap[g.id]?.completed).length,
    [gestures, progressMap]
  );
  const progressPct = gestures.length > 0 ? Math.round((completedCount / gestures.length) * 100) : 0;

  const handleToggleGestureLearned = useCallback(
    async (gestureId: string, nextCompleted?: boolean, nextScore?: number) => {
      const current = progressMap[gestureId];
      const completed = typeof nextCompleted === 'boolean' ? nextCompleted : !current?.completed;
      const computedScore =
        typeof nextScore === 'number' ? nextScore : completed ? Math.max(100, current?.score || 0) : 0;

      const updated = await upsertLearningProgress(
        user?.id,
        gestureId,
        completed,
        computedScore
      );
      setProgressMap(updated);
    },
    [progressMap, user?.id]
  );

  const handleShuffleDeck = () => {
    const copy = [...gestures.map((g) => g.id)];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setDeckOrder(copy);
    setFlashIndex(0);
    setIsFlipped(false);
  };

  const handleAnswerSelect = (option: string) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);
    const isCorrect = option === currentQuestion.answer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    setSubmittedAnswers((prev) => [
      ...prev,
      {
        question_id: currentQuestion.id,
        selected_option: option,
        gestureId: currentQuestion.gestureId,
      },
    ]);
  };

  const finalizeQuiz = async (finalAnswers: typeof submittedAnswers, localScore: number) => {
    setSavingQuiz(true);
    let calculatedScore = localScore;
    let calculatedPct = Math.round((localScore / quizQuestions.length) * 100);

    try {
      const res = await api.post('/api/learning/quiz/submit', {
        answers: finalAnswers.map(({ question_id, selected_option }) => ({
          question_id,
          selected_option,
        })),
      });
      if (typeof res.data?.correct_count === 'number') {
        calculatedScore = res.data.correct_count;
      }
      if (typeof res.data?.score_percentage === 'number') {
        calculatedPct = Math.round(res.data.score_percentage);
      }
    } catch {
      // Offline / deterministic local scoring fallback already computed
    }

    setScore(calculatedScore);
    setQuizPercentage(calculatedPct);
    setQuizFinished(true);

    // Update learning progress for answered gestures and persist quiz attempt
    for (const item of finalAnswers) {
      const q = QUIZ_QUESTIONS.find((entry) => entry.id === item.question_id);
      if (q && item.selected_option === q.answer) {
        const updated = await upsertLearningProgress(user?.id, q.gestureId, true, 100);
        setProgressMap(updated);
      }
    }

    await saveQuizResult(user?.id, calculatedScore, quizQuestions.length, quizCategory);
    setSavingQuiz(false);
  };

  const handleNextQuestion = () => {
    if (quizIndex + 1 >= quizQuestions.length) {
      void finalizeQuiz(submittedAnswers, score);
    } else {
      setQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
    }
  };

  const handleRestartQuiz = (nextCategory = quizCategory) => {
    setQuizCategory(nextCategory);
    setQuizIndex(0);
    setSelectedOption(null);
    setSubmittedAnswers([]);
    setScore(0);
    setQuizPercentage(null);
    setQuizFinished(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#6D28D9]">
            Public Visual Sign Guide · Verified Educational References
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#292544]">
            Learn Sign Language
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#292544]/75">
            Browse verified beginner and intermediate gestures without signing in, practice with
            interactive flashcards, and test yourself with multiple-choice quizzes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border border-[#EDE9FE] bg-white p-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setMode('library')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'library'
                ? 'bg-[#A78BFA] text-white'
                : 'text-[#292544]/75 hover:bg-[#EDE9FE]/50'
            }`}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Library</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFlashIndex(0);
              setIsFlipped(false);
              setMode('flashcards');
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'flashcards'
                ? 'bg-[#A78BFA] text-white'
                : 'text-[#292544]/75 hover:bg-[#EDE9FE]/50'
            }`}
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span>Flashcards</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('quiz')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'quiz'
                ? 'bg-[#A78BFA] text-white'
                : 'text-[#292544]/75 hover:bg-[#EDE9FE]/50'
            }`}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Quiz</span>
          </button>
        </div>
      </div>

      {/* Learning Progress Bar & Account Sync Status */}
      <Card tone="lavender" padding="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-[#292544]">Your Learning Progress</h2>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#047857]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {catalogSource === 'supabase' ? 'Synced from Supabase catalog' : 'Verified starter library'}
                </span>
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-[#292544]/75">
              {completedCount} of {gestures.length} gestures marked as learned ({progressPct}%) ·{' '}
              {user ? (
                <span>
                  Synced to your account (<Link to="/progress" className="text-[#6D28D9] underline">View Progress Dashboard</Link>)
                </span>
              ) : (
                <span>
                  Saved locally in your browser ·{' '}
                  <Link to="/auth?redirect=/progress" className="text-[#6D28D9] underline">
                    Sign in to sync across devices
                  </Link>
                </span>
              )}
            </p>
          </div>
          <span className="font-mono text-lg font-extrabold tabular-nums text-[#6D28D9]">
            {progressPct}%
          </span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#34D399] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </Card>

      {mode === 'library' && (
        <div className="space-y-6">
          <Card tone="default" padding="p-5">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 md:max-w-sm">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#292544]/45"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search gestures, meanings, or handshapes..."
                    aria-label="Search sign gestures"
                    className="w-full rounded-2xl border border-[#EDE9FE] bg-[#FFFCF8] py-2.5 pr-4 pl-10 text-sm text-[#292544] placeholder:text-[#292544]/45 focus:border-[#A78BFA] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Difficulty filter">
                  <span className="text-xs font-bold text-[#292544]/60">Difficulty:</span>
                  {SIGN_DIFFICULTIES.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelectedDifficulty(level)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        selectedDifficulty === level
                          ? 'bg-[#6D28D9] text-white'
                          : 'bg-[#EDE9FE]/65 text-[#292544] hover:bg-[#EDE9FE]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Gesture categories">
                {SIGN_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      selectedCategory === category
                        ? 'bg-[#292544] text-white'
                        : 'bg-[#EDE9FE]/65 text-[#292544] hover:bg-[#EDE9FE]'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {filteredGestures.length === 0 ? (
            <Card tone="default" className="text-center">
              <p className="text-base font-bold text-[#292544]">
                No gestures match your current filters
              </p>
              <p className="mt-1 text-sm text-[#292544]/70">
                Try clearing your search or resetting Category and Difficulty filters.
              </p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSelectedDifficulty('All');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGestures.map((gesture) => {
                const isLearned = Boolean(progressMap[gesture.id]?.completed);
                return (
                  <Card
                    key={gesture.id}
                    tone="default"
                    padding="p-5"
                    className={`flex flex-col justify-between hover:-translate-y-0.5 ${
                      isLearned ? 'border-[#34D399]' : 'hover:border-[#A78BFA]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2">
                        <span className="rounded-lg bg-[#EDE9FE] px-2.5 py-0.5 text-[11px] font-bold text-[#6D28D9]">
                          {gesture.category} · {gesture.difficulty}
                        </span>
                        {isLearned && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#A7F3D0] px-2 py-0.5 text-[11px] font-bold text-[#065F46]">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            <span>Learned</span>
                          </span>
                        )}
                      </div>
                      <HandIllustration gesture={gesture.illustration} className="h-40 w-full" />
                      <h2 className="mt-4 text-xl font-extrabold text-[#292544]">{gesture.word}</h2>
                      <p className="mt-1 text-xs font-semibold text-[#292544]/80">
                        {gesture.meaning || gesture.movement}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-xs text-[#292544]/65">
                        Handshape: {gesture.handshape}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#EDE9FE] pt-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedGesture(gesture)}
                        >
                          Guide
                        </Button>
                        <Button
                          variant={isLearned ? 'mint' : 'outline'}
                          size="sm"
                          onClick={() => void handleToggleGestureLearned(gesture.id)}
                          aria-label={
                            isLearned
                              ? `Unmark ${gesture.word} as learned`
                              : `Mark ${gesture.word} as learned`
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{isLearned ? 'Done' : 'Mark Learned'}</span>
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakText(gesture.word)}
                        aria-label={`Pronounce ${gesture.word}`}
                      >
                        <Volume2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === 'flashcards' && (
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs font-bold tabular-nums text-[#292544]/75">
              Flashcard {flashcardDeck.length > 0 ? Math.min(flashIndex + 1, flashcardDeck.length) : 0} of{' '}
              {flashcardDeck.length}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShuffleDeck}>
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Shuffle Deck</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFlashIndex(0);
                  setIsFlipped(false);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restart</span>
              </Button>
            </div>
          </div>

          {activeFlashcard ? (
            <Card tone="lavender" className="space-y-6">
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#6D28D9]">
                <span>
                  {activeFlashcard.category} · {activeFlashcard.difficulty}
                </span>
                {progressMap[activeFlashcard.id]?.completed && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#A7F3D0] px-2.5 py-0.5 text-[#065F46]">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Mastered</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFlipped((prev) => !prev)}
                className="block w-full cursor-pointer rounded-3xl border-2 border-white bg-white/95 p-6 text-left shadow-sm transition-colors hover:border-[#A78BFA] focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
              >
                {!isFlipped ? (
                  <div className="flex flex-col items-center py-4 text-center">
                    <div className="w-full max-w-xs">
                      <HandIllustration gesture={activeFlashcard.illustration} className="h-52 w-full" />
                    </div>
                    <p className="mt-4 text-xs font-bold text-[#6D28D9]">
                      Hint: {activeFlashcard.handshape}
                    </p>
                    <p className="mt-2 text-sm font-extrabold text-[#292544]">
                      Tap card to reveal sign meaning &amp; instructions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-3xl font-extrabold text-[#292544]">
                        {activeFlashcard.word}
                      </h2>
                      <span className="rounded-xl bg-[#EDE9FE] px-3 py-1 text-xs font-bold text-[#6D28D9]">
                        Tap to show hand front
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#292544]">
                      Meaning: {activeFlashcard.meaning || activeFlashcard.movement}
                    </p>
                    <div>
                      <p className="text-xs font-bold text-[#292544]/60">Movement</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-[#292544]/85">
                        {activeFlashcard.movement}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#EDE9FE]/55 p-3.5 text-xs">
                      <p className="font-bold text-[#6D28D9]">Tip &amp; Educational Reference</p>
                      <p className="mt-1 font-semibold text-[#292544]">{activeFlashcard.tip}</p>
                      {activeFlashcard.sourceReference && (
                        <p className="mt-1 text-[11px] text-[#292544]/70">
                          {activeFlashcard.sourceReference}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speakText(activeFlashcard.word)}
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    <span>Hear Word</span>
                  </Button>
                  <Button
                    variant="peach"
                    size="sm"
                    onClick={async () => {
                      await handleToggleGestureLearned(activeFlashcard.id, false, 40);
                      setIsFlipped(false);
                      setFlashIndex((prev) => (prev + 1) % flashcardDeck.length);
                    }}
                  >
                    <span>Need Practice</span>
                  </Button>
                  <Button
                    variant="mint"
                    size="sm"
                    onClick={async () => {
                      await handleToggleGestureLearned(activeFlashcard.id, true, 100);
                      setIsFlipped(false);
                      setFlashIndex((prev) => (prev + 1) % flashcardDeck.length);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>Got It!</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={flashIndex === 0}
                    onClick={() => {
                      setIsFlipped(false);
                      setFlashIndex((prev) => Math.max(0, prev - 1));
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Prev</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={flashIndex >= flashcardDeck.length - 1}
                    onClick={() => {
                      setIsFlipped(false);
                      setFlashIndex((prev) => Math.min(flashcardDeck.length - 1, prev + 1));
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      )}

      {mode === 'quiz' && (
        <Card tone="lavender" className="mx-auto max-w-2xl">
          {quizFinished ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#A7F3D0] text-[#292544]">
                <Award className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-[#292544]">Quiz Complete!</h2>
              <p className="mt-2 font-mono text-lg font-bold tabular-nums text-[#6D28D9]">
                Score: {score} / {quizQuestions.length} ({quizPercentage ?? Math.round((score / quizQuestions.length) * 100)}%)
              </p>
              <p className="mt-2 text-sm text-[#292544]/75">
                {savingQuiz
                  ? 'Saving score...'
                  : score === quizQuestions.length
                    ? 'Outstanding! You recognized every gesture accurately.'
                    : 'Great effort! Review flashcards or the library and try again anytime.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="primary" onClick={() => handleRestartQuiz()}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Try Quiz Again</span>
                </Button>
                <Button variant="outline" onClick={() => setMode('flashcards')}>
                  <span>Practice Flashcards</span>
                </Button>
                {user && (
                  <Button to="/progress" variant="mint">
                    <span>View Progress History</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#292544]/75">
                <span className="inline-flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />
                  <span>
                    Question {quizIndex + 1} of {quizQuestions.length}
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <select
                    aria-label="Filter quiz category"
                    value={quizCategory}
                    onChange={(e) => handleRestartQuiz(e.target.value)}
                    className="min-h-[34px] rounded-xl border border-[#DDD6FE] bg-white px-2.5 py-1 text-xs font-bold text-[#292544]"
                  >
                    {SIGN_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? 'All Topics (8 Qs)' : cat}
                      </option>
                    ))}
                  </select>
                  <span className="font-mono tabular-nums">Score: {score}</span>
                </div>
              </div>

              <div className="mx-auto max-w-xs">
                <HandIllustration gesture={currentQuestion.gestureId} className="h-44 w-full" />
              </div>

              <h2 className="text-center text-lg font-bold text-[#292544]">
                {currentQuestion.prompt}
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOption === option;
                  const isCorrect = option === currentQuestion.answer;
                  let buttonStyle =
                    'border-[#DDD6FE] bg-white text-[#292544] hover:border-[#A78BFA] hover:bg-[#EDE9FE]/40';

                  if (selectedOption !== null) {
                    if (isCorrect) {
                      buttonStyle = 'border-[#10B981] bg-[#A7F3D0]/70 text-[#292544]';
                    } else if (isSelected) {
                      buttonStyle = 'border-[#EF4444] bg-[#FCA5A5]/45 text-[#292544]';
                    } else {
                      buttonStyle = 'border-[#EDE9FE] bg-white/60 text-[#292544]/55';
                    }
                  }

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => handleAnswerSelect(option)}
                      className={`flex min-h-[52px] items-center justify-between rounded-2xl border-2 px-5 py-3 text-left text-base font-bold transition-colors cursor-pointer disabled:cursor-default ${buttonStyle}`}
                    >
                      <span>{option}</span>
                      {selectedOption !== null && isCorrect && (
                        <CheckCircle2 className="h-5 w-5 text-[#047857]" aria-hidden="true" />
                      )}
                      {selectedOption !== null && isSelected && !isCorrect && (
                        <XCircle className="h-5 w-5 text-[#B91C1C]" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#DDD6FE] pt-4">
                  <div>
                    <p className="text-sm font-bold text-[#292544]">
                      {selectedOption === currentQuestion.answer
                        ? 'Correct! Nice observation.'
                        : `The correct sign is "${currentQuestion.answer}".`}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-[#292544]/75">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                  <Button variant="primary" size="md" onClick={handleNextQuestion}>
                    {quizIndex + 1 >= quizQuestions.length ? 'Finish & Calculate Score' : 'Next Question'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={Boolean(selectedGesture)}
        onClose={() => setSelectedGesture(null)}
        title={selectedGesture ? `${selectedGesture.word} — Gesture Guide` : ''}
      >
        {selectedGesture && (
          <div className="space-y-5">
            <HandIllustration gesture={selectedGesture.illustration} className="h-48 w-full" />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#6D28D9]">
              <span>
                {selectedGesture.category} · {selectedGesture.difficulty}
              </span>
              {selectedGesture.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#A7F3D0]/70 px-2.5 py-0.5 text-[#065F46]">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Verified Educational Guide</span>
                </span>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="font-bold text-[#292544]">Meaning</p>
                <p className="mt-0.5 text-[#292544]/85">
                  {selectedGesture.meaning || selectedGesture.movement}
                </p>
              </div>
              <div>
                <p className="font-bold text-[#292544]">Handshape</p>
                <p className="mt-0.5 text-[#292544]/80">{selectedGesture.handshape}</p>
              </div>
              <div>
                <p className="font-bold text-[#292544]">How to Sign</p>
                <p className="mt-0.5 leading-relaxed text-[#292544]/80">
                  {selectedGesture.movement}
                </p>
              </div>
              <div className="rounded-2xl bg-[#EDE9FE]/55 p-4">
                <p className="text-xs font-bold text-[#6D28D9]">Helpful Tip &amp; Reference</p>
                <p className="mt-1 text-sm text-[#292544]">{selectedGesture.tip}</p>
                {selectedGesture.sourceReference && (
                  <p className="mt-1.5 text-[11px] font-semibold text-[#292544]/70">
                    Reference: {selectedGesture.sourceReference}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Button
                variant={progressMap[selectedGesture.id]?.completed ? 'mint' : 'secondary'}
                size="sm"
                onClick={() => void handleToggleGestureLearned(selectedGesture.id)}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>
                  {progressMap[selectedGesture.id]?.completed ? 'Marked Learned' : 'Mark as Learned'}
                </span>
              </Button>
              <Button variant="mint" size="sm" onClick={() => speakText(selectedGesture.word)}>
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Speak Word</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedGesture(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
