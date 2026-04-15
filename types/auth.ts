export type UserRole = "admin" | "planner";

export interface User {
  user_id: number;
  username: string;
  role: UserRole;
  active: number;
  created_at: string;
}

export interface UserWithHash extends User {
  password_hash: string;
}

export interface SessionUser {
  userId: number;
  username: string;
  role: UserRole;
}

export interface AuditEntry {
  audit_id: number;
  user_id: number;
  username: string;
  action: "assign" | "unassign";
  year: number;
  week_number: number;
  shift_name: string;
  staff_name: string;
  reason: string | null;
  created_at: string;
}
