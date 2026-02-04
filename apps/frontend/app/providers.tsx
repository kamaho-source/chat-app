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
type UxModeSetting = "kids" | "work";

export type ThemeSettings = {
  mode: ThemeModeSetting;
  primary: string;
  background: string;
  uxMode: UxModeSetting;
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
  uxMode: "kids",
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
      uxMode: parsed.uxMode ?? DEFAULT_SETTINGS.uxMode,
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
  const redirectingRef = useRef(false);

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
    document.body.style.setProperty("--cw-accent", settings.primary);
    document.body.style.setProperty("--cw-bg", settings.background);
  }, [settings.background, settings.primary]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : "";
        const pathname = window.location.pathname;
        const shouldRedirect =
          (response.status === 401 || (response.status === 403 && url.includes("/api/auth/me"))) &&
          pathname !== "/login" &&
          pathname !== "/users/new";
        if (shouldRedirect && !redirectingRef.current) {
          redirectingRef.current = true;
          window.location.href = "/login";
          return response;
        }
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
          secondary: {
            main: "#f97316",
          },
          background: {
            default: settings.background,
            paper: resolvedMode === "dark" ? "#121416" : "#ffffff",
          },
        },
        typography: {
          fontFamily: "var(--font-geist-sans)",
          button: {
            textTransform: "none",
            fontWeight: 700,
            letterSpacing: "0.01em",
          },
          fontSize: settings.uxMode === "kids" ? 15 : 14,
          h4: {
            fontWeight: 800,
            letterSpacing: "-0.02em",
            fontSize: settings.uxMode === "kids" ? "2rem" : "1.75rem",
          },
          h3: {
            fontWeight: 700,
            letterSpacing: "-0.02em",
          },
          h5: {
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: settings.uxMode === "kids" ? 18 : 14,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: settings.uxMode === "kids" ? 16 : 12,
                paddingLeft: settings.uxMode === "kids" ? 18 : 14,
                paddingRight: settings.uxMode === "kids" ? 18 : 14,
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                border: "1px solid rgba(226, 214, 198, 0.8)",
                boxShadow: "0 16px 32px rgba(25, 29, 32, 0.12)",
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backdropFilter: "blur(14px)",
                backgroundColor: "rgba(255, 255, 255, 0.88)",
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: "rgba(255, 255, 255, 0.92)",
                backdropFilter: "blur(12px)",
              },
            },
          },
          MuiTextField: {
            defaultProps: {
              size: "medium",
            },
            styleOverrides: {
              root: {
                "& .MuiOutlinedInput-root": {
                  borderRadius: 14,
                  backgroundColor: "rgba(255, 253, 250, 0.95)",
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                fontWeight: 600,
              },
            },
          },
        },
      }),
    [resolvedMode, settings.background, settings.primary, settings.uxMode]
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
