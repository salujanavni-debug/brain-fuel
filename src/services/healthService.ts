import api from './api';

export interface HealthPayload {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  subsystems: {
    api: string;
    ai_pipeline: string;
    database: string;
  };
}

export interface HealthResult {
  data: HealthPayload;
  status: number;
  latencyMs: number;
}

export async function fetchHealthStatus(): Promise<HealthResult> {
  const startedAt = performance.now();
  const response = await api.get<HealthPayload>('/api/health');
  const latencyMs = performance.now() - startedAt;

  return {
    data: response.data,
    status: response.status,
    latencyMs,
  };
}
