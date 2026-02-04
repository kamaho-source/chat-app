"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { deleteWithCsrf, fetchJson, patchWithCsrf, postFormWithCsrf, postWithCsrf } from "@/lib/api";
import SockJS from "sockjs-client";
import { Client, type StompSubscription } from "@stomp/stompjs";

interface ChannelSummary {
  id: number;
  name: string;
  description?: string | null;
  isPrivate: boolean;
}

interface MessageSummary {
  id: number | null;
  channelId: number;
  senderId: number | null;
  senderName?: string | null;
  senderAvatarUrl?: string | null;
  content: string | null;
  attachmentUrl?: string | null;
  edited: boolean;
}

interface ChannelMemberSummary {
  id: number;
  userId: number;
  role: "OWNER" | "MEMBER" | "VIEWER";
  canPost: boolean;
}

export default function ChannelDetailPage() {
  const params = useParams();
  const channelId = Number(params?.id);
  const [channel, setChannel] = useState<ChannelSummary | null>(null);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [members, setMembers] = useState<ChannelMemberSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState<Record<number, string>>({});
  const [newMember, setNewMember] = useState({ userId: "", role: "MEMBER", canPost: true });
  const [settings, setSettings] = useState({ name: "", description: "", isPrivate: false });
  const upsertMessage = (prev: MessageSummary[], incoming: MessageSummary) => {
    if (incoming.id == null) return [...prev, incoming];
    let replaced = false;
    const next: MessageSummary[] = [];
    prev.forEach((m) => {
      if (m.id === incoming.id) {
        if (!replaced) {
          next.push({ ...m, ...incoming });
          replaced = true;
        }
      } else {
        next.push(m);
      }
    });
    if (!replaced) next.push(incoming);
    return next;
  };
  const dedupeMessages = (items: MessageSummary[]) => {
    const byId = new Map<number, MessageSummary>();
    const withoutId: MessageSummary[] = [];
    items.forEach((m) => {
      if (m.id == null) {
        withoutId.push(m);
      } else {
        byId.set(m.id, m);
      }
    });
    return [...byId.values(), ...withoutId];
  };

  const load = async () => {
    try {
      const [c, msgs, mems] = await Promise.all([
        fetchJson<ChannelSummary>(`/api/channels/${channelId}`),
        fetchJson<MessageSummary[]>(`/api/channels/${channelId}/messages`),
        fetchJson<ChannelMemberSummary[]>(`/api/channels/${channelId}/members`),
      ]);
      setChannel(c);
      setMessages(dedupeMessages(msgs));
      setMembers(mems);
      setSettings({ name: c.name, description: c.description || "", isPrivate: c.isPrivate });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  };

  useEffect(() => {
    if (!Number.isNaN(channelId)) load();
  }, [channelId]);

  useEffect(() => {
    if (Number.isNaN(channelId)) return;
    const timer = window.setInterval(() => {
      load();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [channelId]);

  useEffect(() => {
    if (Number.isNaN(channelId)) return;
    let subscription: StompSubscription | null = null;
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws"),
      reconnectDelay: 5000,
      onConnect: () => {
        subscription = client.subscribe(`/topic/channels/${channelId}`, (frame) => {
          const incoming = JSON.parse(frame.body) as MessageSummary;
          setMessages((prev) => upsertMessage(prev, incoming));
        });
      },
    });
    client.activate();
    return () => {
      subscription?.unsubscribe();
      client.deactivate();
    };
  }, [channelId]);

  const sendMessage = async (file?: File) => {
    setError(null);
    try {
      const form = new FormData();
      if (content) form.append("content", content);
      if (file) form.append("file", file);
      const created = await postFormWithCsrf<MessageSummary>(`/api/channels/${channelId}/messages`, form);
      setMessages((prev) => upsertMessage(prev, created));
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    }
  };

  const updateMessage = async (messageId: number) => {
    const newText = editContent[messageId];
    if (!newText) return;
    try {
      const updated = await patchWithCsrf<MessageSummary>(`/api/messages/${messageId}`, { content: newText });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
      setEditContent((prev) => ({ ...prev, [messageId]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed");
    }
  };

  const addMember = async () => {
    setError(null);
    try {
      const created = await postWithCsrf<ChannelMemberSummary>(`/api/channels/${channelId}/members`, {
        userId: Number(newMember.userId),
        role: newMember.role,
        canPost: newMember.canPost,
      });
      setMembers((prev) => [created, ...prev]);
      setNewMember({ userId: "", role: "MEMBER", canPost: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add member failed");
    }
  };

  const updateMember = async (member: ChannelMemberSummary) => {
    try {
      const updated = await patchWithCsrf<ChannelMemberSummary>(
        `/api/channels/${channelId}/members/${member.id}`,
        { userId: member.userId, role: member.role, canPost: member.canPost }
      );
      setMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update member failed");
    }
  };

  const updateChannel = async () => {
    try {
      const updated = await patchWithCsrf<ChannelSummary>(`/api/channels/${channelId}`, {
        name: settings.name,
        description: settings.description,
        isPrivate: settings.isPrivate,
      });
      setChannel(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const deleteChannel = async () => {
    try {
      await deleteWithCsrf(`/api/channels/${channelId}`);
      window.location.href = "/channels";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>{channel?.name || "チャンネル"}</Typography>
      {error && <Typography color="error">{error}</Typography>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">チャンネル設定</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="名前"
                value={settings.name}
                onChange={(e) => setSettings((prev) => ({ ...prev, name: e.target.value }))}
              />
              <TextField
                label="説明"
                value={settings.description}
                onChange={(e) => setSettings((prev) => ({ ...prev, description: e.target.value }))}
              />
              <TextField
                label="公開/非公開"
                select
                SelectProps={{ native: true }}
                value={settings.isPrivate ? "private" : "public"}
                onChange={(e) => setSettings((prev) => ({ ...prev, isPrivate: e.target.value === "private" }))}
              >
                <option value="public">公開</option>
                <option value="private">非公開</option>
              </TextField>
              <Button variant="contained" onClick={updateChannel}>更新</Button>
              <Button color="error" onClick={deleteChannel}>削除</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">メッセージ</Typography>
            <Stack spacing={1}>
              {messages.map((m, idx) => (
                <Box key={m.id ?? `tmp-${idx}`} className="animate-pop" sx={{ p: 2, borderRadius: 2, bgcolor: "background.default" }}>
                  <Typography variant="subtitle2">送信者: {m.senderName || m.senderId || "System"}</Typography>
                  <Typography>{m.content}</Typography>
                  {m.attachmentUrl && (
                    <Typography variant="caption">添付: {m.attachmentUrl}</Typography>
                  )}
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <TextField
                      size="small"
                      placeholder="編集内容"
                      value={editContent[m.id] || ""}
                      onChange={(e) => setEditContent((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    />
                    <Button size="small" onClick={() => updateMessage(m.id)}>編集</Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Divider />
            <TextField
              label="メッセージ"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              fullWidth
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Button variant="contained" onClick={() => sendMessage()}>送信</Button>
              <Button variant="outlined" component="label">
                ファイル送信
                <input hidden type="file" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) sendMessage(file);
                }} />
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">メンバー管理</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="ユーザーID"
                value={newMember.userId}
                onChange={(e) => setNewMember((prev) => ({ ...prev, userId: e.target.value }))}
              />
              <TextField
                label="ロール"
                select
                SelectProps={{ native: true }}
                value={newMember.role}
                onChange={(e) => setNewMember((prev) => ({ ...prev, role: e.target.value as ChannelMemberSummary["role"] }))}
              >
                <option value="OWNER">OWNER</option>
                <option value="MEMBER">MEMBER</option>
                <option value="VIEWER">VIEWER</option>
              </TextField>
              <TextField
                label="投稿権限"
                select
                SelectProps={{ native: true }}
                value={newMember.canPost ? "yes" : "no"}
                onChange={(e) => setNewMember((prev) => ({ ...prev, canPost: e.target.value === "yes" }))}
              >
                <option value="yes">許可</option>
                <option value="no">不可</option>
              </TextField>
              <Button variant="contained" onClick={addMember}>追加</Button>
            </Stack>
            <Divider />
            <Stack spacing={1}>
              {members.map((member) => (
                <Stack key={member.id} direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <Typography>User: {member.userId}</Typography>
                  <TextField
                    label="ロール"
                    select
                    SelectProps={{ native: true }}
                    value={member.role}
                    onChange={(e) => setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: e.target.value as ChannelMemberSummary["role"] } : m)))}
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </TextField>
                  <TextField
                    label="投稿権限"
                    select
                    SelectProps={{ native: true }}
                    value={member.canPost ? "yes" : "no"}
                    onChange={(e) => setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, canPost: e.target.value === "yes" } : m)))}
                  >
                    <option value="yes">許可</option>
                    <option value="no">不可</option>
                  </TextField>
                  <Button onClick={() => updateMember(member)}>更新</Button>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
