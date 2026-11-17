import { useCallback, useEffect, useState } from 'react';
import { fetchHealthStatus, HealthPayload } from '../services/healthService';

export interface BackendHealthState {
  health: HealthPayload | null;
  httpStatus: number | null;
  latencyMs: number | null;
  loading: boolean;
  error: string | null;
  checkedAt: string | null;
  refetch: () => Promise<void>;
}

export function useBackendHealth(): BackendHealthState {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHealthStatus();
      setHealth(result.data);
      setHttpStatus(result.status);
      setLatencyMs(result.latencyMs);
      setCheckedAt(new Date().toISOString());
    } catch (err: unknown) {
      const apiError = err as { status?: number | null; message?: string };
      setHealth(null);
      setHttpStatus(apiError?.status ?? null);
      setLatencyMs(null);
      setError(apiError?.message || 'Backend health check failed');
      setCheckedAt(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    health,
    httpStatus,
    latencyMs,
    loading,
    error,
    checkedAt,
    refetch: checkHealth,
  };
}
