import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-xl' }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#292544]/40 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signspeak-modal-title"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} overflow-hidden rounded-3xl border border-[#EDE9FE] bg-[#FFFCF8] shadow-[0_24px_60px_-16px_rgba(41,37,68,0.3)]`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#EDE9FE] bg-white px-6 py-4">
          <h3 id="signspeak-modal-title" className="text-lg font-bold text-[#292544]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#292544]/70 transition-colors hover:bg-[#EDE9FE] hover:text-[#292544]"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
