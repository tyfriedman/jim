import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_THEME = "jim_theme";
const DAY_START_HOUR = 7;
const NIGHT_START_HOUR = 19;

const ThemeContext = createContext(null);

function inferThemeFromTime() {
  const hour = new Date().getHours();
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? "day" : "night";
}

function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_THEME);
  if (saved === "day" || saved === "night") {
    return saved;
  }
  return inferThemeFromTime();
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.remove("theme-day", "theme-night");
    document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem(STORAGE_THEME, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "day" ? "night" : "day"));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme
    }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
