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
const STORAGE_USERNAME = "jim_username";

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
  const [username, setUsername] = useState(() => localStorage.getItem(STORAGE_USERNAME));
  const [authReady, setAuthReady] = useState(false);

  const persistSession = useCallback((payload) => {
    const { token: t, userId: uid, coins: c, username: un } = payload;
    localStorage.setItem(STORAGE_TOKEN, t);
    localStorage.setItem(STORAGE_USER_ID, String(uid));
    localStorage.setItem(STORAGE_COINS, String(c));
    if (un != null && String(un).trim() !== "") {
      localStorage.setItem(STORAGE_USERNAME, String(un));
    } else {
      localStorage.removeItem(STORAGE_USERNAME);
    }
    setToken(t);
    setUserId(uid);
    setCoins(c);
    setUsername(un ?? null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER_ID);
    localStorage.removeItem(STORAGE_COINS);
    localStorage.removeItem(STORAGE_USERNAME);
    setToken(null);
    setUserId(null);
    setCoins(null);
    setUsername(null);
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
        const me = await apiMe(stored);
        if (!cancelled) {
          setUsername(me.username || null);
          if (me.coins != null && me.coins !== "") {
            setCoins(Number(me.coins));
          }
          setAuthReady(true);
        }
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
    async (username, password) => {
      const data = await apiLogin(username, password);
      persistSession({ ...data, username });
    },
    [persistSession]
  );

  const register = useCallback(
    async (username, email, password) => {
      const data = await apiRegister(username, email, password);
      persistSession({ ...data, username });
    },
    [persistSession]
  );

  const updateCoins = useCallback((amount) => {
    const n = Number(amount);
    localStorage.setItem(STORAGE_COINS, String(n));
    setCoins(n);
  }, []);

  const value = useMemo(
    () => ({
      token,
      userId,
      coins,
      username,
      authReady,
      login,
      register,
      logout,
      updateCoins
    }),
    [token, userId, coins, username, authReady, login, register, logout, updateCoins]
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
