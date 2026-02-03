"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { fetchJson, postWithCsrf } from "@/lib/api";

interface Classroom {
  id: number;
  name: string;
  code: string;
}

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newClass, setNewClass] = useState({ name: "", code: "" });
  const [bulkText, setBulkText] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await fetchJson<Classroom[]>("/api/classrooms");
      setClassrooms(data);
      if (data.length > 0 && !selectedClassId) setSelectedClassId(data[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createClass = async () => {
    setError(null);
    try {
      const created = await postWithCsrf<Classroom>("/api/classrooms", newClass);
      setClassrooms((prev) => [created, ...prev]);
      setNewClass({ name: "", code: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const bulkCreate = async () => {
    if (!selectedClassId) return;
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    const payload = lines.map((line) => {
      const [userId, password] = line.split(",");
      return { userId: userId?.trim(), password: password?.trim() };
    });
    try {
      await postWithCsrf(`/api/classrooms/${selectedClassId}/students/bulk`, payload);
      setBulkText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk create failed");
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>パソコン教室</Typography>
      {error && <Typography color="error">{error}</Typography>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">クラス作成</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="クラス名"
                value={newClass.name}
                onChange={(e) => setNewClass((prev) => ({ ...prev, name: e.target.value }))}
              />
              <TextField
                label="クラスコード（任意）"
                value={newClass.code}
                onChange={(e) => setNewClass((prev) => ({ ...prev, code: e.target.value }))}
              />
              <Button variant="contained" onClick={createClass}>作成</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">クラス一覧</Typography>
            <Stack spacing={1}>
              {classrooms.map((c) => (
                <Box key={c.id} sx={{ p: 2, borderRadius: 2, bgcolor: "background.default" }}>
                  <Typography fontWeight={600}>{c.name}</Typography>
                  <Typography variant="body2">コード: {c.code}</Typography>
                  <Button size="small" onClick={() => setSelectedClassId(c.id)}>このクラスに追加</Button>
                </Box>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Divider />

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">生徒アカウント一括作成</Typography>
            <Typography variant="body2" color="text.secondary">
              1行に「ID,パスワード」の形式で入力してください。
            </Typography>
            <TextField
              label="例: kid1,pass12345"
              multiline
              minRows={6}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <Button variant="contained" onClick={bulkCreate}>
              一括作成
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
