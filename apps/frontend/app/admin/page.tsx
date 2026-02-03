"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { fetchJson, patchWithCsrf, postWithCsrf } from "@/lib/api";
import { ChannelSummary, UserSummary } from "@/lib/types";
import { useRouter } from "next/navigation";

type AdminStats = {
  users: number;
  channels: number;
  privateChannels: number;
  messages: number;
  todayMessages: number;
};

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserSummary | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newChannel, setNewChannel] = useState({ name: "", description: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const meData = await fetchJson<UserSummary>("/api/auth/me");
        if (meData.role !== "ADMIN") {
          router.push("/");
          return;
        }
        setMe(meData);
        const [statsData, userData, channelData] = await Promise.all([
          fetchJson<AdminStats>("/api/admin/stats"),
          fetchJson<UserSummary[]>("/api/users"),
          fetchJson<ChannelSummary[]>("/api/channels"),
        ]);
        setStats(statsData);
        setUsers(userData);
        setChannels(channelData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      }
    };
    load();
  }, [router]);

  const updateUserRole = async (user: UserSummary, role: UserSummary["role"]) => {
    try {
      const updated = await patchWithCsrf<UserSummary>(`/api/users/${user.id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  const updateUserStatus = async (user: UserSummary, active: boolean) => {
    try {
      const updated = await patchWithCsrf<UserSummary>(`/api/users/${user.id}/status`, { active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  const updateChannel = async (channel: ChannelSummary, patch: Partial<ChannelSummary>) => {
    try {
      const payload: ChannelSummary = {
        ...channel,
        ...patch,
      };
      const updated = await patchWithCsrf<ChannelSummary>(`/api/channels/${channel.id}`, payload);
      setChannels((prev) => prev.map((c) => (c.id === channel.id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  const createChannel = async () => {
    try {
      const created = await postWithCsrf<ChannelSummary>("/api/channels", {
        name: newChannel.name,
        description: newChannel.description,
        isPrivate: false,
      });
      setChannels((prev) => [created, ...prev]);
      setNewChannel({ name: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    }
  };

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Typography variant="h4" fontWeight={700}>
            管理者ダッシュボード
          </Typography>
          <Button variant="outlined" onClick={() => router.push("/")}>
            戻る
          </Button>
          {error && <Typography color="error">{error}</Typography>}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {stats && (
              <>
                <StatCard label="ユーザー数" value={stats.users} />
                <StatCard label="チャンネル数" value={stats.channels} />
                <StatCard label="限定公開数" value={stats.privateChannels} />
                <StatCard label="総メッセージ" value={stats.messages} />
                <StatCard label="本日メッセージ" value={stats.todayMessages} />
              </>
            )}
          </Stack>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                稼働率・運用率
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Bar label="稼働率" value={72} />
                <Bar label="運用率" value={58} />
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                ユーザー管理
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {users.map((user) => (
                  <Stack key={user.id} direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                    <Typography sx={{ minWidth: 180 }}>{user.name}</Typography>
                    <TextField
                      select
                      size="small"
                      value={user.role}
                      onChange={(e) => updateUserRole(user, e.target.value as UserSummary["role"])}
                      sx={{ minWidth: 150 }}
                    >
                      <MenuItem value="ADMIN">ADMIN</MenuItem>
                      <MenuItem value="MANAGER">MANAGER</MenuItem>
                      <MenuItem value="MEMBER">MEMBER</MenuItem>
                      <MenuItem value="VIEWER">VIEWER</MenuItem>
                    </TextField>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">停止</Typography>
                      <Switch
                        checked={!user.active}
                        onChange={(e) => updateUserStatus(user, !e.target.checked)}
                      />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                チャンネル管理
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="新規チャンネル名"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <TextField
                    label="説明"
                    value={newChannel.description}
                    onChange={(e) => setNewChannel((prev) => ({ ...prev, description: e.target.value }))}
                  />
                  <Button variant="contained" onClick={createChannel}>
                    作成
                  </Button>
                </Stack>
                <Divider />
                {channels.map((channel) => (
                  <Stack key={channel.id} direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                    <Typography sx={{ minWidth: 200 }}>#{channel.name}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">限定公開</Typography>
                      <Switch
                        checked={channel.isPrivate}
                        onChange={(e) => updateChannel(channel, { isPrivate: e.target.checked })}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">投稿制限</Typography>
                      <Switch />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2">{value}%</Typography>
      </Stack>
      <Box sx={{ height: 10, bgcolor: "#e2e8f0", borderRadius: 999 }}>
        <Box sx={{ width: `${value}%`, height: "100%", bgcolor: "#1e5aa8", borderRadius: 999 }} />
      </Box>
    </Stack>
  );
}
