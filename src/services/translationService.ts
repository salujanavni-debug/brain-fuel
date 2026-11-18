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

export interface BatchRecognitionResponse {
  frames_processed: number;
  recognized: boolean;
  recognized_gesture: string | null;
  predicted_label: string | null;
  confidence: number;
  timestamp: string;
  recognition_status: 'recognized' | 'low_confidence' | 'unsupported' | 'model_unavailable';
  classifier_mode: string;
  model_trained?: boolean;
  isl_disclaimer?: string;
  detail: string;
  frame_statuses: string[];
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

export interface ApiGestureSummary {
  id: string;
  label: string;
  meaning: string;
  category: string;
  difficulty: string;
}

export interface ApiGestureDetail extends ApiGestureSummary {
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

export interface LearningCategoryItem {
  id: string;
  name: string;
  description: string;
  gesture_count: number;
}

export interface ApiQuizQuestion {
  id: string;
  gesture_id: string;
  category: string;
  prompt: string;
  options: string[];
}

export interface ApiQuizSubmitAnswer {
  question_id: string;
  selected_option: string;
}

export interface ApiQuizSubmitResponse {
  total_answered: number;
  correct_count: number;
  score_percentage: number;
  results: Array<{
    question_id: string;
    selected_option: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
  }>;
}

export interface ApiEmergencyMessage {
  id: string;
  message: string;
  gesture_id: string;
  urgency: string;
  category: string;
  speech_rate: number;
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

export async function recognizeLandmarkBatch(
  frames: SequenceFrameEntry[]
): Promise<BatchRecognitionResponse> {
  const response = await api.post<BatchRecognitionResponse>('/api/recognition/batch', { frames });
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

export async function fetchGesturesFromApi(params?: {
  category?: string;
  search?: string;
}): Promise<{ total: number; category: string | null; gestures: ApiGestureSummary[] }> {
  const response = await api.get<{
    total: number;
    category: string | null;
    gestures: ApiGestureSummary[];
  }>('/api/gestures', { params });
  return response.data;
}

export async function fetchGestureDetailFromApi(gestureId: string): Promise<ApiGestureDetail> {
  const response = await api.get<ApiGestureDetail>(
    `/api/gestures/${encodeURIComponent(gestureId)}`
  );
  return response.data;
}

export async function fetchLearningCategories(): Promise<{
  total: number;
  categories: LearningCategoryItem[];
}> {
  const response = await api.get<{ total: number; categories: LearningCategoryItem[] }>(
    '/api/learning/categories'
  );
  return response.data;
}

export async function fetchLearningGestures(params?: {
  category?: string;
  difficulty?: string;
  search?: string;
}): Promise<{ total: number; gestures: ApiGestureDetail[] }> {
  const response = await api.get<{ total: number; gestures: ApiGestureDetail[] }>(
    '/api/learning/gestures',
    { params }
  );
  return response.data;
}

export async function fetchQuizQuestionsFromApi(payload?: {
  category?: string;
  limit?: number;
}): Promise<{ total_questions: number; questions: ApiQuizQuestion[] }> {
  const response = await api.post<{ total_questions: number; questions: ApiQuizQuestion[] }>(
    '/api/learning/quiz',
    payload || {}
  );
  return response.data;
}

export async function submitQuizAnswersToApi(
  answers: ApiQuizSubmitAnswer[]
): Promise<ApiQuizSubmitResponse> {
  const response = await api.post<ApiQuizSubmitResponse>('/api/learning/quiz/submit', {
    answers,
  });
  return response.data;
}

export async function fetchEmergencyMessagesFromApi(): Promise<{
  total: number;
  messages: ApiEmergencyMessage[];
}> {
  const response = await api.get<{ total: number; messages: ApiEmergencyMessage[] }>(
    '/api/emergency/messages'
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
