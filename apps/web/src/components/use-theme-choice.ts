"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isDark, readThemeChoice, THEME_KEY, type ThemeChoice } from "@/lib/theme";

// The theme choice for components: the account menu sets it, the toaster follows it. The pre-paint script in the
// root layout has already applied it to <html> before React loads; this keeps the two in step after that.

const CHANGED = "keos-theme-change";

function stored(): ThemeChoice {
  try {
    return readThemeChoice(window.localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useThemeChoice(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const choice = useSyncExternalStore(subscribe, stored, (): ThemeChoice => "system");
  const setChoice = useCallback((next: ThemeChoice) => {
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked: the switch still applies to this page, it just won't be remembered.
    }
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark(next, systemDark));
    window.dispatchEvent(new Event(CHANGED));
  }, []);
  return [choice, setChoice];
}
