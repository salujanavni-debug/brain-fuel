import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'signspeak_a11y_v1';

function getInitialSettings() {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (typeof window === 'undefined') {
    return { highContrast: false, textSize: 'normal', reducedMotion: false };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        highContrast: Boolean(parsed.highContrast),
        textSize:
          parsed.textSize === 'large' || parsed.textSize === 'xlarge'
            ? parsed.textSize
            : 'normal',
        reducedMotion:
          typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : prefersReduced,
      };
    }
  } catch {
    // Ignore storage read error
  }

  return {
    highContrast: false,
    textSize: 'normal',
    reducedMotion: prefersReduced,
  };
}

const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(getInitialSettings);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.textSize = settings.textSize;
    root.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage write error
    }
  }, [settings]);

  const toggleHighContrast = () =>
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));

  const setTextSize = (textSize) => setSettings((prev) => ({ ...prev, textSize }));

  const toggleReducedMotion = () =>
    setSettings((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }));

  const resetAccessibility = () =>
    setSettings({ highContrast: false, textSize: 'normal', reducedMotion: false });

  return (
    <AccessibilityContext.Provider
      value={{
        ...settings,
        toggleHighContrast,
        setTextSize,
        toggleReducedMotion,
        resetAccessibility,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return ctx;
}
