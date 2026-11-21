import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    configured: isSupabaseConfigured,
    signOut: async () => {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function useStaffRole() {
  const { user, configured } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function loadRoles() {
      if (!user || !configured || !supabase) {
        if (active) setRoles([]);
        return;
      }

      const { data, error } = await supabase
        .from("staff_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("active", true);

      if (active) setRoles(error ? [] : (data ?? []).map((row) => row.role));
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadRoles();
    };

    void loadRoles();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [user?.id, configured]);

  return {
    roles,
    isStaff: roles.length > 0,
    isOwner: roles.includes("owner"),
    isAdmin: roles.includes("owner") || roles.includes("admin"),
    isModerator: roles.includes("owner") || roles.includes("admin") || roles.includes("moderator"),
  };
}
