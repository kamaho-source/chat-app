"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { fetchJson, postWithCsrf } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const schema = z.object({
  userId: z.string().min(2),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    fetchJson("/api/auth/me")
      .then(() => router.replace("/"))
      .catch(() => {});
  }, [router]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await postWithCsrf("/api/auth/login", data);
      router.push("/");
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 401) {
        setError("ユーザーIDかパスワードが違います。");
      } else if (status === 403) {
        setError("ログインの準備に失敗しました。");
      } else {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4 }} className="animate-fade-up">
          <Stack spacing={2}>
            <Typography variant="h4" fontWeight={700}>
              ログイン
            </Typography>
            <Typography color="text.secondary">ユーザーIDとパスワードでログインします。</Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2}>
                <TextField
                  label="ユーザーID"
                  fullWidth
                  {...register("userId")}
                  error={!!errors.userId}
                  helperText={errors.userId?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="パスワード"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  {...register("password")}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {error && (
                  <Typography color="error" variant="body2">
                    {error}
                  </Typography>
                )}
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  ログイン
                </Button>
                <Button component={Link} href="/users/new" variant="outlined">
                  新規登録
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
