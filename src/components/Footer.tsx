import { Link } from 'react-router-dom';

interface FooterProps {
  onOpenAccessibility?: () => void;
}

export function Footer({ onOpenAccessibility }: FooterProps) {
  return (
    <footer className="mt-16 border-t border-[#EDE9FE] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 text-lg font-extrabold text-[#292544]"
            >
              <span>SignSpeak</span>
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#292544]/75">
              Building accessible bridges between sign language, quick communication boards, and
              spoken conversation using privacy-first hand vision and human-first design.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#292544]">Communication Tools</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-[#292544]/75">
              <li>
                <Link to="/quick-messages" className="hover:text-[#7C3AED]">
                  Quick Messages
                </Link>
              </li>
              <li>
                <Link to="/communicate" className="hover:text-[#7C3AED]">
                  Two-Way Communication
                </Link>
              </li>
              <li>
                <Link to="/translator" className="hover:text-[#7C3AED]">
                  Sign Translator
                </Link>
              </li>
              <li>
                <Link to="/text-to-sign" className="hover:text-[#7C3AED]">
                  Text-to-Sign
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#292544]">Learning &amp; Support</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-[#292544]/75">
              <li>
                <Link to="/learn" className="hover:text-[#7C3AED]">
                  Learn Sign Language
                </Link>
              </li>
              <li>
                <Link to="/quick-messages?category=healthcare" className="hover:text-[#7C3AED]">
                  Healthcare Mode
                </Link>
              </li>
              <li>
                <Link to="/emergency" className="hover:text-[#7C3AED]">
                  Emergency Mode
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#7C3AED]">
                  About SignSpeak
                </Link>
              </li>
              {onOpenAccessibility && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenAccessibility}
                    className="font-bold text-[#6D28D9] hover:underline cursor-pointer"
                  >
                    Accessibility Settings
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#EDE9FE] pt-6 text-xs text-[#292544]/65">
          <p>© {new Date().getFullYear()} SignSpeak. Designed for inclusive communication.</p>
          <p>Offline-Ready Quick Board · React · FastAPI · MediaPipe</p>
        </div>
      </div>
    </footer>
  );
}
