import api from './api';
import { LandmarkDetectionPayload } from '../services/cameraHandTracker';
import { PrototypeGestureItem, SequenceFrameEntry } from '../utils/landmarkPostProcessor';

export interface RecognitionResponse {
  recognized: boolean;
  recognized_gesture: string | null;
  predicted_label: string | null;
  confidence: number;
  timestamp: string;
  recognition_status: 'recognized' | 'low_confidence' | 'unsupported' | 'model_unavailable';
  classifier_mode: string;
  model_trained?: boolean;
  gesture_type?: string | null;
  unknown_detected?: boolean;
  low_confidence?: boolean;
  isl_disclaimer?: string;
  detail: string;
}

export interface RecognitionStatusInfo {
  model_trained: boolean;
  recognition_status: 'recognized' | 'low_confidence' | 'unsupported' | 'model_unavailable';
  classifier_mode: string;
  confidence_threshold: number;
  temporal_window_frames: number;
  isl_disclaimer: string;
  message: string;
  model_metadata: Record<string, unknown> | null;
  vocabulary: PrototypeGestureItem[];
  workflow_steps: string[];
}

export interface DatasetSamplePayload {
  gesture_id: string;
  gesture_type: 'static' | 'dynamic';
  signer_id: string;
  session_id: string;
  isl_verified: boolean;
  notes: string;
  frames: SequenceFrameEntry[];
}

export interface DatasetSampleSavedInfo {
  saved: boolean;
  sample_id: string;
  gesture_id: string;
  frames_saved: number;
  file_path: string;
  isl_disclaimer: string;
}

export async function getRecognitionStatus(): Promise<RecognitionStatusInfo> {
  const response = await api.get<RecognitionStatusInfo>('/api/recognition/status');
  return response.data;
}

export async function recognizeLandmarks(
  landmarksPayload: LandmarkDetectionPayload,
  options?: {
    sequence?: SequenceFrameEntry[];
    confidenceThreshold?: number;
  }
): Promise<RecognitionResponse> {
  const response = await api.post<RecognitionResponse>('/api/recognition/predict', {
    landmarks: landmarksPayload.landmarks,
    handedness: landmarksPayload.handedness,
    timestamp: landmarksPayload.timestamp,
    ...(options?.sequence && options.sequence.length > 0
      ? { sequence: options.sequence }
      : {}),
    ...(typeof options?.confidenceThreshold === 'number'
      ? { confidence_threshold: options.confidenceThreshold }
      : {}),
  });
  return response.data;
}

export async function submitDatasetSample(
  payload: DatasetSamplePayload
): Promise<DatasetSampleSavedInfo> {
  const response = await api.post<DatasetSampleSavedInfo>(
    '/api/recognition/dataset/samples',
    payload
  );
  return response.data;
}

export interface TextToSignGestureDetail {
  id: string;
  label: string;
  meaning: string;
  category: string;
  difficulty: string;
  handshape: string;
  movement: string;
  tip: string;
  aliases: string[];
  demonstration_assets: {
    asset_type: string;
    identifier: string;
    description: string;
  }[];
}

export interface TextToSignTokenItem {
  token: string;
  supported: boolean;
  gesture: TextToSignGestureDetail | null;
}

export interface TextToSignResponse {
  input_text: string;
  status: 'complete' | 'partial' | 'unsupported';
  demonstration_mode?: string;
  grammar_notice?: string;
  matched_count: number;
  unsupported_tokens: string[];
  demonstration_sequence: TextToSignGestureDetail[];
  tokens: TextToSignTokenItem[];
}

export async function requestTextToSign(text: string): Promise<TextToSignResponse> {
  const response = await api.post<TextToSignResponse>('/api/translation/text-to-sign', { text });
  return response.data;
}
