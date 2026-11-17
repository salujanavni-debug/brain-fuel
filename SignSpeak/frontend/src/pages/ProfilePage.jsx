import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  History,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  Trash2,
  User,
  Volume2,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import {
  deleteTranslationHistoryRow,
  fetchTranslationHistory,
} from '../services/supabaseDataService';
import { speakText } from '../utils/speech';

export function ProfilePage() {
  const { user, profile, signOut, updateDisplayName, updatePassword } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [profileNotice, setProfileNotice] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name]);

  useEffect(() => {
    if (!user?.id) return;
    fetchTranslationHistory(user.id).then(setHistory);
  }, [user?.id]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileNotice(null);
    const res = await updateDisplayName(displayName);
    setProfileNotice(res.ok ? res.notice || 'Saved.' : res.error || 'Failed to update profile.');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordNotice(null);
    const res = await updatePassword(newPassword);
    if (res.ok) setNewPassword('');
    setPasswordNotice(res.ok ? res.notice || 'Password updated.' : res.error || 'Update failed.');
  };

  const handleDeleteHistory = async (rowId) => {
    if (!user?.id) return;
    const ok = await deleteTranslationHistoryRow(user.id, rowId);
    if (ok) {
      setHistory((prev) => prev.filter((item) => item.id !== rowId));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#6D28D9]">Protected Account Settings</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#292544]">
            Your SignSpeak Profile
          </h1>
          <p className="mt-1 text-sm text-[#292544]/75">
            Signed in as <span className="font-bold">{user?.email}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button to="/progress" variant="secondary" size="sm">
            <span>View Learning Progress</span>
          </Button>
          <Button onClick={() => void signOut()} variant="outline" size="sm">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card tone="lavender">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#292544]">
            <User className="h-5 w-5 text-[#6D28D9]" aria-hidden="true" />
            <span>Profile Details</span>
          </h2>

          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div>
              <label htmlFor="profile-display-name" className="block text-xs font-bold text-[#292544]">
                Display Name
              </label>
              <input
                id="profile-display-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-[#DDD6FE] bg-white px-4 py-2.5 text-sm font-semibold text-[#292544] focus:border-[#7C3AED] focus:outline-none"
              />
            </div>

            <Button type="submit" variant="primary" size="sm">
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>Save Profile</span>
            </Button>

            {profileNotice && (
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#065F46]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{profileNotice}</span>
              </p>
            )}
          </form>
        </Card>

        <Card tone="default">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#292544]">
            <KeyRound className="h-5 w-5 text-[#6D28D9]" aria-hidden="true" />
            <span>Update Password</span>
          </h2>

          <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
            <div>
              <label htmlFor="profile-new-password" className="block text-xs font-bold text-[#292544]">
                New Password
              </label>
              <input
                id="profile-new-password"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="mt-1.5 w-full rounded-2xl border border-[#DDD6FE] bg-[#FFFCF8] px-4 py-2.5 text-sm text-[#292544] focus:border-[#7C3AED] focus:outline-none"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              <span>Change Password</span>
            </Button>
            {passwordNotice && (
              <p className="text-xs font-bold text-[#6D28D9]">{passwordNotice}</p>
            )}
          </form>
        </Card>
      </div>

      <Card tone="default">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#292544]">
              <History className="h-5 w-5 text-[#6D28D9]" aria-hidden="true" />
              <span>Cloud Translation History (Text Only)</span>
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-[#292544]/65">
              Protected by Supabase Row Level Security · No webcam footage or images are ever
              stored.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-xl bg-[#A7F3D0]/60 px-3 py-1 text-xs font-bold text-[#065F46]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>RLS Private</span>
          </span>
        </div>

        {history.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-[#EDE9FE]/35 p-4 text-sm text-[#292544]/75">
            No synced text translations saved to your cloud history yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[#EDE9FE]">
            {history.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-bold text-[#292544]">{item.translated_text}</p>
                  <p className="font-mono text-xs text-[#292544]/60">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakText(item.translated_text)}
                    aria-label={`Speak ${item.translated_text}`}
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDeleteHistory(item.id)}
                    aria-label="Delete translation item"
                  >
                    <Trash2 className="h-4 w-4 text-[#B91C1C]" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
