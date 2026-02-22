"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchJson, postWithCsrf } from "@/lib/api";
import { UserSummary } from "@/lib/types";
import SockJS from "sockjs-client";
import { Client, type StompSubscription } from "@stomp/stompjs";

type ProjectMessage = {
  id: number;
  senderId: number | null;
  content: string;
  createdAt?: string;
};

export default function ProjectChatPage() {
  const params = useParams();
  const projectId = Number(params?.projectId);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [content, setContent] = useState("");
  const upsertMessage = (prev: ProjectMessage[], incoming: ProjectMessage) => {
    let replaced = false;
    const next: ProjectMessage[] = [];
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
  const dedupeMessages = (items: ProjectMessage[]) => {
    const byId = new Map<number, ProjectMessage>();
    items.forEach((m) => {
      byId.set(m.id, m);
    });
    return [...byId.values()];
  };

  useEffect(() => {
    const load = async () => {
      const [msgs, userData] = await Promise.all([
        fetchJson<ProjectMessage[]>(`/api/projects/${projectId}/messages`),
        fetchJson<UserSummary[]>("/api/users"),
      ]);
      setMessages(dedupeMessages(msgs));
      setUsers(userData);
    };
    if (!Number.isNaN(projectId)) load();
    if (Number.isNaN(projectId)) return;
    const timer = window.setInterval(() => {
      load();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [projectId]);

  useEffect(() => {
    if (Number.isNaN(projectId)) return;
    let subscription: StompSubscription | null = null;
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws"),
      reconnectDelay: 5000,
      onConnect: () => {
        subscription = client.subscribe(`/topic/projects/${projectId}`, (frame) => {
          const incoming = JSON.parse(frame.body) as ProjectMessage;
          setMessages((prev) => upsertMessage(prev, incoming));
        });
      },
    });
    client.activate();
    return () => {
      subscription?.unsubscribe();
      client.deactivate();
    };
  }, [projectId]);

  const handleSend = async () => {
    if (!content.trim()) return;
    const created = await postWithCsrf<ProjectMessage>(`/api/projects/${projectId}/messages`, { content });
    setMessages((prev) => upsertMessage(prev, created));
    setContent("");
  };

  const resolveName = (id: number | null) => users.find((u) => u.id === id)?.name || "System";

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "32px" }}>
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="card-body">
          <h3>プロジェクトチャット</h3>
          <div style={{ maxHeight: 360, overflow: "auto", marginTop: "16px" }}>
            {messages.map((msg) => (
              <div key={msg.id} className="animate-pop" style={{ marginBottom: "12px" }}>
                <span style={{ fontWeight: 600 }}>{resolveName(msg.senderId)}</span>
                {msg.createdAt && (
                  <span style={{ marginLeft: "8px", fontSize: "0.8rem", color: "#888" }}>
                    {new Date(msg.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <p style={{ margin: "4px 0", fontSize: "1.05rem" }}>{msg.content}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "16px" }}>
            <textarea
              className="form-control"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <button className="btn" style={{ marginTop: "8px" }} onClick={handleSend}>
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
