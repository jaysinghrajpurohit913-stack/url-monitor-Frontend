import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import api from "./api";

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const AUTH_KEY = "url-monitor:authed";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAuthenticated(localStorage.getItem(AUTH_KEY) === "1");
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    await api.post("/user/login", { username, password });
    localStorage.setItem(AUTH_KEY, "1");
    setIsAuthenticated(true);
  };

  const signup = async (username: string, email: string, password: string) => {
    // Backend expects capital E "Email"
    await api.post("/user/signup", { username, Email: email, password });
    localStorage.setItem(AUTH_KEY, "1");
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
