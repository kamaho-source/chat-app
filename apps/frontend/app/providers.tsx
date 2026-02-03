"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import {
  CssBaseline,
  Snackbar,
  Alert,
  ThemeProvider,
  createTheme,
  useMediaQuery,
} from "@mui/material";
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import SettingsDrawer from "@/components/SettingsDrawer";

type ThemeModeSetting = "light" | "dark" | "system";

export type ThemeSettings = {
  mode: ThemeModeSetting;
  primary: string;
  background: string;
};

type ThemeSettingsContextValue = {
  settings: ThemeSettings;
  setSettings: (next: ThemeSettings) => void;
  updateSettings: (partial: Partial<ThemeSettings>) => void;
};

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: "light",
  primary: "#2f7d32",
  background: "#f4f6f8",
};

export const ThemeSettingsContext = createContext<ThemeSettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => {},
  updateSettings: () => {},
});

const STORAGE_KEY = "app-theme-settings";

function loadSettings(): ThemeSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>;
    return {
      mode: parsed.mode ?? DEFAULT_SETTINGS.mode,
      primary: parsed.primary ?? DEFAULT_SETTINGS.primary,
      background: parsed.background ?? DEFAULT_SETTINGS.background,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: ThemeSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [settings, setSettingsState] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [toastOpen, setToastOpen] = useState(false);
  const lastToastAt = useRef(0);

  useEffect(() => {
    setSettingsState(loadSettings());
  }, []);

  const setSettings = useCallback((next: ThemeSettings) => {
    setSettingsState(next);
    persistSettings(next);
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<ThemeSettings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...partial };
        persistSettings(next);
        return next;
      });
    },
    []
  );

  const resolvedMode = settings.mode === "system" ? (prefersDark ? "dark" : "light") : settings.mode;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.backgroundColor = settings.background;
  }, [settings.background]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : "";
        if (url.includes("/api/channels") && response.status === 403) {
          const now = Date.now();
          if (now - lastToastAt.current > 3000) {
            lastToastAt.current = now;
            setToastOpen(true);
          }
        }
      } catch {
        // ignore
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: resolvedMode,
          primary: {
            main: settings.primary,
          },
          background: {
            default: settings.background,
            paper: resolvedMode === "dark" ? "#11151a" : "#ffffff",
          },
        },
        typography: {
          fontFamily: "var(--font-geist-sans)",
          h3: {
            fontWeight: 700,
            letterSpacing: "-0.02em",
          },
          h5: {
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
      }),
    [resolvedMode, settings.background, settings.primary]
  );

  return (
    <AppRouterCacheProvider>
      <ThemeSettingsContext.Provider value={{ settings, setSettings, updateSettings }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
          <SettingsDrawer />
          <Snackbar open={toastOpen} autoHideDuration={4000} onClose={() => setToastOpen(false)}>
            <Alert severity="warning" onClose={() => setToastOpen(false)}>
              このチャンネルへのアクセス権限がありません。
            </Alert>
          </Snackbar>
        </ThemeProvider>
      </ThemeSettingsContext.Provider>
    </AppRouterCacheProvider>
  );
}
