import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface StatusIndicatorProps {
  state: 'ok' | 'pending' | 'error';
  label: string;
}

export function StatusIndicator({ state, label }: StatusIndicatorProps) {
  const styles = {
    ok: {
      icon: CheckCircle2,
      textClass: 'text-[#047857]',
    },
    pending: {
      icon: Clock,
      textClass: 'text-[#7C3AED]',
    },
    error: {
      icon: AlertCircle,
      textClass: 'text-[#DC2626]',
    },
  };

  const config = styles[state];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${config.textClass}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
