"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
import { fetchJson, patchWithCsrf, postFormWithCsrf } from "@/lib/api";
import { UserSummary } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

function UserEditPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawId = searchParams.get("id");
  const targetId = rawId ? Number(rawId) : Number.NaN;
  const [me, setMe] = useState<UserSummary | null>(null);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserSummary["role"]>("MEMBER");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
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
  const isSelf = useMemo(() => Boolean(me && user && me.id === user.id), [me, user]);

  const handleSave = async () => {
    if (!user) return;
    try {
      await patchWithCsrf(`/api/users/${user.id}`, {
        name,
      });
      if (canEditRole && role !== user.role) {
        await patchWithCsrf(`/api/users/${user.id}/role`, { role });
      }
      if (avatarFile) {
        const form = new FormData();
        form.append("file", avatarFile);
        const res = await postFormWithCsrf<{ avatarUrl: string }>(`/api/users/${user.id}/avatar`, form);
        setUser((prev) => (prev ? { ...prev, avatarUrl: res.avatarUrl } : prev));
      }
      if (password) {
        await patchWithCsrf(`/api/users/${user.id}/password`, {
          password,
          currentPassword: isSelf ? currentPassword : undefined,
        });
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  if (!user) {
    return (
      <Box sx={{ py: 8 }}>
        <Container maxWidth="sm">
          {error ? (
            <Stack spacing={2}>
              <Typography color="error">{error}</Typography>
              <Button variant="outlined" onClick={() => router.push("/")}>
                戻る
              </Button>
            </Stack>
          ) : (
            <Typography>Loading...</Typography>
          )}
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
            <Stack spacing={1}>
              <Typography variant="subtitle2">アバター</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={user.avatarUrl || undefined}>{user.name.slice(0, 1)}</Avatar>
                <Button variant="outlined" component="label">
                  画像を選択
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </Button>
              </Stack>
              {avatarFile && (
                <Typography variant="caption">{avatarFile.name}</Typography>
              )}
            </Stack>

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

            {isSelf && (
              <TextField
                label="現在のパスワード"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            )}
            {(isSelf || me?.role === "ADMIN") && user.role !== "ADMIN" && (
              <TextField
                label="新しいパスワード"
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

export default function UserEditPage() {
  return (
    <Suspense fallback={<Box sx={{ py: 8 }}><Container maxWidth="sm"><Typography>Loading...</Typography></Container></Box>}>
      <UserEditPageContent />
    </Suspense>
  );
}
