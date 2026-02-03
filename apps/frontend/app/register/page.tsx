"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { postFormWithCsrf } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

const schema = z.object({
  userId: z.string().min(2).max(50),
  password: z.string().min(8).max(200),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const form = new FormData();
      form.append("userId", data.userId);
      form.append("password", data.password);
      if (avatarFile) form.append("avatar", avatarFile);
      await postFormWithCsrf("/api/auth/register-child", form);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4 }} className="animate-fade-up">
          <Stack spacing={2}>
            <Typography variant="h4" fontWeight={700}>
              はじめての登録
            </Typography>
            <Typography color="text.secondary">
              IDとパスワード、アイコン画像で登録できます。
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2}>
                <TextField
                  label="ID"
                  fullWidth
                  {...register("userId")}
                  error={!!errors.userId}
                  helperText={errors.userId?.message}
                />
                <TextField
                  label="パスワード"
                  type="password"
                  fullWidth
                  {...register("password")}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                />
                <Button variant="outlined" component="label">
                  アイコン画像を選ぶ（任意）
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </Button>
                {error && (
                  <Typography color="error" variant="body2">
                    {error}
                  </Typography>
                )}
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  登録する
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
