import { useEffect, useState } from 'react';
import { Award, BookOpen, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import {
  fetchLearningProgress,
  fetchQuizResults,
  upsertLearningProgress,
} from '../services/supabaseDataService';
import { SIGN_VOCABULARY } from '../utils/signVocabulary';

export function ProgressPage() {
  const { user, profile } = useAuth();
  const [progressMap, setProgressMap] = useState({});
  const [quizHistory, setQuizHistory] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    fetchLearningProgress(user.id).then(setProgressMap);
    fetchQuizResults(user.id).then(setQuizHistory);
  }, [user?.id]);

  const completedCount = SIGN_VOCABULARY.filter((g) => progressMap[g.id]?.completed).length;
  const pct = Math.round((completedCount / SIGN_VOCABULARY.length) * 100);

  const avgQuizPct =
    quizHistory.length > 0
      ? Math.round(
          quizHistory.reduce(
            (sum, q) => sum + (q.total_questions > 0 ? (q.score / q.total_questions) * 100 : 0),
            0
          ) / quizHistory.length
        )
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#6D28D9]">Protected Learning Analytics</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#292544]">
            {profile?.display_name ? `${profile.display_name}'s Progress` : 'Learning Progress'}
          </h1>
          <p className="mt-1 text-sm text-[#292544]/75">
            Track mastered gestures and quiz scores synced securely to your Supabase account.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button to="/learn" variant="primary" size="sm">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Continue Learning</span>
          </Button>
          <Button to="/profile" variant="outline" size="sm">
            <span>Account Profile</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card tone="lavender" padding="p-5">
          <p className="text-xs font-bold text-[#6D28D9]">Gestures Learned</p>
          <p className="mt-2 font-mono text-3xl font-extrabold tabular-nums text-[#292544]">
            {completedCount} / {SIGN_VOCABULARY.length}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#292544]/70">{pct}% starter mastery</p>
        </Card>
        <Card tone="mint" padding="p-5">
          <p className="text-xs font-bold text-[#065F46]">Quizzes Completed</p>
          <p className="mt-2 font-mono text-3xl font-extrabold tabular-nums text-[#292544]">
            {quizHistory.length}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#292544]/70">Saved in Supabase quiz_results</p>
        </Card>
        <Card tone="blue" padding="p-5">
          <p className="text-xs font-bold text-[#1E3A8A]">Average Quiz Score</p>
          <p className="mt-2 font-mono text-3xl font-extrabold tabular-nums text-[#292544]">
            {avgQuizPct !== null ? `${avgQuizPct}%` : '—'}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#292544]/70">Across recorded attempts</p>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <Card tone="default" className="lg:col-span-7">
          <h2 className="text-lg font-extrabold text-[#292544]">Gesture Mastery Checklist</h2>
          <p className="mt-1 text-xs font-semibold text-[#292544]/65">
            Toggle any sign below to update your `learning_progress` record.
          </p>
          <ul className="mt-4 divide-y divide-[#EDE9FE]">
            {SIGN_VOCABULARY.map((gesture) => {
              const rec = progressMap[gesture.id];
              const isDone = Boolean(rec?.completed);
              return (
                <li key={gesture.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-extrabold text-[#292544]">{gesture.word}</p>
                    <p className="text-xs font-semibold text-[#292544]/65">
                      {gesture.category} · {gesture.difficulty}
                      {rec?.updated_at
                        ? ` · Updated ${new Date(rec.updated_at).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                  <Button
                    variant={isDone ? 'mint' : 'outline'}
                    size="sm"
                    onClick={async () => {
                      const updated = await upsertLearningProgress(
                        user?.id,
                        gesture.id,
                        !isDone,
                        !isDone ? 100 : 0
                      );
                      setProgressMap(updated);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isDone ? 'Completed' : 'Mark Learned'}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card tone="default" className="lg:col-span-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#292544]">
            <Award className="h-5 w-5 text-[#6D28D9]" aria-hidden="true" />
            <span>Recent Quiz Results</span>
          </h2>
          {quizHistory.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-[#EDE9FE]/35 p-4 text-sm text-[#292544]/75">
              <p>No quiz scores saved yet.</p>
              <div className="mt-3">
                <Button to="/learn" variant="secondary" size="sm">
                  Take Interactive Quiz
                </Button>
              </div>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[#EDE9FE]">
              {quizHistory.map((item) => {
                const qPct =
                  item.total_questions > 0
                    ? Math.round((item.score / item.total_questions) * 100)
                    : 0;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-extrabold text-[#292544]">
                        {item.score} / {item.total_questions} ({qPct}%)
                      </p>
                      <p className="flex items-center gap-1 text-xs font-semibold text-[#292544]/65">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <span>
                          {item.category || 'All'} ·{' '}
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`rounded-xl px-2.5 py-1 font-mono text-xs font-bold ${
                        qPct >= 80
                          ? 'bg-[#A7F3D0] text-[#065F46]'
                          : 'bg-[#EDE9FE] text-[#6D28D9]'
                      }`}
                    >
                      {qPct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
