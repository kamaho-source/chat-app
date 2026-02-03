"use client";

import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Container,
  FormControlLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import FaceIcon from "@mui/icons-material/Face";
import StarIcon from "@mui/icons-material/Star";
import { postWithCsrf } from "@/lib/api";
import { useRouter } from "next/navigation";

const ICONS = [
  { label: "Person", icon: <PersonIcon /> },
  { label: "Face", icon: <FaceIcon /> },
  { label: "Star", icon: <StarIcon /> },
];

export default function UserNewPage() {
  const router = useRouter();
  const [form, setForm] = useState({ userId: "", name: "", password: "", role: "MEMBER" });
  const [iconChoice, setIconChoice] = useState("Person");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    try {
      await postWithCsrf("/api/auth/register", {
        userId: form.userId,
        name: form.name,
        password: form.password,
        role: form.role,
        icon: iconChoice,
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    }
  };

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Typography variant="h4" fontWeight={700}>
              ユーザー新規作成
            </Typography>
            <TextField
              label="ユーザーID"
              value={form.userId}
              onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
              required
            />
            <TextField
              label="氏名"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              label="パスワード"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
            <TextField
              label="ロール"
              select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <MenuItem value="ADMIN" disabled>
                admin（選択不可）
              </MenuItem>
              <MenuItem value="MANAGER" disabled>
                manager（選択不可）
              </MenuItem>
              <MenuItem value="MEMBER">member</MenuItem>
              <MenuItem value="VIEWER">viewer</MenuItem>
            </TextField>

            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={700}>
                アイコン選択
              </Typography>
              <RadioGroup
                row
                value={iconChoice}
                onChange={(e) => setIconChoice(e.target.value)}
              >
                {ICONS.map((item) => (
                  <FormControlLabel
                    key={item.label}
                    value={item.label}
                    control={<Radio />}
                    label={item.label}
                  />
                ))}
              </RadioGroup>
              <Button variant="outlined" component="label">
                画像アップロード
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ width: 56, height: 56 }}>
                  {iconFile ? "IMG" : ICONS.find((i) => i.label === iconChoice)?.icon}
                </Avatar>
                <Typography variant="body2">
                  {iconFile ? iconFile.name : "選択中: " + iconChoice}
                </Typography>
              </Stack>
            </Stack>

            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}

            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleSubmit}>
                作成
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
