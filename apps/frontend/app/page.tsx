"use client";

import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import LockIcon from "@mui/icons-material/Lock";
import BlockIcon from "@mui/icons-material/Block";
import TagIcon from "@mui/icons-material/Tag";
import SendIcon from "@mui/icons-material/Send";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteWithCsrf, fetchJson, patchWithCsrf, postFormWithCsrf, postWithCsrf } from "@/lib/api";
import { ChannelSummary, UserSummary } from "@/lib/types";
import MessageRenderer from "@/components/chat/MessageRenderer";
import AttachmentPreview from "@/components/chat/AttachmentPreview";
import MentionPopper from "@/components/chat/MentionPopper";
import SockJS from "sockjs-client";
import { Client, type StompSubscription } from "@stomp/stompjs";

type MessageSummary = {
  id: number | null;
  channelId: number;
  senderId: number | null;
  senderName?: string | null;
  senderAvatarUrl?: string | null;
  content: string | null;
  attachmentUrl?: string | null;
  edited?: boolean;
  createdAt?: string | null;
  readBy?: string[];
};

type ChannelMeta = {
  postingRestricted?: boolean;
  members?: number[];
  isDefault?: boolean;
};

type ChannelMemberRecord = { id: number; userId: number; role: string; canPost: boolean };

const SIDEBAR_KEY = "sidebar-collapsed";

