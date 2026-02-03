"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { fetchJson } from "@/lib/api";

interface Stats {
  userCount: number;
  channelCount: number;
  messageCount: number;
  channelMessageCounts: Record<string, number>;
  dailyUsage: Record<string, number>;
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchJson<Stats>("/api/admin/stats");
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>管理者統計</Typography>
      {error && <Typography color="error">{error}</Typography>}
      {stats && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            {[
              { label: "ユーザー数", value: stats.userCount },
              { label: "チャンネル数", value: stats.channelCount },
              { label: "メッセージ数", value: stats.messageCount },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">{item.label}</Typography>
                    <Typography variant="h4" fontWeight={700}>{item.value}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Card>
            <CardContent>
              <Typography fontWeight={600}>チャンネル別投稿数</Typography>
              {Object.entries(stats.channelMessageCounts).map(([channelId, count]) => (
                <Typography key={channelId} variant="body2">Channel {channelId}: {count}</Typography>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography fontWeight={600}>日次利用率</Typography>
              {Object.entries(stats.dailyUsage).map(([day, count]) => (
                <Typography key={day} variant="body2">{day}: {count}</Typography>
              ))}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  );
}
