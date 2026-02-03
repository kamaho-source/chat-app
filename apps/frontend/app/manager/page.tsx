"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Container,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { fetchJson, patchWithCsrf } from "@/lib/api";
import { ChannelSummary, UserSummary } from "@/lib/types";
import { useRouter } from "next/navigation";

type ManagerStats = {
  activeUsers: number;
  totalMessages?: number;
  messages?: number;
};

export default function ManagerPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserSummary | null>(null);
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const meData = await fetchJson<UserSummary>("/api/auth/me");
        if (meData.role !== "ADMIN" && meData.role !== "MANAGER") {
          router.push("/");
          return;
        }
        setMe(meData);
        const [statsData, channelData] = await Promise.all([
          fetchJson<ManagerStats>("/api/admin/stats"),
          fetchJson<ChannelSummary[]>("/api/channels"),
        ]);
        setStats({
          activeUsers: statsData.activeUsers ?? 0,
          totalMessages: statsData.totalMessages ?? statsData.messages ?? 0,
        });
        setChannels(channelData);
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

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Typography variant="h4" fontWeight={700}>
            マネージャーダッシュボード
          </Typography>
          {error && <Typography color="error">{error}</Typography>}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <StatCard label="アクティブユーザー数" value={stats?.activeUsers ?? 0} />
            <StatCard label="総メッセージ数" value={stats?.totalMessages ?? 0} />
          </Stack>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                稼働率
              </Typography>
              <Box sx={{ height: 12, bgcolor: "#e2e8f0", borderRadius: 999, mt: 2 }}>
                <Box sx={{ width: "65%", height: "100%", bgcolor: "#2f7d32", borderRadius: 999 }} />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                チャンネルアクセス管理
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
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
