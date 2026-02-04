"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { deleteWithCsrf, fetchJson, patchWithCsrf, postWithCsrf } from "@/lib/api";
import { ChannelSummary, UserSummary } from "@/lib/types";
import { useRouter } from "next/navigation";

type AdminStats = {
  users: number;
  channels: number;
  privateChannels: number;
  messages: number;
  todayMessages: number;
};

type ChannelMemberSummary = {
  id: number;
  userId: number;
  role: "OWNER" | "MEMBER" | "VIEWER";
  canPost: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserSummary | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newChannel, setNewChannel] = useState({ name: "", description: "" });
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [privacyTarget, setPrivacyTarget] = useState<ChannelSummary | null>(null);
  const [privacyMembers, setPrivacyMembers] = useState<ChannelMemberSummary[]>([]);
  const [privacySelectedUserIds, setPrivacySelectedUserIds] = useState<number[]>([]);

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

  const openPrivacyDialog = async (channel: ChannelSummary) => {
    try {
      const members = await fetchJson<ChannelMemberSummary[]>(`/api/channels/${channel.id}/members`);
      setPrivacyMembers(members);
      setPrivacySelectedUserIds(members.map((m) => m.userId));
      setPrivacyTarget(channel);
      setPrivacyDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "メンバー取得に失敗しました");
    }
  };

  const savePrivacyMembers = async () => {
    if (!privacyTarget) return;
    try {
      await patchWithCsrf(`/api/channels/${privacyTarget.id}/privacy`, { isPrivate: true });
      const existingByUser = new Map(privacyMembers.map((m) => [m.userId, m]));
      const selectedSet = new Set(privacySelectedUserIds);
      const tasks: Promise<unknown>[] = [];
      privacySelectedUserIds.forEach((userId) => {
        const existing = existingByUser.get(userId);
        if (!existing) {
          tasks.push(
            postWithCsrf(`/api/channels/${privacyTarget.id}/members`, {
              userId,
              role: "MEMBER",
              canPost: true,
            })
          );
        }
      });
      privacyMembers.forEach((member) => {
        if (member.role === "OWNER") return;
        if (!selectedSet.has(member.userId)) {
          tasks.push(deleteWithCsrf(`/api/channels/${privacyTarget.id}/members/${member.id}`));
        }
      });
      await Promise.all(tasks);
      setChannels((prev) =>
        prev.map((c) => (c.id === privacyTarget.id ? { ...c, isPrivate: true } : c))
      );
      setPrivacyDialogOpen(false);
      setPrivacyTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
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
    <Box sx={{ py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Paper className="animate-fade-up" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" fontWeight={800}>
                  管理者ダッシュボード
                </Typography>
                <Typography className="cw-muted" sx={{ mt: 1 }}>
                  かんたんに「ユーザー・チャンネル・状況」を確認できます。
                </Typography>
              </Box>
              <Button variant="outlined" onClick={() => router.push("/")}>
                チャットへ戻る
              </Button>
            </Stack>
          </Paper>
          {error && <Typography color="error">{error}</Typography>}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} className="animate-fade-up">
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

          <Card className="animate-pop">
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                使われている度合い
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Bar label="最近の利用" value={72} />
                <Bar label="継続して使える度" value={58} />
              </Stack>
            </CardContent>
          </Card>

          <Card className="animate-pop">
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                ユーザー管理
              </Typography>
              <Typography className="cw-muted" sx={{ mt: 1 }}>
                役割や停止を安全に切り替えられます。
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {users.map((user) => (
                  <Stack key={user.id} direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                    <Typography sx={{ minWidth: 180, fontWeight: 600 }}>{user.name}</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={user.role === "VIEWER"}
                          onChange={(e) =>
                            updateUserRole(user, e.target.checked ? "VIEWER" : "MEMBER")
                          }
                        />
                      }
                      label="閲覧のみ"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={user.role === "ADMIN"}
                          onChange={(e) =>
                            updateUserRole(user, e.target.checked ? "ADMIN" : "MEMBER")
                          }
                        />
                      }
                      label="管理者"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={user.role === "MANAGER"}
                          onChange={(e) =>
                            updateUserRole(user, e.target.checked ? "MANAGER" : "MEMBER")
                          }
                        />
                      }
                      label="マネージャー"
                    />
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

          <Card className="animate-pop">
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                チャンネル管理
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="新しいチャンネル名"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <TextField
                    label="説明"
                    value={newChannel.description}
                    onChange={(e) => setNewChannel((prev) => ({ ...prev, description: e.target.value }))}
                  />
                  <Button variant="contained" onClick={createChannel}>
                    追加
                  </Button>
                </Stack>
                <Divider />
                {channels.map((channel) => (
                  <Stack key={channel.id} direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                    <Typography sx={{ minWidth: 200, fontWeight: 600 }}>#{channel.name}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">限定公開</Typography>
                      <Switch
                        checked={channel.isPrivate}
                        onChange={(e) => {
                          if (e.target.checked) {
                            openPrivacyDialog(channel);
                          } else {
                            updateChannel(channel, { isPrivate: false });
                          }
                        }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">投稿制限</Typography>
                      <Switch />
                    </Stack>
                    <Button
                      color="error"
                      variant="outlined"
                      onClick={() => deleteWithCsrf(`/api/channels/${channel.id}`).then(() =>
                        setChannels((prev) => prev.filter((c) => c.id !== channel.id))
                      ).catch((err) => setError(err instanceof Error ? err.message : "削除に失敗しました"))}
                    >
                      削除
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>

      <Dialog open={privacyDialogOpen} onClose={() => setPrivacyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>閲覧できる人を選択</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {users.map((user) => (
              <FormControlLabel
                key={user.id}
                control={
                  <Switch
                    checked={privacySelectedUserIds.includes(user.id)}
                    onChange={(e) => {
                      setPrivacySelectedUserIds((prev) =>
                        e.target.checked ? [...prev, user.id] : prev.filter((id) => id !== user.id)
                      );
                    }}
                  />
                }
                label={`${user.name} (${user.email})`}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrivacyDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={savePrivacyMembers}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="animate-pop" sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={800}>
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
      <Box sx={{ height: 12, bgcolor: "rgba(27, 143, 122, 0.15)", borderRadius: 999 }}>
        <Box sx={{ width: `${value}%`, height: "100%", bgcolor: "#1b8f7a", borderRadius: 999 }} />
      </Box>
    </Stack>
  );
}
