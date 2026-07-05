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
