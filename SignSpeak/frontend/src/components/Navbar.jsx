import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Accessibility, BarChart3, Menu, UserCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { PWAInstallButton } from './PWAInstallButton';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/quick-messages', label: 'Quick Messages' },
  { to: '/communicate', label: 'Two-Way' },
  { to: '/translator', label: 'Translator' },
  { to: '/learn', label: 'Learn' },
  { to: '/emergency', label: 'Emergency' },
];

function SignSpeakMark({ className = 'w-9 h-9' }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="12" fill="#EDE9FE" />
      <path
        d="M11.5 20V13.5C11.5 12.6716 12.1716 12 13 12C13.8284 12 14.5 12.6716 14.5 13.5V18.5M14.5 17.5V11.2C14.5 10.3716 15.1716 9.7 16 9.7C16.8284 9.7 17.5 10.3716 17.5 11.2V18M17.5 18V12.2C17.5 11.3716 18.1716 10.7 19 10.7C19.8284 10.7 20.5 11.3716 20.5 12.2V19M20.5 19V14.5C20.5 13.6716 21.1716 13 22 13C22.8284 13 23.5 13.6716 23.5 14.5V20.5C23.5 24.0899 20.5899 27 17 27C13.9624 27 11.5 24.5376 11.5 21.5V20Z"
        fill="#FED7AA"
        stroke="#292544"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="27" cy="9" r="3" fill="#A78BFA" />
    </svg>
  );
}

export function Navbar({ onOpenAccessibility }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile } = useAuth();

  const linkClass = ({ isActive }) =>
    `px-2.5 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
      isActive
        ? 'bg-[#EDE9FE] text-[#292544]'
        : 'text-[#292544]/75 hover:text-[#292544] hover:bg-[#EDE9FE]/50'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-[#EDE9FE] bg-[#FFFCF8]/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <NavLink
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex shrink-0 items-center gap-2.5 text-xl font-extrabold tracking-tight text-[#292544] whitespace-nowrap"
        >
          <SignSpeakMark className="h-9 w-9 shrink-0" />
          <span>SignSpeak</span>
        </NavLink>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {NAV_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {onOpenAccessibility && (
            <button
              type="button"
              onClick={onOpenAccessibility}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#EDE9FE] bg-white px-2.5 text-xs font-extrabold text-[#292544] transition-colors hover:border-[#A78BFA] hover:bg-[#EDE9FE]/40 cursor-pointer whitespace-nowrap"
              aria-label="Open accessibility preferences"
              title="Accessibility preferences (text size, high contrast, motion)"
            >
              <Accessibility className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />
              <span className="hidden xl:inline">Accessibility</span>
            </button>
          )}

          <div className="hidden sm:block">
            <PWAInstallButton />
          </div>

          {user ? (
            <div className="hidden items-center gap-1.5 md:flex">
              <NavLink
                to="/progress"
                className={({ isActive }) =>
                  `inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-extrabold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-[#7C3AED] bg-[#EDE9FE] text-[#292544]'
                      : 'border-[#EDE9FE] bg-white text-[#292544] hover:border-[#A78BFA]'
                  }`
                }
              >
                <BarChart3 className="h-3.5 w-3.5 text-[#6D28D9]" aria-hidden="true" />
                <span>Progress</span>
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-extrabold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-[#7C3AED] bg-[#EDE9FE] text-[#292544]'
                      : 'border-[#EDE9FE] bg-white text-[#292544] hover:border-[#A78BFA]'
                  }`
                }
              >
                <UserCircle2 className="h-4 w-4 text-[#6D28D9]" aria-hidden="true" />
                <span className="max-w-[90px] truncate">
                  {profile?.display_name || user.email?.split('@')[0] || 'Profile'}
                </span>
              </NavLink>
            </div>
          ) : (
            <div className="hidden md:block">
              <Button to="/auth" variant="outline" size="sm">
                <UserCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>Sign In</span>
              </Button>
            </div>
          )}

          <div className="hidden xl:block">
            <Button to="/translator" variant="primary" size="sm">
              Start Translating
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#EDE9FE] bg-white text-[#292544] transition-colors hover:bg-[#EDE9FE]/60 lg:hidden cursor-pointer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#EDE9FE] bg-[#FFFCF8] px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1.5" aria-label="Mobile navigation">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={linkClass}
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/text-to-sign" onClick={() => setMobileOpen(false)} className={linkClass}>
              Text-to-Sign
            </NavLink>
            <NavLink to="/progress" onClick={() => setMobileOpen(false)} className={linkClass}>
              Progress Dashboard
            </NavLink>
            <NavLink
              to={user ? '/profile' : '/auth'}
              onClick={() => setMobileOpen(false)}
              className={linkClass}
            >
              {user ? 'Profile & Settings' : 'Sign In / Create Account'}
            </NavLink>
            <NavLink to="/about" onClick={() => setMobileOpen(false)} className={linkClass}>
              About
            </NavLink>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <PWAInstallButton />
              <Button
                to="/translator"
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => setMobileOpen(false)}
              >
                Start Translating
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
