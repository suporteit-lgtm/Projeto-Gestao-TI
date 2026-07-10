// Contexto de autenticação: guarda o usuário logado e expõe login/logout.
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, getToken, setToken } from "../api/client";
import { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, unitId?: string) => Promise<void>;
  logout: () => void;
  switchUnit: (unitId: string) => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao carregar, valida o token salvo e recupera o usuário.
  useEffect(() => {
    async function load() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await api<{
          user: { sub: string; name: string; role: string; unitId: string; unitName: string };
        }>("/auth/me");
        // O /me devolve o payload do token; montamos o AuthUser a partir dele.
        setUser({
          id: user.sub,
          name: user.name,
          role: user.role as any,
          email: "",
          unitId: user.unitId,
          unitName: user.unitName,
        });
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function login(email: string, password: string, unitId?: string) {
    const data = await api<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: { email, password, unitId },
    });
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  function updateUser(data: Partial<AuthUser>) {
    setUser((current) => (current ? { ...current, ...data } : current));
  }

  async function switchUnit(unitId: string) {
    const data = await api<{ token: string; user: AuthUser }>("/auth/switch-unit", {
      method: "POST",
      body: { unitId },
    });
    setToken(data.token);
    setUser(data.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchUnit, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
