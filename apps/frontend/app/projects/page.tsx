"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import { ProjectSummary } from "@/lib/types";
import Link from "next/link";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<ProjectSummary[]>("/api/projects")
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, []);

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "32px" }}>
      <div className="row" style={{ alignItems: "center", marginBottom: "16px" }}>
        <div className="col">
          <h2>プロジェクト一覧</h2>
        </div>
        <div className="col" style={{ textAlign: "right" }}>
          <Link href="/projects/new" className="btn">
            新規作成
          </Link>
        </div>
      </div>
      {error && <p className="text-muted">{error}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>名前</th>
            <th>説明</th>
            <th>公開</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>{project.name}</td>
              <td>{project.description || "説明なし"}</td>
              <td>{project.isPrivate ? "限定" : "公開"}</td>
              <td>
                <Link href={`/projects/${project.id}`} className="btn btn-sm btn-outline">
                  開く
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
