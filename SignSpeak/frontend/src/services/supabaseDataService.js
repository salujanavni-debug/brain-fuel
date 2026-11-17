import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { SIGN_VOCABULARY } from '../utils/signVocabulary';

const LOCAL_PROGRESS_KEY = 'signspeak_learning_progress_v1';
const LOCAL_QUIZ_KEY = 'signspeak_quiz_results_v1';

export function loadLocalLearningProgress() {
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

export function saveLocalLearningProgress(progressMap) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progressMap));
  } catch {
    // Ignore
  }
}

export function loadLocalQuizResults() {
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

export function saveLocalQuizResult(record) {
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

export async function fetchPublicGestures() {
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
    const mapped = data.map((row) => {
      const fallback = localById.get(row.id);
      return {
        id: row.id,
        word: row.gesture_name || fallback?.word || row.id,
        meaning: row.meaning || fallback?.meaning,
        aliases: fallback?.aliases || [],
        category: row.category || fallback?.category || 'Greetings',
        difficulty: row.difficulty || fallback?.difficulty || 'Beginner',
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

export async function fetchLearningProgress(userId) {
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

    const merged = { ...local };
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

export async function upsertLearningProgress(userId, gestureId, completed, score) {
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

export async function fetchQuizResults(userId) {
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

export async function saveQuizResult(userId, score, totalQuestions, category = 'All') {
  const record = {
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

export async function fetchTranslationHistory(userId) {
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

export async function saveTranslationHistoryText(userId, translatedText) {
  const trimmed = translatedText.trim();
  if (!userId || !trimmed || !isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('translation_history').insert({
      user_id: userId,
      translated_text: trimmed,
    });
  } catch {
    // Non-blocking sync
  }
}

export async function deleteTranslationHistoryRow(userId, rowId) {
  if (!userId || !isSupabaseConfigured || !supabase) return false;
  const { error } = await supabase
    .from('translation_history')
    .delete()
    .eq('id', rowId)
    .eq('user_id', userId);
  return !error;
}
