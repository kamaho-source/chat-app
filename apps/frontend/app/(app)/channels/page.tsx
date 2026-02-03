"use client";

import { z } from "zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, Card, CardContent, Chip, Divider, Grid, Stack, TextField, Typography } from "@mui/material";
import { ChannelSummary } from "@/lib/types";
import { fetchJson, postWithCsrf } from "@/lib/api";
import Link from "next/link";

const schema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function ChannelsPage() {
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { isPrivate: false } });

  const load = async () => {
    try {
      const data = await fetchJson<ChannelSummary[]>("/api/channels");
      setChannels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const created = await postWithCsrf<ChannelSummary>("/api/channels", data);
      setChannels((prev) => [created, ...prev]);
      reset({ name: "", description: "", isPrivate: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>チャンネル</Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">新規チャンネル</Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="名前"
                    fullWidth
                    {...register("name")}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="説明"
                    fullWidth
                    {...register("description")}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    label="公開/非公開"
                    select
                    fullWidth
                    defaultValue="public"
                    SelectProps={{ native: true }}
                    {...register("isPrivate", {
                      setValueAs: (v) => v === "private",
                    })}
                  >
                    <option value="public">公開</option>
                    <option value="private">非公開</option>
                  </TextField>
                </Grid>
              </Grid>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button type="submit" variant="contained" disabled={isSubmitting}>作成</Button>
                {error && (
                  <Typography color="error" variant="body2">{error}</Typography>
                )}
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>
      <Divider />
      <Grid container spacing={2}>
        {channels.map((channel) => (
          <Grid size={{ xs: 12, md: 4 }} key={channel.id}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6">{channel.name}</Typography>
                    <Chip size="small" label={channel.isPrivate ? "非公開" : "公開"} />
                  </Stack>
                  <Typography color="text.secondary">{channel.description || "説明なし"}</Typography>
                  <Button component={Link} href={`/channels/${channel.id}`} size="small">
                    開く
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
