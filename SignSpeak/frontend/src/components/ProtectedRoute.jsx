import { Navigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-4xl items-center justify-center px-4 py-16">
        <div className="flex items-center gap-3 rounded-3xl border border-[#EDE9FE] bg-white px-6 py-4 text-sm font-bold text-[#292544] shadow-2xs">
          <Lock className="h-4 w-4 animate-pulse text-[#6D28D9]" aria-hidden="true" />
          <span>Checking your SignSpeak session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirectTarget = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth?redirect=${redirectTarget}`} replace />;
  }

  return <>{children}</>;
}
