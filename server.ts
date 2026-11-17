import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  matchTextToSigns,
  SIGN_VOCABULARY,
} from './src/utils/signVocabulary.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEARNING_CATEGORIES = [
  {
    id: 'greetings',
    name: 'Greetings',
    description: 'Warm everyday openers, polite requests, and courteous responses.',
  },
  {
    id: 'daily-needs',
    name: 'Daily Needs',
    description: 'Essential confirmations and routine personal requests.',
  },
  {
    id: 'feelings-people',
    name: 'Feelings & People',
    description: 'Relational words, learning terms, and expressions of care.',
  },
  {
    id: 'health-safety',
    name: 'Health & Safety',
    description: 'Medical, discomfort, and urgent assistance signs.',
  },
];

const EMERGENCY_MESSAGES = [
  { id: 'help', message: 'I need help.', gesture_id: 'help', urgency: 'high', category: 'Urgent Aid', speech_rate: 0.9 },
  { id: 'pain', message: 'I am in pain.', gesture_id: 'pain', urgency: 'critical', category: 'Medical', speech_rate: 0.9 },
  { id: 'doctor', message: 'Call a doctor.', gesture_id: 'doctor', urgency: 'critical', category: 'Medical', speech_rate: 0.9 },
  { id: 'water', message: 'I need water.', gesture_id: 'water', urgency: 'moderate', category: 'Basic Needs', speech_rate: 0.9 },
  { id: 'cannot-understand', message: 'I cannot understand.', gesture_id: 'learn', urgency: 'moderate', category: 'Communication', speech_rate: 0.9 },
  { id: 'contact-family', message: 'Please contact my family.', gesture_id: 'friend', urgency: 'high', category: 'Family & Contact', speech_rate: 0.9 },
  { id: 'assistance', message: 'I need assistance.', gesture_id: 'help', urgency: 'high', category: 'Support', speech_rate: 0.9 },
];

