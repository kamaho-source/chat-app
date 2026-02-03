"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { deleteWithCsrf, fetchJson, patchWithCsrf, postFormWithCsrf } from "@/lib/api";
import { Role, UserSummary } from "@/lib/types";

const roles: Role[] = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Record<number, string>>({});

  const load = async () => {
    try {
      const data = await fetchJson<UserSummary[]>("/api/users");
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateName = async (id: number, name: string) => {
    try {
      const updated = await patchWithCsrf<UserSummary>(`/api/users/${id}`, { name });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const updateRole = async (id: number, role: Role) => {
    try {
      const updated = await patchWithCsrf<UserSummary>(`/api/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const updateStatus = async (id: number, active: boolean) => {
    try {
      const updated = await patchWithCsrf<UserSummary>(`/api/users/${id}/status`, { active });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const updatePassword = async (id: number) => {
    const password = passwords[id];
    if (!password || password.length < 8) {
      setError("パスワードは8文字以上にしてください。");
      return;
    }
    try {
      await patchWithCsrf(`/api/users/${id}/password`, { password });
      setPasswords((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const updateAvatar = async (id: number, file: File) => {
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await postFormWithCsrf<{ avatarUrl: string }>(`/api/users/${id}/avatar`, form);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, avatarUrl: res.avatarUrl } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const removeUser = async (id: number) => {
    try {
      await deleteWithCsrf(`/api/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>ユーザー管理</Typography>
      {error && <Typography color="error">{error}</Typography>}
      <Stack spacing={2}>
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <Avatar src={user.avatarUrl || undefined} sx={{ width: 56, height: 56 }}>
                    {user.name?.slice(0, 1)}
                  </Avatar>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography fontWeight={600}>{user.name}</Typography>
                    <Typography variant="body2" color="text.secondary">ID: {user.email}</Typography>
                  </Box>
                  <Chip label={user.role} color="secondary" variant="outlined" />
                  <TextField
                    label="表示名"
                    defaultValue={user.name}
                    onBlur={(e) => updateName(user.id, e.target.value)}
                  />
                  <TextField
                    label="ロール"
                    select
                    SelectProps={{ native: true }}
                    defaultValue={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value as Role)}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </TextField>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={user.active}
                        onChange={(e) => updateStatus(user.id, e.target.checked)}
                        color="primary"
                      />
                    }
                    label={user.active ? "有効" : "停止"}
                  />
                </Stack>
                <Divider />
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <Button variant="outlined" component="label">
                    アバター更新
                    <input
                      hidden
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) updateAvatar(user.id, file);
                      }}
                    />
                  </Button>
                  <TextField
                    label="管理者パスワード変更"
                    type="password"
                    value={passwords[user.id] || ""}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, [user.id]: e.target.value }))}
                  />
                  <Button variant="contained" onClick={() => updatePassword(user.id)}>
                    変更
                  </Button>
                  <Button color="error" onClick={() => removeUser(user.id)}>
                    削除
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
