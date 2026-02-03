"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchJson, postWithCsrf } from "@/lib/api";
import { UserSummary } from "@/lib/types";

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

  useEffect(() => {
    const load = async () => {
      const [msgs, userData] = await Promise.all([
        fetchJson<ProjectMessage[]>(`/api/projects/${projectId}/messages`),
        fetchJson<UserSummary[]>("/api/users"),
      ]);
      setMessages(msgs);
      setUsers(userData);
    };
    if (!Number.isNaN(projectId)) load();
  }, [projectId]);

  const handleSend = async () => {
    if (!content.trim()) return;
    const created = await postWithCsrf<ProjectMessage>(`/api/projects/${projectId}/messages`, { content });
    setMessages((prev) => [...prev, created]);
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
              <div key={msg.id} style={{ marginBottom: "12px" }}>
                <strong>{resolveName(msg.senderId)}</strong>
                <p style={{ margin: "4px 0" }}>{msg.content}</p>
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
      <p className="text-muted">リアルタイム更新はPusher/Echoの接続で対応予定。</p>
    </div>
  );
}
