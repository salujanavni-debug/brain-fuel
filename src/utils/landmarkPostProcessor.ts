import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { HandednessSummary } from '../services/cameraHandTracker';

export interface PrototypeGestureItem {
  id: string;
  label: string;
  gesture_type: 'static' | 'dynamic';
  expected_hands: string;
  isl_verification_status: string;
}

export const ISL_PROTOTYPE_DISCLAIMER =
  'Initial prototype vocabulary only — NOT automatically verified Indian Sign Language (ISL) translations. Validate gesture meaning, hand orientation, movement, and grammar with qualified ISL resources or Deaf community reviewers.';

export const PROTOTYPE_VOCABULARY: PrototypeGestureItem[] = [
  {
    id: 'hello',
    label: 'Hello',
    gesture_type: 'dynamic',
    expected_hands: '1 hand (dynamic wave)',
    isl_verification_status: 'unverified_prototype',
  },
  {
    id: 'thank-you',
    label: 'Thank You',
    gesture_type: 'dynamic',
    expected_hands: '1 hand (chin-forward trajectory)',
    isl_verification_status: 'unverified_prototype',
  },
  {
    id: 'yes',
    label: 'Yes',
    gesture_type: 'dynamic',
    expected_hands: '1 hand (nodding fist motion)',
    isl_verification_status: 'unverified_prototype',
  },
  {
    id: 'no',
    label: 'No',
    gesture_type: 'dynamic',
    expected_hands: '1 hand (finger tap/shake motion)',
    isl_verification_status: 'unverified_prototype',
  },
  {
    id: 'help',
    label: 'Help',
    gesture_type: 'dynamic',
    expected_hands: '2 hands (base palm + lifting fist)',
    isl_verification_status: 'unverified_prototype',
  },
  {
    id: 'stop',
    label: 'Stop',
    gesture_type: 'static',
    expected_hands: '1 or 2 hands (open raised palm hold)',
    isl_verification_status: 'unverified_prototype',
  },
  {
    id: 'please',
    label: 'Please',
    gesture_type: 'dynamic',
    expected_hands: '1 hand (circular chest motion)',
    isl_verification_status: 'unverified_prototype',
  },
  {
    id: 'love',
    label: 'I Love You',
    gesture_type: 'static',
    expected_hands: '1 hand (thumb, index, pinky extended)',
    isl_verification_status: 'unverified_prototype',
  },
];

export interface SequenceFrameEntry {
  landmarks: NormalizedLandmark[][];
  handedness: HandednessSummary[];
  timestamp: number;
}

/**
 * Normalize a single 21-point hand relative to wrist (index 0) and palm scale.
 * Mirrors backend/app/ml/features.py for exact feature parity.
 */
export function normalizeHandLandmarks(hand: NormalizedLandmark[]): number[] {
  if (hand.length !== 21) {
    throw new Error(`Expected 21 hand landmarks, received ${hand.length}.`);
  }

  const wrist = hand[0];
  const centered = hand.map((pt) => ({
    x: pt.x - wrist.x,
    y: pt.y - wrist.y,
    z: (pt.z ?? 0) - (wrist.z ?? 0),
  }));

  const mcp = centered[9];
  const palmDist = Math.hypot(mcp.x, mcp.y, mcp.z);
  const maxRadius = centered.reduce(
    (maxVal, pt) => Math.max(maxVal, Math.hypot(pt.x, pt.y, pt.z)),
    0
  );
  const scale = Math.max(palmDist, maxRadius, 1e-6);

  const flat: number[] = [];
  for (const pt of centered) {
    flat.push(pt.x / scale, pt.y / scale, pt.z / scale);
  }
  return flat;
}

/**
 * Rolling ring buffer storing recent MediaPipe landmark frames for dynamic temporal signs.
 */
export class SequenceRingBuffer {
  private readonly maxLength: number;
  private frames: SequenceFrameEntry[] = [];

  constructor(maxLength = 24) {
    this.maxLength = maxLength;
  }

  public push(frame: SequenceFrameEntry): void {
    if (!frame.landmarks || frame.landmarks.length === 0) return;
    this.frames.push(frame);
    if (this.frames.length > this.maxLength) {
      this.frames.shift();
    }
  }

  public getFrames(): SequenceFrameEntry[] {
    return [...this.frames];
  }

  public size(): number {
    return this.frames.length;
  }

  public clear(): void {
    this.frames = [];
  }
}

export interface RawClassifierOutcome {
  recognized: boolean;
  recognized_gesture: string | null;
  predicted_label: string | null;
  confidence: number;
  recognition_status: 'recognized' | 'low_confidence' | 'unsupported' | 'model_unavailable';
  gesture_type?: string | null;
  unknown_detected?: boolean;
  low_confidence?: boolean;
}

export type PostProcessDecisionKind =
  | 'accepted'
  | 'duplicate-suppressed'
  | 'smoothing'
  | 'low-confidence'
  | 'unknown'
  | 'model-untrained';

export interface PostProcessDecision {
  kind: PostProcessDecisionKind;
  emitToHistory: boolean;
  label: string | null;
  gestureId: string | null;
  confidence: number;
  gestureType: string | null;
  message: string;
}

