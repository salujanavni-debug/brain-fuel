import api from './api';

export async function getRecognitionStatus() {
  const response = await api.get('/api/recognition/status');
  return response.data;
}

export async function recognizeLandmarks(landmarksPayload, options = {}) {
  const response = await api.post('/api/recognition/predict', {
    landmarks: landmarksPayload.landmarks,
    handedness: landmarksPayload.handedness,
    timestamp: landmarksPayload.timestamp,
    ...(options.sequence && options.sequence.length > 0
      ? { sequence: options.sequence }
      : {}),
    ...(typeof options.confidenceThreshold === 'number'
      ? { confidence_threshold: options.confidenceThreshold }
      : {}),
  });
  return response.data;
}

export async function recognizeLandmarkBatch(frames) {
  const response = await api.post('/api/recognition/batch', { frames });
  return response.data;
}

export async function submitDatasetSample(payload) {
  const response = await api.post('/api/recognition/dataset/samples', payload);
  return response.data;
}

export async function fetchGesturesFromApi(params) {
  const response = await api.get('/api/gestures', { params });
  return response.data;
}

export async function fetchGestureDetailFromApi(gestureId) {
  const response = await api.get(`/api/gestures/${encodeURIComponent(gestureId)}`);
  return response.data;
}

export async function fetchLearningCategories() {
  const response = await api.get('/api/learning/categories');
  return response.data;
}

export async function fetchLearningGestures(params) {
  const response = await api.get('/api/learning/gestures', { params });
  return response.data;
}

export async function fetchQuizQuestionsFromApi(payload = {}) {
  const response = await api.post('/api/learning/quiz', payload);
  return response.data;
}

export async function submitQuizAnswersToApi(answers) {
  const response = await api.post('/api/learning/quiz/submit', { answers });
  return response.data;
}

export async function fetchEmergencyMessagesFromApi() {
  const response = await api.get('/api/emergency/messages');
  return response.data;
}

export async function requestTextToSign(text) {
  const response = await api.post('/api/translation/text-to-sign', { text });
  return response.data;
}
