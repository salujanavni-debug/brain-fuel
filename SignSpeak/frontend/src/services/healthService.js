import api from './api';

export async function fetchHealthStatus() {
  const startedAt = performance.now();
  const response = await api.get('/api/health');
  const latencyMs = performance.now() - startedAt;

  return {
    data: response.data,
    status: response.status,
    latencyMs,
  };
}
