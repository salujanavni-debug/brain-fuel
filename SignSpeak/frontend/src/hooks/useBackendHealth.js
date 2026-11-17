import { useCallback, useEffect, useState } from 'react';
import { fetchHealthStatus } from '../services/healthService';

export function useBackendHealth() {
  const [health, setHealth] = useState(null);
  const [httpStatus, setHttpStatus] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHealthStatus();
      setHealth(result.data);
      setHttpStatus(result.status);
      setLatencyMs(result.latencyMs);
      setCheckedAt(new Date().toISOString());
    } catch (err) {
      setHealth(null);
      setHttpStatus(err?.status ?? null);
      setLatencyMs(null);
      setError(err?.message || 'Backend health check failed');
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
