"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deleteWithCsrf, fetchJson, patchWithCsrf, postWithCsrf } from "@/lib/api";
import { ProjectSummary, UserSummary } from "@/lib/types";

type ProjectMember = {
  id: number;
  userId: number;
  role: "OWNER" | "MEMBER" | "VIEWER";
  visible: boolean;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params?.projectId);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newMemberUserId, setNewMemberUserId] = useState<number | "">("");
  const [newMemberRole, setNewMemberRole] = useState<ProjectMember["role"]>("MEMBER");
  const [newMemberVisible, setNewMemberVisible] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [projectData, memberData, userData] = await Promise.all([
          fetchJson<ProjectSummary>(`/api/projects/${projectId}`),
          fetchJson<ProjectMember[]>(`/api/projects/${projectId}/members`),
          fetchJson<UserSummary[]>("/api/users"),
        ]);
        setProject(projectData);
        setMembers(memberData);
        setUsers(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      }
    };
    if (!Number.isNaN(projectId)) load();
  }, [projectId]);

  const updateProject = async (patch: Partial<ProjectSummary>) => {
    if (!project) return;
    try {
      const updated = await patchWithCsrf<ProjectSummary>(`/api/projects/${project.id}`, patch);
      setProject(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  const addMember = async () => {
    if (!project || newMemberUserId === "") return;
    try {
      const created = await postWithCsrf<ProjectMember>(`/api/projects/${project.id}/members`, {
        userId: newMemberUserId,
        role: newMemberRole,
        visible: newMemberVisible,
      });
      setMembers((prev) => [...prev, created]);
      setNewMemberUserId("");
      setNewMemberRole("MEMBER");
      setNewMemberVisible(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "追加に失敗しました");
    }
  };

  const updateMember = async (member: ProjectMember, patch: Partial<ProjectMember>) => {
    if (!project) return;
    const next = { ...member, ...patch };
    try {
      const updated = await patchWithCsrf<ProjectMember>(`/api/projects/${project.id}/members/${member.id}`, {
        userId: next.userId,
        role: next.role,
        visible: next.visible,
      });
      setMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  const removeMember = async (member: ProjectMember) => {
    if (!project) return;
    try {
      await deleteWithCsrf(`/api/projects/${project.id}/members/${member.id}`);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "32px" }}>
      <div className="row" style={{ marginBottom: "16px" }}>
        <div className="col">
          <h2>プロジェクト詳細</h2>
        </div>
        <div className="col" style={{ textAlign: "right" }}>
          <button className="btn btn-outline" onClick={() => router.push(`/projects/${projectId}/chat`)}>
            チャットへ
          </button>
        </div>
      </div>
      {error && <p className="text-muted">{error}</p>}
      {project && (
        <>
          <div className="card" style={{ marginBottom: "16px" }}>
            <div className="card-body">
              <div className="row">
                <div className="col-6">
                  <h4>{project.name}</h4>
                  <p className="text-muted">{project.description || "説明なし"}</p>
                </div>
                <div className="col-6" style={{ textAlign: "right" }}>
                  <label style={{ marginRight: "8px" }}>公開フラグ</label>
                  <input
                    type="checkbox"
                    checked={!project.isPrivate}
                    onChange={(e) => updateProject({ isPrivate: !e.target.checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h4>メンバー管理</h4>
              <div className="row" style={{ marginBottom: "12px" }}>
                <div className="col-6">
                  <select
                    className="form-control"
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">ユーザーを選択</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-3">
                  <select
                    className="form-control"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as ProjectMember["role"])}
                  >
                    <option value="OWNER">オーナー</option>
                    <option value="MEMBER">メンバー</option>
                    <option value="VIEWER">閲覧のみ</option>
                  </select>
                </div>
                <div className="col-2" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="checkbox"
                    checked={newMemberVisible}
                    onChange={(e) => setNewMemberVisible(e.target.checked)}
                  />
                  <span>表示</span>
                </div>
                <div className="col-1" style={{ textAlign: "right" }}>
                  <button className="btn btn-sm" onClick={addMember} disabled={newMemberUserId === ""}>
                    追加
                  </button>
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>メンバー</th>
                    <th>権限</th>
                    <th>表示</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const user = users.find((u) => u.id === member.userId);
                    return (
                      <tr key={member.id}>
                        <td>{user?.name || member.userId}</td>
                        <td>
                          <select
                            className="form-control"
                            value={member.role}
                            onChange={(e) => updateMember(member, { role: e.target.value as ProjectMember["role"] })}
                          >
                            <option value="OWNER">オーナー</option>
                            <option value="MEMBER">メンバー</option>
                            <option value="VIEWER">閲覧のみ</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={member.visible}
                            onChange={(e) => updateMember(member, { visible: e.target.checked })}
                          />
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={() => removeMember(member)}>
                            削除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
