import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { isSupabaseConfigured, toEmail } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  name: string;
  role: "admin" | "member";
  memberId: string;
  photoUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  needsSetup: boolean;
  schemaNotReady: boolean;
  supabaseReady: boolean;
  refreshSetupStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getApiBase = (): string =>
  Platform.OS === "web" ? "" : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ""}`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [schemaNotReady, setSchemaNotReady] = useState(false);
  const [supabaseReady] = useState(isSupabaseConfigured);

  const refreshSetupStatus = useCallback(async () => {
    if (!supabaseReady) return;
    try {
      const res = await fetch(`${getApiBase()}/api/setup/status`);
      const data = (await res.json()) as { needsSetup?: boolean; schemaNotReady?: boolean };
      if (data.schemaNotReady) {
        setSchemaNotReady(true);
        setNeedsSetup(false);
      } else {
        setSchemaNotReady(false);
        setNeedsSetup(data.needsSetup ?? false);
      }
    } catch {
      setNeedsSetup(false);
    }
  }, [supabaseReady]);

  const loadMemberForSession = useCallback(async (
    userId: string | undefined,
    userMeta?: Record<string, unknown>,
  ) => {
    if (!userId || !supabaseReady) {
      setUser(null);
      return;
    }
    const { getSupabase } = await import("@/lib/supabase");
    const sb = getSupabase();
    const { data: member } = await sb
      .from("members")
      .select("id, name, role")
      .eq("user_id", userId)
      .single();

    if (member) {
      const rawPhoto = userMeta?.avatar_url ?? userMeta?.picture;
      const photoUrl = typeof rawPhoto === "string" && rawPhoto ? rawPhoto : undefined;
      setUser({
        id: userId,
        name: member.name as string,
        role: member.role as "admin" | "member",
        memberId: member.id as string,
        photoUrl: photoUrl || undefined,
      });
      setNeedsSetup(false);
    } else {
      setUser(null);
      await sb.auth.signOut();
    }
  }, [supabaseReady]);

  useEffect(() => {
    if (!supabaseReady) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      await refreshSetupStatus();
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (mounted) {
        await loadMemberForSession(session?.user.id, session?.user.user_metadata);
        setIsLoading(false);
      }
    };

    void init();

    let unsubscribe: (() => void) | null = null;
    import("@/lib/supabase").then(({ getSupabase }) => {
      const sb = getSupabase();
      const { data: { subscription } } = sb.auth.onAuthStateChange(
        (_event, session) => {
          void loadMemberForSession(session?.user.id, session?.user.user_metadata);
        }
      );
      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [loadMemberForSession, refreshSetupStatus, supabaseReady]);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    if (!supabaseReady) return false;
    const { getSupabase } = await import("@/lib/supabase");
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: toEmail(identifier),
      password,
    });
    if (error || !data.session) return false;
    // Eagerly load the member profile so user state is set before the
    // caller navigates away — prevents the "press twice" issue caused by
    // relying solely on the async onAuthStateChange listener.
    await loadMemberForSession(data.session.user.id, data.session.user.user_metadata);
    return true;
  };

  const logout = async () => {
    if (!supabaseReady) return;
    const { getSupabase } = await import("@/lib/supabase");
    await getSupabase().auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, needsSetup, schemaNotReady, supabaseReady, refreshSetupStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
