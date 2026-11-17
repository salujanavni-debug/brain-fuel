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

export async function submitDatasetSample(payload) {
  const response = await api.post('/api/recognition/dataset/samples', payload);
  return response.data;
}

export async function requestTextToSign(text) {
  const response = await api.post('/api/translation/text-to-sign', { text });
  return response.data;
}
