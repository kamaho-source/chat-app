"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchJson, postFormWithCsrf } from "@/lib/api";

type ProjectFile = {
  id: number;
  name: string;
  url: string;
};

export default function ProjectFilesPage() {
  const params = useParams();
  const projectId = Number(params?.projectId);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJson<ProjectFile[]>(`/api/projects/${projectId}/files`);
        setFiles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      }
    };
    if (!Number.isNaN(projectId)) load();
  }, [projectId]);

  const handleUpload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const created = await postFormWithCsrf<ProjectFile>(`/api/projects/${projectId}/files`, form);
      setFiles((prev) => [created, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "32px" }}>
      <div className="card">
        <div className="card-body">
          <h3>ファイル管理</h3>
          {error && <p className="text-muted">{error}</p>}
          <div style={{ marginTop: "16px" }}>
            <label className="btn btn-outline">
              アップロード
              <input hidden type="file" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </label>
          </div>
          <div className="row" style={{ marginTop: "16px" }}>
            {files.map((file) => (
              <div key={file.id} className="col-4" style={{ marginBottom: "16px" }}>
                <div className="card">
                  <div className="card-body">
                    <div style={{ marginBottom: "8px" }}>
                      {file.url.match(/\.(png|jpg|jpeg|gif|webp)$/) ? (
                        <img src={file.url} alt={file.name} style={{ maxWidth: "100%" }} />
                      ) : (
                        <span className="badge">FILE</span>
                      )}
                    </div>
                    <div>{file.name}</div>
                    <a className="btn btn-sm btn-outline" href={file.url} download>
                      ダウンロード
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
