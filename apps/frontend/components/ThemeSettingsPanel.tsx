"use client";

import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography, TextField, Chip } from "@mui/material";
import { ThemeSettings, ThemeSettingsContext } from "@/app/providers";
import { useContext } from "react";

const MODE_OPTIONS: ThemeSettings["mode"][] = ["light", "dark", "system"];
const PRIMARY_PRESETS = ["#2f7d32", "#1e5aa8", "#d63f3f", "#f5a623", "#5b6ac8"];
const BG_PRESETS = ["#f4f6f8", "#f7f3ee", "#f1f5fb", "#11151a"];

export default function ThemeSettingsPanel() {
  const { settings, updateSettings } = useContext(ThemeSettingsContext);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          配色モード
        </Typography>
        <ToggleButtonGroup
          value={settings.mode}
          exclusive
          onChange={(_, value) => value && updateSettings({ mode: value })}
          sx={{ mt: 1 }}
        >
          {MODE_OPTIONS.map((mode) => (
            <ToggleButton key={mode} value={mode}>
              {mode.toUpperCase()}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          プライマリカラー
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
          {PRIMARY_PRESETS.map((color) => (
            <Chip
              key={color}
              onClick={() => updateSettings({ primary: color })}
              sx={{ bgcolor: color, color: "#fff", borderRadius: "999px" }}
              label={color}
            />
          ))}
        </Stack>
        <TextField
          type="color"
          label="カスタムカラー"
          value={settings.primary}
          onChange={(e) => updateSettings({ primary: e.target.value })}
          sx={{ mt: 2, maxWidth: 220 }}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          背景色
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
          {BG_PRESETS.map((color) => (
            <Chip
              key={color}
              onClick={() => updateSettings({ background: color })}
              sx={{ bgcolor: color, color: "#1c252b", borderRadius: "999px" }}
              label={color}
              variant={settings.background === color ? "filled" : "outlined"}
            />
          ))}
        </Stack>
        <TextField
          type="color"
          label="カスタム背景"
          value={settings.background}
          onChange={(e) => updateSettings({ background: e.target.value })}
          sx={{ mt: 2, maxWidth: 220 }}
          InputLabelProps={{ shrink: true }}
        />
      </Box>
    </Stack>
  );
}
