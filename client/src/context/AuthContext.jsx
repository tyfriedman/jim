import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { apiLogin, apiMe, apiRegister } from "../api/auth.js";

const STORAGE_TOKEN = "jim_token";
const STORAGE_USER_ID = "jim_user_id";
const STORAGE_COINS = "jim_coins";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN));
  const [userId, setUserId] = useState(() => {
    const v = localStorage.getItem(STORAGE_USER_ID);
    return v != null && v !== "" ? Number(v) : null;
  });
  const [coins, setCoins] = useState(() => {
    const v = localStorage.getItem(STORAGE_COINS);
    return v != null && v !== "" ? Number(v) : null;
  });
  const [authReady, setAuthReady] = useState(false);

  const persistSession = useCallback((payload) => {
    const { token: t, userId: uid, coins: c } = payload;
    localStorage.setItem(STORAGE_TOKEN, t);
    localStorage.setItem(STORAGE_USER_ID, String(uid));
    localStorage.setItem(STORAGE_COINS, String(c));
    setToken(t);
    setUserId(uid);
    setCoins(c);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER_ID);
    localStorage.removeItem(STORAGE_COINS);
    setToken(null);
    setUserId(null);
    setCoins(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      const stored = localStorage.getItem(STORAGE_TOKEN);
      if (!stored) {
        if (!cancelled) setAuthReady(true);
        return;
      }
      try {
        await apiMe(stored);
        if (!cancelled) setAuthReady(true);
      } catch {
        if (!cancelled) {
          logout();
          setAuthReady(true);
        }
      }
    }

    validate();
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(
    async (email, password) => {
      const data = await apiLogin(email, password);
      persistSession(data);
    },
    [persistSession]
  );

  const register = useCallback(
    async (username, email, password) => {
      const data = await apiRegister(username, email, password);
      persistSession(data);
    },
    [persistSession]
  );

  const value = useMemo(
    () => ({
      token,
      userId,
      coins,
      authReady,
      login,
      register,
      logout
    }),
    [token, userId, coins, authReady, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
