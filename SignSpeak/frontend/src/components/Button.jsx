import { Link } from 'react-router-dom';

const VARIANT_CLASSES = {
  primary:
    'bg-[#A78BFA] text-white hover:bg-[#906EF7] shadow-[0_8px_20px_-6px_rgba(167,139,250,0.65)] focus-visible:outline-[#7C3AED]',
  secondary:
    'bg-[#EDE9FE] text-[#292544] hover:bg-[#DDD6FE] focus-visible:outline-[#A78BFA]',
  mint: 'bg-[#A7F3D0] text-[#292544] hover:bg-[#86EFAC] focus-visible:outline-[#10B981]',
  peach: 'bg-[#FED7AA] text-[#292544] hover:bg-[#FDBA74] focus-visible:outline-[#F97316]',
  blue: 'bg-[#BFDBFE] text-[#292544] hover:bg-[#93C5FD] focus-visible:outline-[#3B82F6]',
  outline:
    'border-2 border-[#EDE9FE] bg-white text-[#292544] hover:border-[#A78BFA] hover:bg-[#EDE9FE]/40 focus-visible:outline-[#A78BFA]',
  ghost: 'text-[#292544]/80 hover:bg-[#EDE9FE]/60 hover:text-[#292544] focus-visible:outline-[#A78BFA]',
  danger:
    'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-[0_8px_20px_-6px_rgba(220,38,38,0.45)] focus-visible:outline-[#DC2626]',
};

const SIZE_CLASSES = {
  sm: 'min-h-[38px] px-4 py-2 text-sm rounded-xl',
  md: 'min-h-[44px] px-5 py-2.5 text-sm rounded-2xl',
  lg: 'min-h-[52px] px-7 py-3.5 text-base rounded-2xl',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  type = 'button',
  className = '',
  disabled = false,
  ...rest
}) {
  const classes = `inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55 whitespace-nowrap cursor-pointer ${
    VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary
  } ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={classes} {...rest}>
      {children}
    </button>
  );
}
