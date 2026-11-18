/// <reference types="node" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  normalizeHandLandmarks,
  PredictionPostProcessor,
  SequenceRingBuffer,
} from '../src/utils/landmarkPostProcessor.ts';
import { matchTextToSigns } from '../src/utils/signVocabulary.ts';
import {
  getAllVoices,
  pauseSpeech,
  resumeSpeech,
  speakTextDetailed,
  stopSpeech,
} from '../src/utils/speech.ts';
import { CameraHandTracker } from '../src/services/cameraHandTracker.ts';

const SERVER_URL = process.env.TEST_API_BASE_URL || 'http://127.0.0.1:3000';

function makeHand(offsetX = 0, scale = 1) {
  return Array.from({ length: 21 }, (_, idx) => ({
    x: 0.4 + offsetX + idx * 0.01 * scale,
    y: 0.5 - (idx % 5) * 0.015 * scale,
    z: -0.005 * (idx % 3) * scale,
    visibility: 1,
  }));
}

function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

// ============================================================================
// 1. LIVE API ENDPOINTS, VALIDATION & SECURITY HEADERS
// ============================================================================

test('API endpoints respond accurately with security headers and input validation', async () => {
  const healthRes = await fetch(`${SERVER_URL}/api/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.subsystems.api, 'ready');
  assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(healthRes.headers.get('x-powered-by'), null);

  // Gestures list & detail
  const gesturesRes = await fetch(`${SERVER_URL}/api/gestures`);
  assert.equal(gesturesRes.status, 200);
  const gesturesJson = await gesturesRes.json();
  assert.ok(gesturesJson.total >= 12);

  const detailRes = await fetch(`${SERVER_URL}/api/gestures/hello`);
  assert.equal(detailRes.status, 200);
  const detailJson = await detailRes.json();
  assert.equal(detailJson.label, 'Hello');

  const missingRes = await fetch(`${SERVER_URL}/api/gestures/non-existent`);
  assert.equal(missingRes.status, 404);

  // Recognition status & honest untrained prediction
  const statusRes = await fetch(`${SERVER_URL}/api/recognition/status`);
  assert.equal(statusRes.status, 200);
  const statusJson = await statusRes.json();
  assert.equal(statusJson.model_trained, false);
  assert.equal(statusJson.recognition_status, 'model_unavailable');
  assert.equal(statusJson.vocabulary.length, 8);

  const predictRes = await fetch(`${SERVER_URL}/api/recognition/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ landmarks: [makeHand()] }),
  });
  assert.equal(predictRes.status, 200);
  const predictJson = await predictRes.json();
  assert.equal(predictJson.recognized, false);
  assert.equal(predictJson.recognition_status, 'model_unavailable');

  // Invalid landmark count -> 422
  const invalidPredict = await fetch(`${SERVER_URL}/api/recognition/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ landmarks: [[{ x: 0.5, y: 0.5, z: 0 }]] }),
  });
  assert.equal(invalidPredict.status, 422);

  // Batch prediction validation
  const batchRes = await fetch(`${SERVER_URL}/api/recognition/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames: [{ landmarks: [makeHand()], timestamp: Date.now() }] }),
  });
  assert.equal(batchRes.status, 200);
  assert.equal((await batchRes.json()).frames_processed, 1);

  const badBatch = await fetch(`${SERVER_URL}/api/recognition/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames: [{ landmarks: [[{ x: 0, y: 0 }]] }] }),
  });
  assert.equal(badBatch.status, 422);

  // Learning endpoints
  const catsRes = await fetch(`${SERVER_URL}/api/learning/categories`);
  assert.equal(catsRes.status, 200);
  assert.equal((await catsRes.json()).total, 4);

  const learnGesturesRes = await fetch(`${SERVER_URL}/api/learning/gestures?category=Greetings`);
  assert.equal(learnGesturesRes.status, 200);
  assert.ok((await learnGesturesRes.json()).total >= 1);

  const quizRes = await fetch(`${SERVER_URL}/api/learning/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 3 }),
  });
  assert.equal(quizRes.status, 200);
  assert.equal((await quizRes.json()).total_questions, 3);

  const submitRes = await fetch(`${SERVER_URL}/api/learning/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: [
        { question_id: 'q1', selected_option: 'Hello' },
        { question_id: 'q2', selected_option: 'No' },
      ],
    }),
  });
  assert.equal(submitRes.status, 200);
  const submitJson = await submitRes.json();
  assert.equal(submitJson.correct_count, 1);
  assert.equal(submitJson.score_percentage, 50);

  // Emergency messages
  const emergencyRes = await fetch(`${SERVER_URL}/api/emergency/messages`);
  assert.equal(emergencyRes.status, 200);
  const emergencyJson = await emergencyRes.json();
  const texts = emergencyJson.messages.map((m: { message: string }) => m.message);
  for (const required of [
    'I need help.',
    'I am in pain.',
    'Call a doctor.',
    'I need water.',
    'I cannot understand.',
    'Please contact my family.',
    'I need assistance.',
  ]) {
    assert.ok(texts.includes(required), `Missing emergency phrase: ${required}`);
  }

  // Text-to-Sign
  const t2sRes = await fetch(`${SERVER_URL}/api/translation/text-to-sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hello spaceship' }),
  });
  assert.equal(t2sRes.status, 200);
  const t2sJson = await t2sRes.json();
  assert.equal(t2sJson.status, 'partial');
  assert.deepEqual(t2sJson.unsupported_tokens, ['spaceship']);

  const emptyT2s = await fetch(`${SERVER_URL}/api/translation/text-to-sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '   ' }),
  });
  assert.equal(emptyT2s.status, 422);
});

// ============================================================================
// 2. LANDMARK NORMALIZATION, LOW-CONFIDENCE & UNKNOWN GESTURE POST-PROCESSING
// ============================================================================

test('normalizeHandLandmarks is translation & scale invariant and validates 21 keypoints', () => {
  const base = makeHand(0, 1);
  const shifted = makeHand(0.25, 1);
  const scaled = Array.from({ length: 21 }, (_, i) => ({
    x: base[0].x + (base[i].x - base[0].x) * 2.5,
    y: base[0].y + (base[i].y - base[0].y) * 2.5,
    z: base[0].z + (base[i].z - base[0].z) * 2.5,
    visibility: 1,
  }));

  const normBase = normalizeHandLandmarks(base);
  const normShifted = normalizeHandLandmarks(shifted);
  const normScaled = normalizeHandLandmarks(scaled);

  assert.equal(normBase.length, 63);
  assert.ok(Math.abs(normBase[0]) < 1e-6);
  for (let i = 0; i < 63; i += 1) {
    assert.ok(Math.abs(normBase[i] - normShifted[i]) < 1e-5);
    assert.ok(Math.abs(normBase[i] - normScaled[i]) < 1e-5);
  }

  assert.throws(() => normalizeHandLandmarks(base.slice(0, 10)), /Expected 21 hand landmarks/);
});

test('PredictionPostProcessor handles low-confidence, unknown gestures, consensus, and cooldown', () => {
  const post = new PredictionPostProcessor({
    windowSize: 5,
    minConsensus: 3,
    duplicateCooldownMs: 2500,
    confidenceThreshold: 0.7,
  });

  // Model unavailable
  const untrained = post.process({
    recognized: false,
    recognized_gesture: null,
    predicted_label: null,
    confidence: 0,
    recognition_status: 'model_unavailable',
  });
  assert.equal(untrained.kind, 'model-untrained');
  assert.equal(untrained.emitToHistory, false);

  // Unknown gesture
  const unknown = post.process({
    recognized: false,
    recognized_gesture: null,
    predicted_label: null,
    confidence: 0.85,
    recognition_status: 'unsupported',
    unknown_detected: true,
  });
  assert.equal(unknown.kind, 'unknown');
  assert.equal(unknown.emitToHistory, false);

  // Low-confidence rejection
  const lowConf = post.process({
    recognized: true,
    recognized_gesture: 'stop',
    predicted_label: 'Stop',
    confidence: 0.52,
    recognition_status: 'recognized',
  });
  assert.equal(lowConf.kind, 'low-confidence');
  assert.equal(lowConf.emitToHistory, false);

  // Temporal consensus (3 consistent high-confidence frames -> accepted)
  const goodFrame = {
    recognized: true,
    recognized_gesture: 'stop',
    predicted_label: 'Stop',
    confidence: 0.91,
    recognition_status: 'recognized' as const,
    gesture_type: 'static',
  };
  assert.equal(post.process(goodFrame, 1000).kind, 'smoothing');
  assert.equal(post.process(goodFrame, 1100).kind, 'smoothing');
  const accepted = post.process(goodFrame, 1200);
  assert.equal(accepted.kind, 'accepted');
  assert.equal(accepted.emitToHistory, true);
  assert.equal(accepted.label, 'Stop');

  // Cooldown suppresses duplicate emission inside 2500ms window
  const duplicate = post.process(goodFrame, 2000);
  assert.equal(duplicate.kind, 'duplicate-suppressed');
  assert.equal(duplicate.emitToHistory, false);

  // After cooldown passes, emits again cleanly
  const afterCooldown = post.process(goodFrame, 4000);
  assert.equal(afterCooldown.kind, 'accepted');
  assert.equal(afterCooldown.emitToHistory, true);

  // Ring buffer caps size at maxLength
  const ring = new SequenceRingBuffer(3);
  for (let i = 0; i < 5; i += 1) {
    ring.push({ landmarks: [makeHand()], handedness: [], timestamp: i });
  }
  assert.equal(ring.size(), 3);
  ring.clear();
  assert.equal(ring.size(), 0);
});

// ============================================================================
// 3. CAMERA PERMISSIONS & CLEANUP
// ============================================================================

test('CameraHandTracker reports permission errors cleanly and releases camera tracks on stop/dispose', async () => {
  const originalNavigator = globalThis.navigator;
  const originalPerf = globalThis.performance;

  let trackStoppedCount = 0;
  const fakeTrack = {
    kind: 'video',
    readyState: 'live',
    onended: null as null | (() => void),
    getSettings: () => ({ deviceId: 'cam-1' }),
    stop: () => {
      trackStoppedCount += 1;
      fakeTrack.readyState = 'ended';
    },
  };
  const fakeStream = {
    active: true,
    getTracks: () => [fakeTrack],
    getVideoTracks: () => [fakeTrack],
  };

  let shouldDenyPermission = true;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        enumerateDevices: async () => [{ kind: 'videoinput', deviceId: 'cam-1', label: 'Cam' }],
        getUserMedia: async () => {
          if (shouldDenyPermission) {
            const err = new Error('Permission denied');
            err.name = 'NotAllowedError';
            throw err;
          }
          return fakeStream;
        },
      },
    },
  });

  try {
    const errors: Array<{ kind: string; title: string } | null> = [];
    const statuses: string[] = [];

    // 1. Permission Denied flow
    const tracker = new CameraHandTracker({
      onError: (e) => errors.push(e),
      onStatusChange: (s) => statuses.push(s),
    });
    // Pre-seed a dummy handLandmarker to isolate getUserMedia permission & track cleanup
    (tracker as unknown as { handLandmarker: { close: () => void } }).handLandmarker = {
      close: () => {},
    };

    const fakeVideoEl = { srcObject: null as unknown, play: async () => {} } as unknown as HTMLVideoElement;
    tracker.attachElements(fakeVideoEl, null);

    await tracker.start();
    assert.equal(tracker.getStatus(), 'error');
    const lastErr = errors[errors.length - 1];
    assert.ok(lastErr);
    assert.equal(lastErr.kind, 'permission-denied');

    // 2. Grant permission & verify track cleanup on stop() and dispose()
    shouldDenyPermission = false;
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = () => 42;
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = () => {};

    await tracker.start();
    assert.equal(tracker.getStatus(), 'streaming');
    assert.equal((fakeVideoEl as unknown as { srcObject: unknown }).srcObject, fakeStream);

    tracker.stop();
    assert.equal(trackStoppedCount, 1);
    assert.equal((fakeVideoEl as unknown as { srcObject: unknown }).srcObject, null);
    assert.equal(tracker.getStatus(), 'idle');

    // Start again and verify dispose() (page exit) releases tracks and closes landmarker
    let landmarkerClosed = false;
    (tracker as unknown as { handLandmarker: { close: () => void } }).handLandmarker = {
      close: () => {
        landmarkerClosed = true;
      },
    };
    await tracker.start();
    tracker.dispose();
    assert.equal(trackStoppedCount, 2);
    assert.equal(landmarkerClosed, true);
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    if (originalPerf) {
      Object.defineProperty(globalThis, 'performance', { configurable: true, value: originalPerf });
    }
  }
});

// ============================================================================
// 4. SPEECH PLAYBACK CONTROLS
// ============================================================================

test('speech.ts supports voice prioritization, speak, pause, resume, stop, and fallbacks', () => {
  const originalWindow = globalThis.window;
  const originalUtterance = (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;

  const calls: string[] = [];
  let speaking = false;
  let paused = false;

  const mockVoices = [
    { name: 'Remote FR', lang: 'fr-FR', localService: false, voiceURI: 'fr-1' },
    { name: 'Local EN', lang: 'en-US', localService: true, voiceURI: 'en-local' },
  ] as SpeechSynthesisVoice[];

  class MockUtterance {
    text: string;
    rate = 1;
    pitch = 1;
    lang = 'en-US';
    voice: SpeechSynthesisVoice | null = null;
    onstart?: () => void;
    onpause?: () => void;
    onresume?: () => void;
    onend?: () => void;
    onerror?: () => void;
    constructor(text: string) {
      this.text = text;
    }
  }

  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: MockUtterance,
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      speechSynthesis: {
        get speaking() {
          return speaking;
        },
        get paused() {
          return paused;
        },
        getVoices: () => mockVoices,
        cancel: () => {
          calls.push('cancel');
          speaking = false;
          paused = false;
        },
        speak: (u: MockUtterance) => {
          calls.push(`speak:${u.text}:${u.voice?.voiceURI ?? 'default'}`);
          speaking = true;
          paused = false;
          u.onstart?.();
        },
        pause: () => {
          calls.push('pause');
          paused = true;
        },
        resume: () => {
          calls.push('resume');
          paused = false;
        },
      },
    },
  });

  try {
    const emptyRes = speakTextDetailed('   ');
    assert.equal(emptyRes.started, false);

    const sortedVoices = getAllVoices();
    assert.equal(sortedVoices[0].voiceURI, 'en-local');

    const res = speakTextDetailed('Hello friend', { lang: 'en-US' });
    assert.equal(res.started, true);
    assert.equal(res.voiceMatched, true);
    assert.ok(calls.includes('speak:Hello friend:en-local'));

    assert.equal(pauseSpeech(), true);
    assert.equal(resumeSpeech(), true);
    assert.equal(stopSpeech(), true);
    assert.ok(calls.includes('pause'));
    assert.ok(calls.includes('resume'));
    assert.ok(calls.includes('cancel'));
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: originalUtterance,
    });
  }
});

// ============================================================================
// 5. TEXT-TO-SIGN MATCHING (NEVER INVENTS TRANSLATIONS)
// ============================================================================

test('matchTextToSigns matches verified tokens in order and never invents unsupported words', () => {
  const complete = matchTextToSigns('Hello friend');
  assert.equal(complete.matched.length, 2);
  assert.deepEqual(complete.unsupported, []);

  const unsupported = matchTextToSigns('quantum rocket');
  assert.equal(unsupported.matched.length, 0);
  assert.deepEqual(unsupported.unsupported, ['quantum', 'rocket']);
});

// ============================================================================
// 6. SECURITY HYGIENE & SUPABASE RLS POLICY VERIFICATION
// ============================================================================

test('Frontend code never contains service_role keys or database secrets and RLS protects user tables', () => {
  const rootFrontendFiles = collectFiles(path.resolve('src'), ['.ts', '.tsx']);
  const decoupledFrontendFiles = collectFiles(path.resolve('SignSpeak/frontend/src'), ['.js', '.jsx']);
  const allFrontendFiles = [...rootFrontendFiles, ...decoupledFrontendFiles];

  assert.ok(allFrontendFiles.length > 20);
  for (const filePath of allFrontendFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.equal(
      content.includes('SUPABASE_SERVICE_ROLE_KEY'),
      false,
      `Forbidden SUPABASE_SERVICE_ROLE_KEY reference found in ${filePath}`
    );
    assert.equal(
      content.includes('service_role'),
      false,
      `Forbidden service_role reference found in ${filePath}`
    );
  }

  const migrationSql = fs.readFileSync(
    path.resolve('supabase/migrations/001_initial_schema.sql'),
    'utf-8'
  );
  for (const table of [
    'public.profiles',
    'public.gestures',
    'public.learning_progress',
    'public.quiz_results',
    'public.translation_history',
  ]) {
    assert.ok(migrationSql.includes(`alter table ${table} enable row level security`));
  }
  assert.ok(migrationSql.includes('auth.uid() = id'));
  assert.ok(migrationSql.includes('auth.uid() = user_id'));
  assert.ok(migrationSql.includes('to anon, authenticated'));
  assert.equal(migrationSql.includes('video_blob'), false);
});
