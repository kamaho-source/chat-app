"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { fetchJson, patchWithCsrf } from "@/lib/api";
import { UserSummary } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

export default function UserEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = Number(searchParams.get("id"));
  const [me, setMe] = useState<UserSummary | null>(null);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserSummary["role"]>("MEMBER");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const meData = await fetchJson<UserSummary>("/api/auth/me");
        setMe(meData);
        const userData = Number.isNaN(targetId) ? meData : await fetchJson<UserSummary>(`/api/users/${targetId}`);
        setUser(userData);
        setName(userData.name);
        setRole(userData.role);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      }
    };
    load();
  }, [targetId]);

  const canEditRole = useMemo(() => {
    if (!me) return false;
    return me.role === "ADMIN" || me.role === "MANAGER";
  }, [me]);

  const canGrantAdmin = useMemo(() => me?.role === "ADMIN", [me]);

  const handleSave = async () => {
    if (!user) return;
    try {
      await patchWithCsrf(`/api/users/${user.id}`, {
        name,
        role,
        password: password || undefined,
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  if (!user) {
    return (
      <Box sx={{ py: 8 }}>
        <Container maxWidth="sm">
          <Typography>Loading...</Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Typography variant="h4" fontWeight={700}>
              ユーザー編集
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={user.avatarUrl || undefined}>{user.name.slice(0, 1)}</Avatar>
              <Typography variant="subtitle1">{user.email}</Typography>
            </Stack>
            <TextField label="ユーザーID" value={user.email} InputProps={{ readOnly: true }} />
            <TextField label="氏名" value={name} onChange={(e) => setName(e.target.value)} />

            <TextField
              label="ロール"
              select
              value={role}
              onChange={(e) => setRole(e.target.value as UserSummary["role"])}
              disabled={!canEditRole}
            >
              <MenuItem value="MEMBER">member</MenuItem>
              <MenuItem value="VIEWER">viewer</MenuItem>
              <MenuItem value="MANAGER">manager</MenuItem>
              <MenuItem value="ADMIN" disabled={!canGrantAdmin}>
                admin
              </MenuItem>
            </TextField>

            {me?.role === "ADMIN" && user.role !== "ADMIN" && (
              <TextField
                label="パスワード変更"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}

            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}

            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleSave}>
                保存
              </Button>
              <Button variant="outlined" onClick={() => router.push("/")}>
                キャンセル
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
