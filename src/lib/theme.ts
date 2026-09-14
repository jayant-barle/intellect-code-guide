import { useSyncExternalStore } from "react";

export const THEME_STORAGE_KEY = "pylens-theme";

export type AppTheme = "light" | "dark";

let currentTheme: AppTheme = "dark";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((callback) => callback());
}

export function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const item = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (item === "light" || item === "dark") {
      return item;
    }
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {
    // Ignore localStorage access errors
  }
  return "dark";
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  const isLight = theme === "light";
  document.documentElement.classList.toggle("light", isLight);
  document.documentElement.classList.toggle("dark", !isLight);
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

export function saveTheme(theme: AppTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore localStorage write errors
  }
  currentTheme = theme;
  applyTheme(theme);
  notify();
  window.dispatchEvent(new CustomEvent<AppTheme>("pylens-theme-change", { detail: theme }));
}

export function toggleTheme(): AppTheme {
  const next = currentTheme === "dark" ? "light" : "dark";
  saveTheme(next);
  return next;
}

// Initialize on client
if (typeof window !== "undefined") {
  currentTheme = getStoredTheme();
  applyTheme(currentTheme);

  window.addEventListener("storage", (e) => {
    if (e.key === THEME_STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
      currentTheme = e.newValue;
      applyTheme(currentTheme);
      notify();
    }
  });

  window.addEventListener("pylens-theme-change", (e) => {
    const customEvent = e as CustomEvent<AppTheme>;
    if (
      customEvent.detail &&
      customEvent.detail !== currentTheme &&
      (customEvent.detail === "light" || customEvent.detail === "dark")
    ) {
      currentTheme = customEvent.detail;
      applyTheme(currentTheme);
      notify();
    }
  });
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): AppTheme {
  return currentTheme;
}

function getServerSnapshot(): AppTheme {
  return "dark";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    theme,
    isDark: theme === "dark",
    setTheme: saveTheme,
    toggleTheme,
  };
}
