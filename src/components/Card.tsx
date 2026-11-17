import { ReactNode } from 'react';

type CardTone = 'default' | 'lavender' | 'blue' | 'mint' | 'peach';

interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  className?: string;
  padding?: string;
}

const TONE_CLASSES: Record<CardTone, string> = {
  default: 'bg-white border border-[#EDE9FE]',
  lavender: 'bg-gradient-to-br from-[#EDE9FE] to-white border border-[#DDD6FE]',
  blue: 'bg-gradient-to-br from-[#BFDBFE]/55 to-white border border-[#BFDBFE]',
  mint: 'bg-gradient-to-br from-[#A7F3D0]/55 to-white border border-[#A7F3D0]',
  peach: 'bg-gradient-to-br from-[#FED7AA]/55 to-white border border-[#FED7AA]',
};

export function Card({
  children,
  tone = 'default',
  className = '',
  padding = 'p-6 sm:p-7',
}: CardProps) {
  return (
    <div
      className={`rounded-3xl shadow-[0_12px_32px_-16px_rgba(41,37,68,0.14)] transition-all duration-200 ${TONE_CLASSES[tone]} ${padding} ${className}`}
    >
      {children}
    </div>
  );
}
