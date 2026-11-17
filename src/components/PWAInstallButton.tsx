import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <Button
        onClick={() => void install()}
        variant="secondary"
        size="sm"
        aria-label="Install SignSpeak offline app"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>Install App</span>
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button
          onClick={() => setShowIOSGuide(true)}
          variant="outline"
          size="sm"
          aria-label="Install SignSpeak on iOS"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>Install on iOS</span>
        </Button>

        <Modal
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Install SignSpeak on iPhone or iPad"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-sm text-[#292544]">
            <p className="leading-relaxed">
              Install SignSpeak to your home screen for quick offline access to Quick Messages,
              Personal Custom Messages, and Two-Way Communication:
            </p>
            <ol className="list-decimal space-y-2 pl-5 font-semibold">
              <li>Tap the Share icon in the Safari toolbar.</li>
              <li>Scroll down and choose &ldquo;Add to Home Screen&rdquo;.</li>
              <li>Tap &ldquo;Add&rdquo; to save SignSpeak as an app.</li>
            </ol>
            <div className="pt-2">
              <Button variant="primary" size="md" className="w-full" onClick={() => setShowIOSGuide(false)}>
                Got it
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return null;
}
