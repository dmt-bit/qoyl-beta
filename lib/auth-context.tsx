"use client";

import { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { fetchHairProfileByUserId, HairProfile } from "@/lib/hairProfile";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  hairProfile: HairProfile | null;
  hairProfileLoading: boolean;
  refreshHairProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  hairProfile: null,
  hairProfileLoading: false,
  refreshHairProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hairProfile, setHairProfile] = useState<HairProfile | null>(null);
  const [hairProfileLoading, setHairProfileLoading] = useState(false);

  const loadHairProfile = useCallback(async (userId: string) => {
    setHairProfileLoading(true);
    const profile = await fetchHairProfileByUserId(userId);
    setHairProfile(profile);
    if (profile) {
      localStorage.setItem("hair_profile_id", profile.id);
    }
    setHairProfileLoading(false);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setLoading(false);

      if (sessionUser) {
        loadHairProfile(sessionUser.id);

        // Magic link auth (supabase.auth.signInWithOtp) replaced
        // signUp() as the account-creation path, so there's no longer a
        // single call site to fire the welcome email / admin "new
        // signup" alert from. created_at === last_sign_in_at is
        // Supabase's own signal for "this session is this user's first
        // ever sign-in" - it can only ever be true once per user,
        // across their whole lifetime, since last_sign_in_at moves on
        // every subsequent sign-in but created_at never does. Gating on
        // SIGNED_IN (not INITIAL_SESSION/TOKEN_REFRESHED) keeps this
        // from re-firing on every page load with a persisted session.
        if (event === "SIGNED_IN" && sessionUser.created_at === sessionUser.last_sign_in_at) {
          fetch("/api/notify/new-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: sessionUser.email }),
          }).catch((err) =>
            console.warn("[auth-context] Signup notification request failed:", err)
          );
        }
      } else {
        setHairProfile(null);
        if (event === "SIGNED_OUT") {
          localStorage.removeItem("hair_profile_id");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [loadHairProfile]);

  const refreshHairProfile = useCallback(async () => {
    if (user) await loadHairProfile(user.id);
  }, [user, loadHairProfile]);

  return (
    <AuthContext.Provider
      value={{ user, loading, hairProfile, hairProfileLoading, refreshHairProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