export default function HomePage() {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [channelMeta, setChannelMeta] = useState<Record<number, ChannelMeta>>({});
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [me, setMe] = useState<UserSummary | null>(null);
  const [messageText, setMessageText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [channelMemberRecords, setChannelMemberRecords] = useState<Record<number, ChannelMemberRecord[]>>({});
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordTargetId, setPasswordTargetId] = useState<number | null>(null);
  const [newChannel, setNewChannel] = useState({ name: "", description: "", isPrivate: false, postingRestricted: false });
  const [newPassword, setNewPassword] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastMessageCount = useRef(0);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_KEY);
    setSidebarCollapsed(stored === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const loadInitial = useCallback(async () => {
    try {
      const [meData, channelData] = await Promise.all([
        fetchJson<UserSummary>("/api/auth/me"),
        fetchJson<ChannelSummary[]>("/api/channels"),
      ]);
      setMe(meData);
      setChannels(channelData);
      try {
        const userData = await fetchJson<UserSummary[]>("/api/users");
        setUsers(userData);
      } catch (userErr) {
        const status = userErr instanceof Error ? (userErr as Error & { status?: number }).status : undefined;
        if (status !== 403) {
          throw userErr;
        }
        setUsers([]);
      }
      if (channelData.length && !selectedChannelId) {
        setSelectedChannelId(channelData[0].id);
      }
      setChannelMeta((prev) => {
        const next = { ...prev };
        channelData.forEach((channel, idx) => {
          if (!next[channel.id]) {
            next[channel.id] = {
              postingRestricted: false,
              members: [],
              isDefault: idx === 0 || channel.name.toLowerCase() === "general",
            };
          }
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  }, [selectedChannelId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const upsertMessage = useCallback((prev: MessageSummary[], incoming: MessageSummary) => {
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
  }, []);

  const dedupeMessages = useCallback((items: MessageSummary[]) => {
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
  }, []);

  const loadMessages = useCallback(async () => {
    if (!selectedChannelId) return;
    try {
      const data = await fetchJson<MessageSummary[]>(`/api/channels/${selectedChannelId}/messages`);
      setMessages(dedupeMessages(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Messages load failed");
    }
  }, [selectedChannelId, dedupeMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!selectedChannelId) return;
    const timer = window.setInterval(() => {
      loadMessages();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [selectedChannelId, loadMessages]);

  useEffect(() => {
    if (!selectedChannelId) return;
    let subscription: StompSubscription | null = null;
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws"),
      reconnectDelay: 5000,
      onConnect: () => {
        subscription = client.subscribe(`/topic/channels/${selectedChannelId}`, (frame) => {
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
  }, [selectedChannelId, upsertMessage]);

  useEffect(() => {
    if (!me?.name) return;
    if (messages.length <= lastMessageCount.current) {
      lastMessageCount.current = messages.length;
      return;
    }
    const newMessages = messages.slice(lastMessageCount.current);
    lastMessageCount.current = messages.length;
    const matched = newMessages.find((m) => m.content?.includes(me.name));
    if (matched && "Notification" in window) {
      const notify = () => new Notification("メンションされました", { body: matched.content || "" });
      if (Notification.permission === "granted") {
        notify();
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") notify();
        });
      }
    }
  }, [messages, me]);

  const filteredChannels = useMemo(() => {
    if (!me) return channels;
    return channels.filter((channel) => {
      if (!channel.name.startsWith("dm:")) return true;
      const [, ids] = channel.name.split("dm:");
      if (!ids) return false;
      const [a, b] = ids.split("-").map(Number);
      return a === me.id || b === me.id;
    });
  }, [channels, me]);

  const channelById = useMemo(() => {
    const map = new Map<number, ChannelSummary>();
    channels.forEach((c) => map.set(c.id, c));
    return map;
  }, [channels]);

  const usersById = useMemo(() => {
    const map = new Map<number, UserSummary>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const activeChannel = selectedChannelId ? channelById.get(selectedChannelId) : undefined;

  const handleChannelSelect = (id: number) => {
    setSelectedChannelId(id);
    if (isMobile) setMobileOpen(false);
  };

  const handleFileAdd = (files: FileList | File[]) => {
    const next: File[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > 1024 * 1024 * 1024) {
        setError(`${file.name} は1GBを超えています。`);
        return;
      }
      next.push(file);
    });
    if (next.length) {
      setPendingFiles((prev) => [...prev, ...next]);
    }
  };

  const handleSend = async () => {
    if (!selectedChannelId) return;
    if (!messageText.trim() && pendingFiles.length === 0) return;
    setError(null);
    try {
      if (pendingFiles.length === 0) {
        const form = new FormData();
        form.append("content", messageText);
        const created = await postFormWithCsrf<MessageSummary>(`/api/channels/${selectedChannelId}/messages`, form);
        setMessages((prev) => upsertMessage(prev, created));
      } else {
        for (const [idx, file] of pendingFiles.entries()) {
          const form = new FormData();
          if (idx === 0 && messageText) form.append("content", messageText);
          form.append("file", file);
          const created = await postFormWithCsrf<MessageSummary>(`/api/channels/${selectedChannelId}/messages`, form);
          setMessages((prev) => upsertMessage(prev, created));
        }
      }
      setMessageText("");
      setPendingFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    }
  };

  const handleMentionSelect = (user: UserSummary) => {
    const match = /@([^\s@]*)$/.exec(messageText);
    if (!match) return;
    const next = messageText.slice(0, match.index) + `@${user.name} `;
    setMessageText(next);
    setMentionQuery("");
    setMentionIndex(0);
  };

  const visibleMentionUsers = useMemo(() => {
    if (!mentionQuery) return [];
    return users
      .filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
      .slice(0, 8);
  }, [mentionQuery, users]);

  const canPost = useMemo(() => {
    if (!me || !selectedChannelId) return false;
    if (me.role === "ADMIN" || me.role === "MANAGER") return true;
    if (me.role === "VIEWER") return false;
    if (channelMeta[selectedChannelId]?.postingRestricted) return false;
    return true;
  }, [me, selectedChannelId, channelMeta]);

  const handleCreateChannel = async () => {
    try {
      const created = await postWithCsrf<ChannelSummary>("/api/channels", {
        name: newChannel.name,
        description: newChannel.description,
        isPrivate: newChannel.isPrivate,
      });
      setChannels((prev) => [created, ...prev]);
      setChannelMeta((prev) => ({
        ...prev,
        [created.id]: { postingRestricted: newChannel.postingRestricted, members: [] },
      }));
      setChannelDialogOpen(false);
      setNewChannel({ name: "", description: "", isPrivate: false, postingRestricted: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const handleDeleteChannel = async () => {
    if (!activeChannel || !selectedChannelId) return;
    if (channelMeta[selectedChannelId]?.isDefault) return;
    try {
      await deleteWithCsrf(`/api/channels/${activeChannel.id}`);
      setChannels((prev) => prev.filter((c) => c.id !== activeChannel.id));
      setSelectedChannelId((prev) => {
        const remaining = channels.filter((c) => c.id !== activeChannel.id);
        return remaining[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const loadAccessMembers = useCallback(async (channelId: number) => {
    try {
      const members = await fetchJson<ChannelMemberRecord[]>(`/api/channels/${channelId}/members`);
      setChannelMemberRecords((prev) => ({ ...prev, [channelId]: members }));
      setChannelMeta((prev) => ({
        ...prev,
        [channelId]: { ...prev[channelId], members: members.map((m) => m.userId) },
      }));
    } catch {
      // 権限がない場合などは無視
    }
  }, []);

  const handleAccessSave = async () => {
    if (!activeChannel || !selectedChannelId) return;
    try {
      await patchWithCsrf(`/api/channels/${activeChannel.id}/privacy`, {
        isPrivate: activeChannel.isPrivate,
      });

      const desiredUserIds = channelMeta[selectedChannelId]?.members || [];
      const actualRecords = channelMemberRecords[selectedChannelId] || [];
      const actualUserIds = actualRecords.map((m) => m.userId);

      for (const userId of desiredUserIds) {
        if (!actualUserIds.includes(userId)) {
          await postWithCsrf(`/api/channels/${selectedChannelId}/members`, {
            userId,
            role: "MEMBER",
            canPost: true,
          });
        }
      }

      for (const record of actualRecords) {
        if (!desiredUserIds.includes(record.userId)) {
          await deleteWithCsrf(`/api/channels/${selectedChannelId}/members/${record.id}`);
        }
      }

      await loadAccessMembers(selectedChannelId);
      const refreshed = await fetchJson<ChannelSummary[]>("/api/channels");
      setChannels(refreshed);
      setAccessDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDmCreate = async (userId: number) => {
    if (!me) return;
    const [small, big] = [me.id, userId].sort((a, b) => a - b);
    const name = `dm:${small}-${big}`;
    try {
      const created = await postWithCsrf<ChannelSummary>("/api/channels", {
        name,
        description: "DM",
        isPrivate: true,
      });
      setChannels((prev) => [created, ...prev]);
      setSelectedChannelId(created.id);
      setDmDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "DM作成に失敗しました");
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordTargetId || !newPassword) return;
    try {
      await patchWithCsrf(`/api/users/${passwordTargetId}`, { password: newPassword });
      setPasswordDialogOpen(false);
      setNewPassword("");
      setPasswordTargetId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "パスワード変更に失敗しました");
    }
  };

  const sidebarWidth = sidebarCollapsed && !isMobile ? 80 : 280;

  const renderChannelLabel = (channel: ChannelSummary) => {
    if (!me) return `# ${channel.name}`;
    if (!channel.name.startsWith("dm:")) return `# ${channel.name}`;
    const [, ids] = channel.name.split("dm:");
    if (!ids) return channel.name;
    const [a, b] = ids.split("-").map(Number);
    const targetId = a === me.id ? b : a;
    const target = usersById.get(targetId);
    return `@ ${target?.name || "DM"} 🔒`;
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
      <AppBar position="fixed" color="inherit" elevation={1} sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: "flex", gap: 2 }}>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ display: { md: "none" } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            鎌倉児童ホームチャット
          </Typography>
          <Chip label={activeChannel ? renderChannelLabel(activeChannel) : "チャンネル未選択"} />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="チャンネル追加">
            <IconButton onClick={() => setChannelDialogOpen(true)}>
              <AddIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)}>
            <Badge color="secondary" variant="dot">
              <Avatar src={me?.avatarUrl || undefined}>{me?.name?.slice(0, 1)}</Avatar>
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: sidebarWidth,
            boxSizing: "border-box",
            pt: 8,
            bgcolor: "var(--cw-panel)",
          },
        }}
      >
        <Stack sx={{ height: "100%" }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              チャンネル
            </Typography>
            {!isMobile && (
              <IconButton size="small" onClick={() => setSidebarCollapsed((prev) => !prev)}>
                <MenuIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
          <Divider />
          <List className="cw-scroll" sx={{ flex: 1 }}>
            {filteredChannels.map((channel) => {
              const isActive = channel.id === selectedChannelId;
              const meta = channelMeta[channel.id];
              const isDm = channel.name.startsWith("dm:");
              return (
                <ListItemButton key={channel.id} selected={isActive} onClick={() => handleChannelSelect(channel.id)}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {isDm ? <LockIcon fontSize="small" /> : <TagIcon fontSize="small" />}
                  </ListItemIcon>
                  {!sidebarCollapsed && (
                    <ListItemText
                      primary={renderChannelLabel(channel)}
                      secondaryTypographyProps={{ component: "div" }}
                      secondary={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {channel.isPrivate && <LockIcon fontSize="inherit" />}
                          {meta?.postingRestricted && <BlockIcon fontSize="inherit" />}
                        </Stack>
                      }
                    />
                  )}
                  {sidebarCollapsed && channel.isPrivate && <LockIcon fontSize="inherit" />}
                </ListItemButton>
              );
            })}
          </List>
          <Divider />
          <Stack spacing={1} sx={{ p: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setAccessDialogOpen(true);
                if (selectedChannelId) loadAccessMembers(selectedChannelId);
              }}
              startIcon={<AdminPanelSettingsIcon />}
              disabled={!me || (me.role !== "ADMIN" && me.role !== "MANAGER")}
            >
              アクセス設定
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column", pt: 10 }}>
        <Stack sx={{ flex: 1, px: { xs: 2, md: 4 }, pb: 2 }}>
          <Stack spacing={2} sx={{ flex: 1, overflow: "hidden" }}>
            {error && (
              <Paper sx={{ p: 1.5, borderLeft: "4px solid var(--cw-danger)" }}>
                <Typography color="error">{error}</Typography>
              </Paper>
            )}
            <Paper sx={{ flex: 1, p: 2, overflowY: "auto" }} className="cw-scroll">
              <Stack spacing={2}>
                {messages.map((message, idx) => {
                  const sender = message.senderId ? usersById.get(message.senderId) : null;
                  const senderName = sender?.name || message.senderName || "System";
                  const senderAvatar = sender?.avatarUrl || message.senderAvatarUrl || undefined;
                  return (
                    <Paper key={message.id ?? `tmp-${idx}`} className="animate-pop" sx={{ p: 2, bgcolor: "background.paper" }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Avatar src={senderAvatar}>
                          {senderName.slice(0, 1)}
                        </Avatar>
                        <Stack spacing={1} sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle2">{senderName}</Typography>
                            {message.createdAt && (
                              <Typography variant="caption" color="text.secondary">
                                {new Date(message.createdAt).toLocaleString("ja-JP", {
                                  timeZone: "Asia/Tokyo",
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Typography>
                            )}
                            {message.edited && <Chip size="small" label="編集済み" />}
                          </Stack>
                          {message.content && <MessageRenderer content={message.content} />}
                          {message.attachmentUrl && <AttachmentPreview url={message.attachmentUrl} />}
                          {message.readBy && message.readBy.length > 0 && (
                            <Typography variant="caption" className="cw-muted">
                              既読: {message.readBy.join(", ")}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Paper>

            <Paper
              sx={{ p: 2 }}
              onDrop={(e) => {
                e.preventDefault();
                handleFileAdd(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <Stack spacing={2}>
                {pendingFiles.length > 0 && (
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">送信前プレビュー</Typography>
                    <Stack spacing={2}>
                      {pendingFiles.map((file, idx) => (
                        <Paper key={`${file.name}-${idx}`} sx={{ p: 1.5 }}>
                          <AttachmentPreview file={file} />
                          <Button
                            size="small"
                            onClick={() =>
                              setPendingFiles((prev) => prev.filter((_, fileIdx) => fileIdx !== idx))
                            }
                          >
                            削除
                          </Button>
                        </Paper>
                      ))}
                    </Stack>
                  </Stack>
                )}
                <TextField
                  inputRef={inputRef}
                  value={messageText}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMessageText(value);
                    const match = /@([^\s@]*)$/.exec(value);
                    setMentionQuery(match ? match[1] : "");
                    setMentionIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (mentionQuery && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                      e.preventDefault();
                      setMentionIndex((prev) =>
                        e.key === "ArrowDown"
                          ? Math.min(prev + 1, visibleMentionUsers.length - 1)
                          : Math.max(prev - 1, 0)
                      );
                    }
                    if (mentionQuery && (e.key === "Enter" || e.key === "Tab")) {
                      if (visibleMentionUsers[mentionIndex]) {
                        e.preventDefault();
                        handleMentionSelect(visibleMentionUsers[mentionIndex]);
                      }
                    }
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={canPost ? "メッセージを入力（Ctrl/⌘+Enterで送信）" : "投稿権限がありません"}
                  multiline
                  minRows={2}
                  disabled={!canPost}
                  onPaste={(e) => {
                    if (e.clipboardData.files.length > 0) {
                      handleFileAdd(e.clipboardData.files);
                    }
                  }}
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                  <Button variant="outlined" component="label">
                    ファイルを選択
                    <input hidden type="file" multiple onChange={(e) => e.target.files && handleFileAdd(e.target.files)} />
                  </Button>
                  <Typography variant="caption" className="cw-muted">
                    クリック/ドラッグ&ドロップ/貼り付け対応（最大1GB）
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Button variant="contained" endIcon={<SendIcon />} onClick={handleSend} disabled={!canPost}>
                    送信
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </Box>

      <MentionPopper
        anchorEl={inputRef.current}
        open={mentionQuery.length > 0 && visibleMentionUsers.length > 0}
        users={visibleMentionUsers}
        selectedIndex={mentionIndex}
        onSelect={handleMentionSelect}
      />

      <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={() => setUserMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setDmDialogOpen(true);
            setUserMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          DM開始
        </MenuItem>
        <MenuItem
          onClick={() => {
            router.push("/users/edit");
            setUserMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <Avatar sx={{ width: 20, height: 20 }} src={me?.avatarUrl || undefined}>
              {me?.name?.slice(0, 1)}
            </Avatar>
          </ListItemIcon>
          プロフィール編集
        </MenuItem>
        {me?.role === "ADMIN" && (
          <MenuItem
            onClick={() => {
              router.push("/admin");
              setUserMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" />
            </ListItemIcon>
            管理者ダッシュボード
          </MenuItem>
        )}
        {(me?.role === "ADMIN" || me?.role === "MANAGER") && (
          <MenuItem
            onClick={() => {
              router.push("/manager");
              setUserMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" />
            </ListItemIcon>
            マネージャーダッシュボード
          </MenuItem>
        )}
        {me?.role === "ADMIN" && (
          <MenuItem
            onClick={() => {
              setPasswordDialogOpen(true);
              setUserMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" />
            </ListItemIcon>
            他ユーザーのパスワード変更
          </MenuItem>
        )}
        <MenuItem
          onClick={async () => {
            try {
              await postWithCsrf("/api/auth/logout", {});
              router.push("/login");
            } catch {
              router.push("/login");
            }
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          ログアウト
        </MenuItem>
      </Menu>

      <Dialog open={channelDialogOpen} onClose={() => setChannelDialogOpen(false)}>
        <DialogTitle>チャンネル作成</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, mt: 1 }}>
          <TextField
            label="チャンネル名"
            value={newChannel.name}
            onChange={(e) => setNewChannel((prev) => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            label="説明"
            value={newChannel.description}
            onChange={(e) => setNewChannel((prev) => ({ ...prev, description: e.target.value }))}
          />
          <FormControlLabel
            control={
              <Switch
                checked={newChannel.isPrivate}
                onChange={(e) => setNewChannel((prev) => ({ ...prev, isPrivate: e.target.checked }))}
              />
            }
            label="限定公開"
          />
          <FormControlLabel
            control={
              <Switch
                checked={newChannel.postingRestricted}
                onChange={(e) =>
                  setNewChannel((prev) => ({ ...prev, postingRestricted: e.target.checked }))
                }
              />
            }
            label="投稿制限"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChannelDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleCreateChannel}>
            作成
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dmDialogOpen} onClose={() => setDmDialogOpen(false)}>
        <DialogTitle>DM開始</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1 }}>
          {users
            .filter((u) => u.id !== me?.id)
            .map((user) => (
              <ListItemButton key={user.id} onClick={() => handleDmCreate(user.id)}>
                <ListItemText primary={user.name} secondary={user.email} />
              </ListItemButton>
            ))}
        </DialogContent>
      </Dialog>

      <Dialog open={accessDialogOpen} onClose={() => setAccessDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>アクセス設定</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, mt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(activeChannel?.isPrivate)}
                onChange={(e) => {
                  if (!activeChannel) return;
                  setChannels((prev) =>
                    prev.map((c) => (c.id === activeChannel.id ? { ...c, isPrivate: e.target.checked } : c))
                  );
                }}
              />
            }
            label="限定公開"
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(channelMeta[selectedChannelId || -1]?.postingRestricted)}
                onChange={(e) => {
                  if (!selectedChannelId) return;
                  setChannelMeta((prev) => ({
                    ...prev,
                    [selectedChannelId]: { ...prev[selectedChannelId], postingRestricted: e.target.checked },
                  }));
                }}
              />
            }
            label="投稿制限"
          />
          <Typography variant="subtitle2">閲覧メンバー</Typography>
          <Stack spacing={1}>
            {users.map((user) => {
              const selected =
                channelMeta[selectedChannelId || -1]?.members?.includes(user.id) ?? false;
              return (
                <FormControlLabel
                  key={user.id}
                  control={
                    <Switch
                      checked={selected}
                      onChange={(e) => {
                        if (!selectedChannelId) return;
                        setChannelMeta((prev) => {
                          const current = prev[selectedChannelId]?.members || [];
                          const nextMembers = e.target.checked
                            ? [...current, user.id]
                            : current.filter((id) => id !== user.id);
                          return {
                            ...prev,
                            [selectedChannelId]: { ...prev[selectedChannelId], members: nextMembers },
                          };
                        });
                      }}
                    />
                  }
                  label={user.name}
                />
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          {me?.role === "ADMIN" && (
            <Button color="error" onClick={handleDeleteChannel} disabled={channelMeta[selectedChannelId || -1]?.isDefault}>
              削除
            </Button>
          )}
          <Button onClick={() => setAccessDialogOpen(false)}>閉じる</Button>
          <Button variant="contained" onClick={handleAccessSave}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
        <DialogTitle>パスワード変更</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, mt: 1 }}>
          <TextField
            label="対象ユーザー"
            select
            SelectProps={{ native: true }}
            value={passwordTargetId ?? ""}
            onChange={(e) => setPasswordTargetId(Number(e.target.value))}
          >
            <option value="">選択してください</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </TextField>
          <TextField
            label="新しいパスワード"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handlePasswordChange}>
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
