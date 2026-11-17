import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  variant?: 'spinner' | 'skeleton';
}

export function LoadingState({ label = 'Loading...', variant = 'spinner' }: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className="space-y-3" aria-busy="true" aria-label={label}>
        <div className="h-5 w-44 animate-pulse rounded-xl bg-[#EDE9FE]" />
        <div className="h-20 w-full animate-pulse rounded-2xl bg-[#EDE9FE]/70" />
        <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-[#BFDBFE]/50" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-8 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDE9FE] text-[#7C3AED]">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-[#292544]/80">{label}</p>
    </div>
  );
}
