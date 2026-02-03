export type Role = "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

export interface UserSummary {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
  active: boolean;
}

export interface ChannelSummary {
  id: number;
  name: string;
  description?: string | null;
  isPrivate: boolean;
}

export interface ProjectSummary {
  id: number;
  name: string;
  description?: string | null;
  isPrivate: boolean;
}

export interface TaskSummary {
  id: number;
  title: string;
  description?: string | null;
  assigneeId?: number | null;
  dueDate?: string | null;
  status: "TODO" | "DOING" | "DONE";
}
