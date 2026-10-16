export type UserRole = "admin" | "planner";

export interface User {
  user_id: number;
  username: string;
  role: UserRole;
  active: number;
  created_at: string;
}

export interface UserCreatePayload {
  username: string;
  password: string;
  role: UserRole;
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
  action: AuditAction;
  year: number;
  week_number: number;
  shift_id: number | null;
  shift_name: string | null;
  staff_id: number | null;
  staff_name: string | null;
  /** German text; entries with a key are rendered from the catalog instead (i18n/audit-reason.ts). */
  reason: string | null;
  reason_key: string | null;
  reason_params: Record<string, string | number> | null;
  source: "web" | "app";
  created_at: string;
}

export type AuditAction =
  | "assign"
  | "unassign"
  | "day_add"
  | "day_remove"
  | "absence"
  | "absence_cancel"
  | "generate"
  | "pattern_import";
