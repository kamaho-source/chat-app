"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchJson, postWithCsrf } from "@/lib/api";
import { TaskSummary } from "@/lib/types";

const COLUMNS: TaskSummary["status"][] = ["TODO", "DOING", "DONE"];

export default function ProjectTasksPage() {
  const params = useParams();
  const projectId = Number(params?.projectId);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJson<TaskSummary[]>(`/api/projects/${projectId}/tasks`);
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      }
    };
    if (!Number.isNaN(projectId)) load();
  }, [projectId]);

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      const created = await postWithCsrf<TaskSummary>(`/api/projects/${projectId}/tasks`, {
        title: newTask.title,
        description: newTask.description,
      });
      setTasks((prev) => [...prev, created]);
      setNewTask({ title: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const moveTask = (task: TaskSummary, dir: -1 | 1) => {
    const idx = COLUMNS.indexOf(task.status);
    const next = COLUMNS[idx + dir];
    if (!next) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
  };

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "32px" }}>
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="card-body">
          <h3>タスク管理</h3>
          {error && <p className="text-muted">{error}</p>}
          <div style={{ marginTop: "16px" }}>
            <input
              className="form-control"
              placeholder="タイトル"
              value={newTask.title}
              onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
            />
            <textarea
              className="form-control"
              rows={2}
              placeholder="説明"
              value={newTask.description}
              onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
              style={{ marginTop: "8px" }}
            />
            <button className="btn" style={{ marginTop: "8px" }} onClick={createTask}>
              追加
            </button>
          </div>
        </div>
      </div>

      <div className="row">
        {COLUMNS.map((status) => (
          <div key={status} className="col-4" style={{ marginBottom: "16px" }}>
            <div className="card">
              <div className="card-body">
                <h4>{status}</h4>
                {tasks
                  .filter((task) => task.status === status)
                  .map((task) => (
                    <div key={task.id} className="card" style={{ marginTop: "12px" }}>
                      <div className="card-body">
                        <strong>{task.title}</strong>
                        <p className="text-muted">{task.description}</p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="btn btn-sm btn-outline" onClick={() => moveTask(task, -1)}>
                            ←
                          </button>
                          <select
                            className="form-control"
                            value={task.status}
                            onChange={(e) =>
                              setTasks((prev) =>
                                prev.map((t) =>
                                  t.id === task.id
                                    ? { ...t, status: e.target.value as TaskSummary["status"] }
                                    : t
                                )
                              )
                            }
                          >
                            {COLUMNS.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                          <button className="btn btn-sm btn-outline" onClick={() => moveTask(task, 1)}>
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
