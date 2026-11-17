import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export interface UserProfile {
  id: string;
  display_name: string;
  created_at: string;
}

interface AuthActionResult {
  ok: boolean;
  error?: string;
  notice?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  passwordRecoveryMode: boolean;
  clearPasswordRecoveryMode: () => void;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthActionResult>;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
  updateDisplayName: (displayName: string) => Promise<AuthActionResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);

  const loadOrCreateProfile = useCallback(async (authUser: User) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, created_at')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        return;
      }

      const fallbackName =
        (authUser.user_metadata?.display_name as string | undefined) ||
        authUser.email?.split('@')[0] ||
        'SignSpeak Learner';

      const { data: inserted } = await supabase
        .from('profiles')
        .upsert({ id: authUser.id, display_name: fallbackName }, { onConflict: 'id' })
        .select('id, display_name, created_at')
        .single();

      if (inserted) {
        setProfile(inserted);
      } else {
        setProfile({
          id: authUser.id,
          display_name: fallbackName,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // Keep basic user metadata if profile query fails (e.g. migrations not yet applied)
      const fallbackName =
        (authUser.user_metadata?.display_name as string | undefined) ||
        authUser.email?.split('@')[0] ||
        'SignSpeak Learner';
      setProfile({
        id: authUser.id,
        display_name: fallbackName,
        created_at: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          void loadOrCreateProfile(currentUser);
        }
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryMode(true);
      }

      if (nextUser) {
        void loadOrCreateProfile(nextUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadOrCreateProfile]);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string): Promise<AuthActionResult> => {
      if (!supabase) {
        return {
          ok: false,
          error:
            'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.',
        };
      }
      const cleanName = displayName.trim() || email.split('@')[0];
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: cleanName },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.user && !data.session) {
        return {
          ok: true,
          notice: 'Account created! Please check your email inbox to verify your email address.',
        };
      }

      return { ok: true, notice: 'Welcome to SignSpeak! Your account is active.' };
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!supabase) {
      return {
        ok: false,
        error:
          'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.',
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setPasswordRecoveryMode(false);
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthActionResult> => {
    if (!supabase) {
      return {
        ok: false,
        error:
          'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.',
      };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return {
      ok: true,
      notice:
        'Password reset instructions have been sent if an account exists for that email address.',
    };
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthActionResult> => {
    if (!supabase) {
      return { ok: false, error: 'Supabase is not configured yet.' };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { ok: false, error: error.message };
    }
    setPasswordRecoveryMode(false);
    return { ok: true, notice: 'Your password has been updated successfully.' };
  }, []);

  const updateDisplayName = useCallback(
    async (displayName: string): Promise<AuthActionResult> => {
      if (!supabase || !user) {
        return { ok: false, error: 'You must be signed in to update your profile.' };
      }
      const cleanName = displayName.trim();
      if (!cleanName) {
        return { ok: false, error: 'Display name cannot be empty.' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, display_name: cleanName }, { onConflict: 'id' })
        .select('id, display_name, created_at')
        .single();

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data) setProfile(data);
      await supabase.auth.updateUser({ data: { display_name: cleanName } });
      return { ok: true, notice: 'Profile updated.' };
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isSupabaseConfigured,
        passwordRecoveryMode,
        clearPasswordRecoveryMode: () => setPasswordRecoveryMode(false),
        signUp,
        signIn,
        signOut,
        requestPasswordReset,
        updatePassword,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
