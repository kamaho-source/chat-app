"use client";

import { Box, Drawer, List, ListItemButton, ListItemText, Stack, Toolbar, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "チャンネル", href: "/channels" },
  { label: "プロジェクト", href: "/projects" },
  { label: "ユーザー管理", href: "/users" },
  { label: "管理統計", href: "/admin/stats" },
  { label: "パソコン教室", href: "/classrooms" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 240, boxSizing: "border-box" },
        }}
      >
        <Toolbar>
          <Typography variant="h6" fontWeight={700}>Chat App</Typography>
        </Toolbar>
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={pathname === item.href}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flex: 1, p: 4 }}>
        <Stack spacing={3}>{children}</Stack>
      </Box>
    </Box>
  );
}
