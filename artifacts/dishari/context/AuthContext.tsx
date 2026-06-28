import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface AuthUser {
  id: string;
  name: string;
  role: "admin" | "member";
  memberId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (phone: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_KEY = "@dishari_auth";
const MEMBERS_KEY = "@dishari_members";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY)
      .then((s) => s && setUser(JSON.parse(s)))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (phone: string, password: string): Promise<boolean> => {
    if (phone.trim() === "admin" && password === "admin123") {
      const u: AuthUser = { id: "admin", name: "Admin", role: "admin" };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u));
      setUser(u);
      return true;
    }
    const stored = await AsyncStorage.getItem(MEMBERS_KEY);
    const members = stored ? JSON.parse(stored) : [];
    const m = members.find(
      (x: { phone: string; password: string; status: string }) =>
        x.phone === phone.trim() &&
        x.password === password &&
        x.status === "active"
    );
    if (m) {
      const u: AuthUser = { id: m.id, name: m.name, role: "member", memberId: m.id };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u));
      setUser(u);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
