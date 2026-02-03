"use client";

import { Box, Drawer, IconButton, Paper, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useState } from "react";
import ThemeSettingsPanel from "./ThemeSettingsPanel";

export default function SettingsDrawer() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <>
      <Paper
        elevation={6}
        sx={{
          position: "fixed",
          right: isMobile ? 10 : 16,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: theme.zIndex.drawer + 2,
          borderRadius: "999px",
          px: 0.5,
          py: 1,
          bgcolor: "background.paper",
        }}
      >
        <IconButton onClick={() => setOpen(true)} aria-label="settings">
          <SettingsIcon />
        </IconButton>
      </Paper>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: { xs: 320, sm: 360 }, p: 3 }}>
          <Stack spacing={3}>
            <Stack>
              <Typography variant="h6" fontWeight={700}>
                画面設定
              </Typography>
              <Typography variant="body2" color="text.secondary">
                変更は即時保存され、全ページへ反映されます。
              </Typography>
            </Stack>
            <ThemeSettingsPanel />
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
