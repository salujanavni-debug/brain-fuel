import { Eye, RotateCcw, Sparkles, Type } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { useAccessibility } from '../context/AccessibilityContext';

const TEXT_SIZE_OPTIONS = [
  { value: 'normal', label: 'Standard', hint: '16px base' },
  { value: 'large', label: 'Large', hint: '18px base' },
  { value: 'xlarge', label: 'Extra Large', hint: '20px base' },
];

export function AccessibilityModal({ open, onClose }) {
  const {
    highContrast,
    textSize,
    reducedMotion,
    toggleHighContrast,
    setTextSize,
    toggleReducedMotion,
    resetAccessibility,
  } = useAccessibility();

  return (
    <Modal open={open} onClose={onClose} title="Accessibility & Display Preferences" maxWidth="max-w-lg">
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-[#292544]/80">
          Customize text scale, visual contrast, and animation speed. Preferences are saved locally
          in your browser and work offline.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#292544]">
            <Type className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />
            <span>Text Size</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5" role="group" aria-label="Text size options">
            {TEXT_SIZE_OPTIONS.map((option) => {
              const active = textSize === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTextSize(option.value)}
                  aria-pressed={active}
                  className={`flex min-h-[54px] flex-col items-center justify-center rounded-2xl border-2 px-3 py-2 text-center transition-colors cursor-pointer ${
                    active
                      ? 'border-[#7C3AED] bg-[#EDE9FE] text-[#292544]'
                      : 'border-[#EDE9FE] bg-white text-[#292544]/80 hover:border-[#A78BFA]'
                  }`}
                >
                  <span className="text-sm font-extrabold">{option.label}</span>
                  <span className="text-[11px] font-semibold opacity-70">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 border-t border-[#EDE9FE] pt-4">
          <button
            type="button"
            onClick={toggleHighContrast}
            aria-pressed={highContrast}
            className={`flex w-full min-h-[60px] items-center justify-between gap-4 rounded-2xl border-2 px-4 py-3 text-left transition-colors cursor-pointer ${
              highContrast
                ? 'border-[#09090B] bg-[#09090B] text-white'
                : 'border-[#EDE9FE] bg-white text-[#292544] hover:border-[#A78BFA]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-extrabold">High Contrast Mode</p>
                <p className={`text-xs ${highContrast ? 'text-white/80' : 'text-[#292544]/70'}`}>
                  Sharper borders and darker ink for low-vision legibility
                </p>
              </div>
            </div>
            <span className="rounded-xl bg-white/15 px-3 py-1 text-xs font-extrabold">
              {highContrast ? 'On' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleReducedMotion}
            aria-pressed={reducedMotion}
            className={`flex w-full min-h-[60px] items-center justify-between gap-4 rounded-2xl border-2 px-4 py-3 text-left transition-colors cursor-pointer ${
              reducedMotion
                ? 'border-[#7C3AED] bg-[#EDE9FE] text-[#292544]'
                : 'border-[#EDE9FE] bg-white text-[#292544] hover:border-[#A78BFA]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-[#6D28D9]" aria-hidden="true" />
              <div>
                <p className="text-sm font-extrabold">Reduced Motion</p>
                <p className="text-xs text-[#292544]/75">
                  Minimizes animations and transitions across the interface
                </p>
              </div>
            </div>
            <span className="rounded-xl bg-white px-3 py-1 text-xs font-extrabold text-[#292544]">
              {reducedMotion ? 'On' : 'Off'}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDE9FE] pt-4">
          <Button variant="ghost" size="sm" onClick={resetAccessibility}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Reset Defaults</span>
          </Button>
          <Button variant="primary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