const QUIZ_BANK = [
  {
    id: 'q1',
    gesture_id: 'hello',
    category: 'Greetings',
    prompt: 'Which greeting matches an open flat hand waving gently outward from the forehead?',
    options: ['Hello', 'Water', 'Pain', 'No'],
    correct_answer: 'Hello',
    explanation: 'Hello uses an open flat palm near the forehead sweeping gently outward.',
  },
  {
    id: 'q2',
    gesture_id: 'water',
    category: 'Daily Needs',
    prompt: 'Forming a W-shape with three fingers and tapping your chin twice represents:',
    options: ['Friend', 'Water', 'Thank You', 'Doctor'],
    correct_answer: 'Water',
    explanation: "Water forms a 'W' with index, middle, and ring fingers tapped against the chin.",
  },
  {
    id: 'q3',
    gesture_id: 'help',
    category: 'Health & Safety',
    prompt: 'A thumbs-up resting on an open palm and lifting upward together means:',
    options: ['Please', 'Yes', 'Help', 'Learn'],
    correct_answer: 'Help',
    explanation: 'Help places a closed thumbs-up fist on the opposite palm and lifts both upward.',
  },
  {
    id: 'q4',
    gesture_id: 'love',
    category: 'Feelings & People',
    prompt: 'Thumb, index, and little finger extended together stands for:',
    options: ['I Love You', 'No', 'Doctor', 'Friend'],
    correct_answer: 'I Love You',
    explanation: 'The I-L-Y handshape combines letters I, L, and Y into one gesture.',
  },
  {
    id: 'q5',
    gesture_id: 'thank-you',
    category: 'Greetings',
    prompt: 'Touching your chin softly and moving your flat hand forward toward the listener means:',
    options: ['Please', 'Thank You', 'Pain', 'Yes'],
    correct_answer: 'Thank You',
    explanation: 'Thank You moves a flat hand gently forward from the chin.',
  },
  {
    id: 'q6',
    gesture_id: 'yes',
    category: 'Daily Needs',
    prompt: 'Holding a relaxed fist at shoulder height and nodding it forward twice means:',
    options: ['No', 'Yes', 'Please', 'Water'],
    correct_answer: 'Yes',
    explanation: 'Yes uses a nodding fist motion from the wrist, mirroring a head nod.',
  },
  {
    id: 'q7',
    gesture_id: 'doctor',
    category: 'Health & Safety',
    prompt: 'Tapping the inner wrist of your opposite arm twice as if checking a pulse signs:',
    options: ['Pain', 'Help', 'Doctor', 'Friend'],
    correct_answer: 'Doctor',
    explanation: 'Doctor mimics checking a wrist pulse with two gentle taps.',
  },
  {
    id: 'q8',
    gesture_id: 'learn',
    category: 'Feelings & People',
    prompt: 'Gathering from an open palm upward toward your forehead represents:',
    options: ['Learn', 'Hello', 'Thank You', 'No'],
    correct_answer: 'Learn',
    explanation: 'Learn visualizes lifting knowledge from a book or open palm into your mind.',
  },
];

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '2mb' }));

  const mediapipeWasmDir = path.resolve(
    __dirname,
    'node_modules/@mediapipe/tasks-vision/wasm'
  );
  if (fs.existsSync(mediapipeWasmDir)) {
    app.use('/mediapipe/wasm', express.static(mediapipeWasmDir));
  }

  // 1. Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'SignSpeak API',
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      subsystems: {
        api: 'ready',
        ai_pipeline: 'pending_models',
        database: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL ? 'configured' : 'unconfigured',
      },
    });
  });

  // 2. Gestures List
  app.get('/api/gestures', (req, res) => {
    const category = String(req.query.category || '').trim().toLowerCase();
    const search = String(req.query.search || '').trim().toLowerCase();
    const filtered = SIGN_VOCABULARY.filter((g) => {
      const catOk = !category || category === 'all' || g.category.toLowerCase() === category;
      const searchOk =
        !search ||
        g.word.toLowerCase().includes(search) ||
        g.handshape.toLowerCase().includes(search) ||
        g.aliases.some((a) => a.includes(search));
      return catOk && searchOk;
    });
    res.json({
      total: filtered.length,
      category: req.query.category || null,
      gestures: filtered.map((g) => ({
        id: g.id,
        label: g.word,
        meaning: g.movement,
        category: g.category,
        difficulty: g.difficulty,
      })),
    });
  });

  // 3. Gesture Detail
  app.get('/api/gestures/:gestureId', (req, res) => {
    const g = SIGN_VOCABULARY.find(
      (item) => item.id.toLowerCase() === req.params.gestureId.toLowerCase()
    );
    if (!g) {
      res.status(404).json({
        error: {
          code: 'HTTP_ERROR',
          message: `Gesture '${req.params.gestureId}' was not found.`,
          status_code: 404,
        },
      });
      return;
    }
    res.json({
      id: g.id,
      label: g.word,
      meaning: g.movement,
      category: g.category,
      difficulty: g.difficulty,
      handshape: g.handshape,
      movement: g.movement,
      tip: g.tip,
      aliases: g.aliases,
      demonstration_assets: [
        {
          asset_type: 'svg_illustration',
          identifier: g.illustration,
          description: `Vector demonstration for ${g.word}`,
        },
      ],
    });
  });

  const ISL_PROTOTYPE_DISCLAIMER =
    'These 8 labels are an initial prototype vocabulary only, NOT automatically verified Indian Sign Language (ISL) translations. Validate gesture meaning, hand orientation, movement, and grammar with qualified ISL resources or Deaf community reviewers.';

  const PROTOTYPE_VOCABULARY = [
    { id: 'hello', label: 'Hello', gesture_type: 'dynamic', expected_hands: '1 hand (dynamic wave)', isl_verification_status: 'unverified_prototype' },
    { id: 'thank-you', label: 'Thank You', gesture_type: 'dynamic', expected_hands: '1 hand (chin-forward trajectory)', isl_verification_status: 'unverified_prototype' },
    { id: 'yes', label: 'Yes', gesture_type: 'dynamic', expected_hands: '1 hand (nodding fist motion)', isl_verification_status: 'unverified_prototype' },
    { id: 'no', label: 'No', gesture_type: 'dynamic', expected_hands: '1 hand (finger tap/shake motion)', isl_verification_status: 'unverified_prototype' },
    { id: 'help', label: 'Help', gesture_type: 'dynamic', expected_hands: '2 hands (base palm + lifting fist)', isl_verification_status: 'unverified_prototype' },
    { id: 'stop', label: 'Stop', gesture_type: 'static', expected_hands: '1 or 2 hands (open raised palm hold)', isl_verification_status: 'unverified_prototype' },
    { id: 'please', label: 'Please', gesture_type: 'dynamic', expected_hands: '1 hand (circular chest motion)', isl_verification_status: 'unverified_prototype' },
    { id: 'love', label: 'I Love You', gesture_type: 'static', expected_hands: '1 hand (thumb, index, pinky extended)', isl_verification_status: 'unverified_prototype' },
  ];

  const WORKFLOW_STEPS = [
    '1. Start your webcam in the Translator page and open the Dataset Collection & Annotation panel.',
    '2. Choose a prototype label (or Unknown/Neutral) and capture static poses or 24-frame dynamic clips.',
    '3. Verify hand orientation and movement against authentic ISL references across multiple signers.',
    '4. Export or save labeled JSON samples into SignSpeak/backend/datasets/raw/.',
    '5. Run: python -m app.ml.train_classifier --dataset ./datasets/raw --output-dir ./models',
  ];

  const getTrainedMetadataIfPresent = () => {
    const metadataFile = path.resolve(__dirname, 'SignSpeak/backend/models/model_metadata.json');
    if (!fs.existsSync(metadataFile)) return null;
    try {
      return JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
    } catch {
      return null;
    }
  };

  // 4a. Recognition Status
  app.get('/api/recognition/status', (_req, res) => {
    const metadata = getTrainedMetadataIfPresent();
    const isTrained = Boolean(metadata?.model_trained);
    res.json({
      model_trained: isTrained,
      recognition_status: isTrained ? 'recognized' : 'model_unavailable',
      classifier_mode: isTrained ? `trained_${metadata.framework || 'sklearn'}` : 'development_stub',
      confidence_threshold: 0.7,
      temporal_window_frames: 24,
      isl_disclaimer: ISL_PROTOTYPE_DISCLAIMER,
      message: isTrained
        ? 'Trained model metadata detected. Run the Python FastAPI backend (port 8000) for Scikit-learn/TensorFlow inference.'
        : 'Gesture classification model is not trained yet. Suitable authentic ISL training data has not been collected and trained into a saved model artifact.',
      model_metadata: metadata,
      vocabulary: PROTOTYPE_VOCABULARY,
      workflow_steps: WORKFLOW_STEPS,
    });
  });

  // 4b. Recognition Predict (Honest untrained state — never fabricates predictions)
  app.post('/api/recognition/predict', (req, res) => {
    const landmarks = req.body?.landmarks;
    const sequence = req.body?.sequence;
    if (
      !Array.isArray(landmarks) ||
      landmarks.length === 0 ||
      landmarks.length > 2 ||
      landmarks.some((hand) => !Array.isArray(hand) || hand.length !== 21)
    ) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Each hand in landmarks must contain exactly 21 keypoints.',
          status_code: 422,
        },
      });
      return;
    }

    res.json({
      recognized: false,
      recognized_gesture: null,
      predicted_label: null,
      confidence: 0.0,
      timestamp: new Date().toISOString(),
      recognition_status: 'model_unavailable',
      classifier_mode: 'development_stub',
      model_trained: false,
      gesture_type: Array.isArray(sequence) && sequence.length > 1 ? 'dynamic' : 'static',
      unknown_detected: false,
      low_confidence: false,
      isl_disclaimer: ISL_PROTOTYPE_DISCLAIMER,
      detail:
        'Gesture classification model is not trained yet (no authentic labeled ISL training dataset loaded). Incoming 21-point hand landmarks were validated successfully. Use the Dataset Collection workflow to record labeled samples and train the FastAPI classifier.',
    });
  });

  // 5. Recognition Batch
  app.post('/api/recognition/batch', (req, res) => {
    const frames = req.body?.frames;
    if (!Array.isArray(frames) || frames.length === 0 || frames.length > 120) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'frames must be a non-empty array of up to 120 landmark frames.',
          status_code: 422,
        },
      });
      return;
    }
    res.json({
      frames_processed: frames.length,
      recognized: false,
      recognized_gesture: null,
      predicted_label: null,
      confidence: 0.0,
      timestamp: new Date().toISOString(),
      recognition_status: 'model_unavailable',
      classifier_mode: 'development_stub',
      model_trained: false,
      isl_disclaimer: ISL_PROTOTYPE_DISCLAIMER,
      detail:
        'Gesture classification model is not trained yet: temporal batch landmarks validated without fabricating predictions.',
      frame_statuses: frames.map(() => 'model_unavailable'),
    });
  });

  // 5b. Dataset Sample Submission (Annotation Workflow)
  app.post('/api/recognition/dataset/samples', (req, res) => {
    const { gesture_id, gesture_type, signer_id, session_id, isl_verified, notes, frames } = req.body || {};
    const validIds = new Set([...PROTOTYPE_VOCABULARY.map((v) => v.id), 'unknown']);
    const normalizedId = String(gesture_id || '').trim().toLowerCase();
    if (!validIds.has(normalizedId)) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Unsupported gesture_id '${gesture_id}'.`,
          status_code: 422,
        },
      });
      return;
    }
    if (!Array.isArray(frames) || frames.length === 0 || frames.length > 60) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'frames must contain 1 to 60 validated MediaPipe landmark frames.',
          status_code: 422,
        },
      });
      return;
    }

    const rawDir = path.resolve(__dirname, 'SignSpeak/backend/datasets/raw');
    fs.mkdirSync(rawDir, { recursive: true });
    const targetFile = path.join(rawDir, `${normalizedId}_collected.json`);
    let existing: { samples: unknown[] } = { samples: [] };
    if (fs.existsSync(targetFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
        if (parsed && Array.isArray(parsed.samples)) {
          existing = parsed;
        }
      } catch {
        existing = { samples: [] };
      }
    }

    const sampleId = `${normalizedId}_${Date.now()}`;
    existing.samples.push({
      sample_id: sampleId,
      gesture_id: normalizedId,
      gesture_type: gesture_type === 'dynamic' ? 'dynamic' : 'static',
      signer_id: String(signer_id || 'contributor_1'),
      session_id: String(session_id || `session_${Date.now()}`),
      isl_verified: Boolean(isl_verified),
      notes: String(notes || ''),
      frames,
    });
    fs.writeFileSync(targetFile, JSON.stringify(existing, null, 2), 'utf-8');

    res.status(201).json({
      saved: true,
      sample_id: sampleId,
      gesture_id: normalizedId,
      frames_saved: frames.length,
      file_path: `SignSpeak/backend/datasets/raw/${normalizedId}_collected.json`,
      isl_disclaimer: ISL_PROTOTYPE_DISCLAIMER,
    });
  });

  // 6. Learning Categories
  app.get('/api/learning/categories', (_req, res) => {
    const categories = LEARNING_CATEGORIES.map((cat) => ({
      ...cat,
      gesture_count: SIGN_VOCABULARY.filter(
        (g) => g.category.toLowerCase() === cat.name.toLowerCase()
      ).length,
    }));
    res.json({ total: categories.length, categories });
  });

  // 7. Learning Gestures
  app.get('/api/learning/gestures', (req, res) => {
    const category = String(req.query.category || '').trim().toLowerCase();
    const filtered = SIGN_VOCABULARY.filter(
      (g) => !category || category === 'all' || g.category.toLowerCase() === category
    );
    res.json({
      total: filtered.length,
      gestures: filtered.map((g) => ({
        id: g.id,
        label: g.word,
        meaning: g.movement,
        category: g.category,
        difficulty: g.difficulty,
        handshape: g.handshape,
        movement: g.movement,
        tip: g.tip,
        aliases: g.aliases,
        demonstration_assets: [
          {
            asset_type: 'svg_illustration',
            identifier: g.illustration,
            description: `Vector demonstration for ${g.word}`,
          },
        ],
      })),
    });
  });

  // 8. Quiz Fetch
  app.post('/api/learning/quiz', (req, res) => {
    const category = String(req.body?.category || '').trim().toLowerCase();
    const limit = Math.min(20, Math.max(1, Number(req.body?.limit || 8)));
    const pool =
      category && category !== 'all'
        ? QUIZ_BANK.filter((q) => q.category.toLowerCase() === category)
        : QUIZ_BANK;
    const questions = pool.slice(0, limit).map(({ correct_answer: _a, explanation: _e, ...q }) => q);
    res.json({ total_questions: questions.length, questions });
  });

  // 9. Quiz Submit
  app.post('/api/learning/quiz/submit', (req, res) => {
    const answers = req.body?.answers;
    if (!Array.isArray(answers) || answers.length === 0) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'answers must be a non-empty array.',
          status_code: 422,
        },
      });
      return;
    }

    let correctCount = 0;
    const results = [];
    for (const ans of answers) {
      const q = QUIZ_BANK.find((item) => item.id === ans.question_id);
      if (!q) {
        res.status(404).json({
          error: {
            code: 'HTTP_ERROR',
            message: `Quiz question '${ans.question_id}' does not exist.`,
            status_code: 404,
          },
        });
        return;
      }
      const isCorrect =
        String(ans.selected_option || '').trim().toLowerCase() ===
        q.correct_answer.toLowerCase();
      if (isCorrect) correctCount += 1;
      results.push({
        question_id: q.id,
        selected_option: ans.selected_option,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation,
      });
    }

    res.json({
      total_answered: results.length,
      correct_count: correctCount,
      score_percentage: Number(((correctCount / results.length) * 100).toFixed(2)),
      results,
    });
  });

  // 10. Emergency Messages
  app.get('/api/emergency/messages', (_req, res) => {
    res.json({ total: EMERGENCY_MESSAGES.length, messages: EMERGENCY_MESSAGES });
  });

  // 11. Text-to-Sign Translation
  app.post('/api/translation/text-to-sign', (req, res) => {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input text cannot be empty.',
          status_code: 422,
        },
      });
      return;
    }

    const matchedResult = matchTextToSigns(text);
    const statusLabel =
      matchedResult.matched.length === 0
        ? 'unsupported'
        : matchedResult.unsupported.length > 0
          ? 'partial'
          : 'complete';

    res.json({
      input_text: text,
      status: statusLabel,
      demonstration_mode: 'individual_sign_sequence',
      grammar_notice:
        'Demonstrates matching individual signs from our verified starter library in English token order — NOT a grammatically complete Indian Sign Language (ISL) sentence translation.',
      matched_count: matchedResult.matched.length,
      unsupported_tokens: matchedResult.unsupported,
      demonstration_sequence: matchedResult.matched.map((g) => ({
        id: g.id,
        label: g.word,
        meaning: g.movement,
        category: g.category,
        difficulty: g.difficulty,
        handshape: g.handshape,
        movement: g.movement,
        tip: g.tip,
        aliases: g.aliases,
        demonstration_assets: [
          {
            asset_type: 'svg_illustration',
            identifier: g.illustration,
            description: `Vector demonstration for ${g.word}`,
          },
        ],
      })),
      tokens: matchedResult.tokens.map((t) => ({
        token: t.token,
        supported: t.supported,
        gesture: t.sign
          ? {
              id: t.sign.id,
              label: t.sign.word,
              meaning: t.sign.movement,
              category: t.sign.category,
              difficulty: t.sign.difficulty,
              handshape: t.sign.handshape,
              movement: t.sign.movement,
              tip: t.sign.tip,
              aliases: t.sign.aliases,
              demonstration_assets: [],
            }
          : null,
      })),
    });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SignSpeak preview server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