interface BufferedVote {
  gestureId: string | null;
  label: string | null;
  confidence: number;
  status: RawClassifierOutcome['recognition_status'];
  gestureType: string | null;
  timestamp: number;
}

/**
 * Applies confidence thresholding, temporal smoothing (sliding window consensus),
 * unknown gesture detection, low-confidence warning, and duplicate suppression.
 */
export class PredictionPostProcessor {
  private readonly windowSize: number;
  private readonly minConsensus: number;
  private readonly duplicateCooldownMs: number;
  private confidenceThreshold: number;
  private votes: BufferedVote[] = [];
  private lastEmitted: { gestureId: string; timestamp: number } | null = null;

  constructor(options?: {
    windowSize?: number;
    minConsensus?: number;
    duplicateCooldownMs?: number;
    confidenceThreshold?: number;
  }) {
    this.windowSize = options?.windowSize ?? 5;
    this.minConsensus = options?.minConsensus ?? 3;
    this.duplicateCooldownMs = options?.duplicateCooldownMs ?? 2500;
    this.confidenceThreshold = options?.confidenceThreshold ?? 0.7;
  }

  public setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0.3, Math.min(0.99, threshold));
  }

  public reset(): void {
    this.votes = [];
    this.lastEmitted = null;
  }

  public process(
    outcome: RawClassifierOutcome,
    nowMs: number = Date.now(),
    requireTemporalConsensus = true
  ): PostProcessDecision {
    if (outcome.recognition_status === 'model_unavailable') {
      return {
        kind: 'model-untrained',
        emitToHistory: false,
        label: null,
        gestureId: null,
        confidence: 0,
        gestureType: outcome.gesture_type ?? null,
        message: 'Gesture classification model is not trained yet.',
      };
    }

    if (outcome.unknown_detected || outcome.recognition_status === 'unsupported') {
      this.votes.push({
        gestureId: null,
        label: null,
        confidence: outcome.confidence,
        status: 'unsupported',
        gestureType: null,
        timestamp: nowMs,
      });
      if (this.votes.length > this.windowSize) this.votes.shift();
      return {
        kind: 'unknown',
        emitToHistory: false,
        label: null,
        gestureId: null,
        confidence: outcome.confidence,
        gestureType: null,
        message: 'Unknown or neutral hand pose detected — no supported gesture matched.',
      };
    }

    if (
      !outcome.recognized ||
      !outcome.recognized_gesture ||
      !outcome.predicted_label ||
      outcome.confidence < this.confidenceThreshold
    ) {
      this.votes.push({
        gestureId: null,
        label: null,
        confidence: outcome.confidence,
        status: 'low_confidence',
        gestureType: outcome.gesture_type ?? null,
        timestamp: nowMs,
      });
      if (this.votes.length > this.windowSize) this.votes.shift();
      return {
        kind: 'low-confidence',
        emitToHistory: false,
        label: null,
        gestureId: null,
        confidence: outcome.confidence,
        gestureType: outcome.gesture_type ?? null,
        message: `Low-confidence frame (${Math.round(outcome.confidence * 100)}% < ${Math.round(this.confidenceThreshold * 100)}% threshold). Hold steady or adjust lighting.`,
      };
    }

    this.votes.push({
      gestureId: outcome.recognized_gesture,
      label: outcome.predicted_label,
      confidence: outcome.confidence,
      status: outcome.recognition_status,
      gestureType: outcome.gesture_type ?? null,
      timestamp: nowMs,
    });
    if (this.votes.length > this.windowSize) {
      this.votes.shift();
    }

    const validVotes = this.votes.filter(
      (v) => v.gestureId === outcome.recognized_gesture
    );
    const consensusTarget = requireTemporalConsensus ? this.minConsensus : 1;

    if (validVotes.length < consensusTarget) {
      return {
        kind: 'smoothing',
        emitToHistory: false,
        label: outcome.predicted_label,
        gestureId: outcome.recognized_gesture,
        confidence: outcome.confidence,
        gestureType: outcome.gesture_type ?? null,
        message: `Temporal smoothing: verifying '${outcome.predicted_label}' (${validVotes.length}/${consensusTarget} consistent frames)...`,
      };
    }

    const avgConfidence =
      validVotes.reduce((sum, v) => sum + v.confidence, 0) / validVotes.length;

    if (
      this.lastEmitted &&
      this.lastEmitted.gestureId === outcome.recognized_gesture &&
      nowMs - this.lastEmitted.timestamp < this.duplicateCooldownMs
    ) {
      return {
        kind: 'duplicate-suppressed',
        emitToHistory: false,
        label: outcome.predicted_label,
        gestureId: outcome.recognized_gesture,
        confidence: avgConfidence,
        gestureType: outcome.gesture_type ?? null,
        message: `Holding '${outcome.predicted_label}' — duplicate history entry suppressed.`,
      };
    }

    this.lastEmitted = {
      gestureId: outcome.recognized_gesture,
      timestamp: nowMs,
    };

    return {
      kind: 'accepted',
      emitToHistory: true,
      label: outcome.predicted_label,
      gestureId: outcome.recognized_gesture,
      confidence: avgConfidence,
      gestureType: outcome.gesture_type ?? null,
      message: `Confirmed '${outcome.predicted_label}' (${Math.round(avgConfidence * 100)}% smoothed confidence).`,
    };
  }
}
