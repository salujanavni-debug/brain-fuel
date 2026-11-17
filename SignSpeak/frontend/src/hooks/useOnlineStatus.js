import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastChangedAt, setLastChangedAt] = useState(null);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChangedAt(new Date().toISOString());
    };
    const handleOffline = () => {
      setIsOnline(false);
      setLastChangedAt(new Date().toISOString());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => setSwReady(true))
        .catch(() => setSwReady(false));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastChangedAt, swReady };
}
