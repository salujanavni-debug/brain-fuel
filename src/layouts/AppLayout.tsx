import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AccessibilityModal } from '../components/AccessibilityModal';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { OfflineBanner } from '../components/OfflineBanner';
import { useBackendHealth } from '../hooks/useBackendHealth';

export function AppLayout() {
  const healthState = useBackendHealth();
  const [a11yOpen, setA11yOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFCF8] text-[#292544]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-[#292544] focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>

      <Navbar onOpenAccessibility={() => setA11yOpen(true)} />
      <OfflineBanner onReconnect={() => void healthState.refetch()} />

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet context={healthState} />
      </main>

      <Footer onOpenAccessibility={() => setA11yOpen(true)} />
      <AccessibilityModal open={a11yOpen} onClose={() => setA11yOpen(false)} />
    </div>
  );
}
