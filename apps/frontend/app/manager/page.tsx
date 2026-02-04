"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { deleteWithCsrf, fetchJson, patchWithCsrf, postWithCsrf } from "@/lib/api";
import { ChannelSummary, UserSummary } from "@/lib/types";
import { useRouter } from "next/navigation";

type ManagerStats = {
  activeUsers: number;
  totalMessages?: number;
  messages?: number;
};

type ChannelMemberSummary = {
  id: number;
  userId: number;
  role: "OWNER" | "MEMBER" | "VIEWER";
  canPost: boolean;
};

export default function ManagerPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserSummary | null>(null);
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [privacyTarget, setPrivacyTarget] = useState<ChannelSummary | null>(null);
  const [privacyMembers, setPrivacyMembers] = useState<ChannelMemberSummary[]>([]);
  const [privacySelectedUserIds, setPrivacySelectedUserIds] = useState<number[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const meData = await fetchJson<UserSummary>("/api/auth/me");
        if (meData.role !== "ADMIN" && meData.role !== "MANAGER") {
          router.push("/");
          return;
        }
        setMe(meData);
        const [statsData, channelData, userData] = await Promise.all([
          fetchJson<ManagerStats>("/api/admin/stats"),
          fetchJson<ChannelSummary[]>("/api/channels"),
          fetchJson<UserSummary[]>("/api/users"),
        ]);
        setStats({
          activeUsers: statsData.activeUsers ?? 0,
          totalMessages: statsData.totalMessages ?? statsData.messages ?? 0,
        });
        setChannels(channelData);
        setUsers(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      }
    };
    load();
  }, [router]);

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

  return (
    <Box sx={{ py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Paper className="animate-fade-up" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" fontWeight={800}>
                  マネージャーダッシュボード
                </Typography>
                <Typography className="cw-muted" sx={{ mt: 1 }}>
                  チャンネルの公開/非公開など、安心して管理できます。
                </Typography>
              </Box>
              <Button variant="outlined" onClick={() => router.push("/")}>
                チャットへ戻る
              </Button>
            </Stack>
          </Paper>
          {error && <Typography color="error">{error}</Typography>}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} className="animate-fade-up">
            <StatCard label="アクティブユーザー数" value={stats?.activeUsers ?? 0} />
            <StatCard label="総メッセージ数" value={stats?.totalMessages ?? 0} />
          </Stack>

          <Card className="animate-pop">
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                使われている度合い
              </Typography>
              <Box sx={{ height: 12, bgcolor: "rgba(27, 143, 122, 0.15)", borderRadius: 999, mt: 2 }}>
                <Box sx={{ width: "65%", height: "100%", bgcolor: "#1b8f7a", borderRadius: 999 }} />
              </Box>
            </CardContent>
          </Card>

          <Card className="animate-pop">
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                チャンネルアクセス管理
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
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
