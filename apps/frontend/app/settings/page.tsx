"use client";

import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import ThemeSettingsPanel from "@/components/ThemeSettingsPanel";

export default function SettingsPage() {
  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h4" fontWeight={700}>
              画面設定
            </Typography>
            <Typography color="text.secondary">
              配色モード・背景色・プライマリカラーを設定します。
            </Typography>
            <ThemeSettingsPanel />
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
