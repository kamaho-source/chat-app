"use client";

import { useEffect, useState } from "react";
import { fetchJson, postWithCsrf } from "@/lib/api";
import { ChannelSummary } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function ProjectNewPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [form, setForm] = useState({ name: "", description: "", channelId: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<ChannelSummary[]>("/api/channels")
      .then(setChannels)
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, []);

  const handleSubmit = async () => {
    setError(null);
    try {
      await postWithCsrf("/api/projects", {
        name: form.name,
        description: form.description,
        channelId: form.channelId ? Number(form.channelId) : undefined,
      });
      router.push("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    }
  };

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "32px" }}>
      <div className="card">
        <div className="card-body">
          <h2>プロジェクト新規作成</h2>
          {error && <p className="text-muted">{error}</p>}
          <div className="row" style={{ marginTop: "16px" }}>
            <div className="col-6">
              <label>名前</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="col-6">
              <label>紐付けチャンネル</label>
              <select
                className="form-control"
                value={form.channelId}
                onChange={(e) => setForm((prev) => ({ ...prev, channelId: e.target.value }))}
              >
                <option value="">未選択</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <label>説明</label>
            <textarea
              className="form-control"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div style={{ marginTop: "16px" }}>
            <button className="btn" onClick={handleSubmit}>
              作成
            </button>
            <button className="btn btn-outline" onClick={() => router.push("/projects")} style={{ marginLeft: "8px" }}>
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
