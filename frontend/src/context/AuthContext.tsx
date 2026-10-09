import { createContext, useContext, useState } from "react";

export interface AuthUser {
  id: string;
  name: string;
  studentNumber: string;
  email: string;
  role: 'admin' | 'borrower';
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  startSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = "sebs-token";
const USER_KEY = "sebs-user";

function savedUser(): AuthUser | null {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(savedUser);
  const isAuthenticated = Boolean(localStorage.getItem(TOKEN_KEY) && user);

  function startSession(token: string, nextUser: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, isAuthenticated, startSession, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
