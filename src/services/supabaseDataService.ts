import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { SIGN_VOCABULARY, SignEntry } from '../utils/signVocabulary';

export interface LearningProgressRecord {
  gesture_id: string;
  completed: boolean;
  score: number;
  updated_at: string;
}

export interface QuizResultRecord {
  id: string;
  score: number;
  total_questions: number;
  category?: string | null;
  created_at: string;
}

export interface TranslationHistoryRecord {
  id: string;
  translated_text: string;
  created_at: string;
}

const LOCAL_PROGRESS_KEY = 'signspeak_learning_progress_v1';
const LOCAL_QUIZ_KEY = 'signspeak_quiz_results_v1';

export function loadLocalLearningProgress(): Record<string, LearningProgressRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalLearningProgress(progressMap: Record<string, LearningProgressRecord>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progressMap));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLocalQuizResults(): QuizResultRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_QUIZ_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
}

export function saveLocalQuizResult(record: QuizResultRecord) {
  const existing = loadLocalQuizResults();
  const next = [record, ...existing].slice(0, 30);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LOCAL_QUIZ_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  }
  return next;
}

/**
 * Fetch public learning gestures from Supabase (readable without login via RLS).
 * Falls back cleanly to curated local SIGN_VOCABULARY if Supabase is unconfigured or offline.
 */
export async function fetchPublicGestures(): Promise<{
  gestures: SignEntry[];
  source: 'supabase' | 'local';
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { gestures: SIGN_VOCABULARY, source: 'local' };
  }

  try {
    const { data, error } = await supabase
      .from('gestures')
      .select(
        'id, gesture_name, meaning, category, difficulty, description, handshape, movement, tip, asset_url, source_reference, is_verified'
      )
      .order('gesture_name', { ascending: true });

    if (error || !data || data.length === 0) {
      return { gestures: SIGN_VOCABULARY, source: 'local' };
    }

    const localById = new Map(SIGN_VOCABULARY.map((item) => [item.id, item]));
    const mapped: SignEntry[] = data.map((row) => {
      const fallback = localById.get(row.id);
      return {
        id: row.id,
        word: row.gesture_name || fallback?.word || row.id,
        meaning: row.meaning || fallback?.meaning,
        aliases: fallback?.aliases || [],
        category: (row.category || fallback?.category || 'Greetings') as SignEntry['category'],
        difficulty: (row.difficulty || fallback?.difficulty || 'Beginner') as SignEntry['difficulty'],
        illustration: fallback?.illustration || row.id,
        handshape: row.handshape || fallback?.handshape || '',
        movement: row.movement || row.description || fallback?.movement || '',
        tip: row.tip || fallback?.tip || '',
        sourceReference:
          row.source_reference ||
          fallback?.sourceReference ||
          'Verified Starter Sign Guide',
        isVerified: typeof row.is_verified === 'boolean' ? row.is_verified : true,
      };
    });

    return { gestures: mapped, source: 'supabase' };
  } catch {
    return { gestures: SIGN_VOCABULARY, source: 'local' };
  }
}

export async function fetchLearningProgress(
  userId?: string | null
): Promise<Record<string, LearningProgressRecord>> {
  const local = loadLocalLearningProgress();
  if (!userId || !isSupabaseConfigured || !supabase) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('learning_progress')
      .select('gesture_id, completed, score, updated_at')
      .eq('user_id', userId);

    if (error || !data) return local;

    const merged: Record<string, LearningProgressRecord> = { ...local };
    for (const row of data) {
      merged[row.gesture_id] = {
        gesture_id: row.gesture_id,
        completed: Boolean(row.completed),
        score: Number(row.score ?? 0),
        updated_at: row.updated_at || new Date().toISOString(),
      };
    }
    saveLocalLearningProgress(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function upsertLearningProgress(
  userId: string | null | undefined,
  gestureId: string,
  completed: boolean,
  score: number
): Promise<Record<string, LearningProgressRecord>> {
  const existing = loadLocalLearningProgress();
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const updatedAt = new Date().toISOString();
  const next = {
    ...existing,
    [gestureId]: {
      gesture_id: gestureId,
      completed,
      score: clampedScore,
      updated_at: updatedAt,
    },
  };
  saveLocalLearningProgress(next);

  if (userId && isSupabaseConfigured && supabase) {
    await supabase.from('learning_progress').upsert(
      {
        user_id: userId,
        gesture_id: gestureId,
        completed,
        score: clampedScore,
        updated_at: updatedAt,
      },
      { onConflict: 'user_id,gesture_id' }
    );
  }

  return next;
}

export async function fetchQuizResults(userId?: string | null): Promise<QuizResultRecord[]> {
  const local = loadLocalQuizResults();
  if (!userId || !isSupabaseConfigured || !supabase) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('id, score, total_questions, category, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error || !data) return local;
    return data.map((row) => ({
      id: row.id,
      score: Number(row.score),
      total_questions: Number(row.total_questions),
      category: row.category,
      created_at: row.created_at,
    }));
  } catch {
    return local;
  }
}

export async function saveQuizResult(
  userId: string | null | undefined,
  score: number,
  totalQuestions: number,
  category = 'All'
): Promise<void> {
  const record: QuizResultRecord = {
    id: `local-${Date.now()}`,
    score,
    total_questions: totalQuestions,
    category,
    created_at: new Date().toISOString(),
  };
  saveLocalQuizResult(record);

  if (userId && isSupabaseConfigured && supabase) {
    await supabase.from('quiz_results').insert({
      user_id: userId,
      score,
      total_questions: totalQuestions,
      category,
    });
  }
}

/**
 * Sync text-only translation history (strictly never camera frames/video blobs).
 */
export async function fetchTranslationHistory(
  userId: string
): Promise<TranslationHistoryRecord[]> {
  if (!userId || !isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('translation_history')
      .select('id, translated_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function saveTranslationHistoryText(
  userId: string | null | undefined,
  translatedText: string
): Promise<void> {
  const trimmed = translatedText.trim();
  if (!userId || !trimmed || !isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('translation_history').insert({
      user_id: userId,
      translated_text: trimmed,
    });
  } catch {
    // Non-blocking sync; local history still holds the entry
  }
}

export async function deleteTranslationHistoryRow(
  userId: string,
  rowId: string
): Promise<boolean> {
  if (!userId || !isSupabaseConfigured || !supabase) return false;
  const { error } = await supabase
    .from('translation_history')
    .delete()
    .eq('id', rowId)
    .eq('user_id', userId);
  return !error;
}
