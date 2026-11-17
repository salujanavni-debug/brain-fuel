import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineBanner({ onReconnect }) {
  const { isOnline, lastChangedAt, swReady } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && lastChangedAt) {
      setShowReconnected(true);
      onReconnect?.();
      const timer = setTimeout(() => setShowReconnected(false), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline, lastChangedAt, onReconnect]);

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-b border-[#FB923C]/50 bg-[#FED7AA]/70 px-4 py-3 text-[#292544]"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-[#9A3412]" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-extrabold text-[#292544]">
                Offline Mode Active{swReady ? ' · App Shell Cached' : ''}
              </p>
              <p className="text-xs font-semibold text-[#292544]/85">
                Quick Messages, Custom Messages, Two-Way Text Communication, and local voice playback
                remain available. Online-only backend sign recognition is paused until internet returns.
              </p>
            </div>
          </div>
          <Link
            to="/quick-messages"
            className="inline-flex min-h-[40px] items-center rounded-xl bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#292544] shadow-xs transition-colors hover:bg-[#EDE9FE]"
          >
            Open Quick Messages
          </Link>
        </div>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-b border-[#34D399]/50 bg-[#A7F3D0]/70 px-4 py-2.5 text-[#292544]"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 text-xs font-bold">
          <Wifi className="h-4 w-4 shrink-0 text-[#047857]" aria-hidden="true" />
          <span>
            Internet connection restored. Online sign-language API features are available again (no
            camera footage or private messages were uploaded).
          </span>
        </div>
      </div>
    );
  }

  return null;
}
