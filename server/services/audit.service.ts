import { getDatabase } from "~/server/utils/database";
import { getAuditConfig } from "~/server/config/domain-config";
import type { AuditAction, AuditEntry } from "~/types/auth";
import { purgeOldAuditEntries } from "~/server/services/audit/purge";
import { readReasonParams, storedReason, type AuditReason } from "~/server/services/audit/reason";

export type { AuditReason };

export class AuditService {



  static log(params: {
    userId: number;
    username: string;
    action: AuditAction;
    year: number;
    weekNumber: number;
    shiftId?: number;
    shiftName?: string;
    staffId?: number;
    staffName?: string;
    reason?: AuditReason;
    source?: "web" | "app";
  }): void {
    const db = getDatabase();
    purgeOldAuditEntries();

    let shiftName = params.shiftName;
    let staffName = params.staffName;

    // A missing name stays empty; the log shows the placeholder in the reader's language.
    if (!shiftName && params.shiftId) {
      const shift = db
        .prepare("SELECT name FROM shifts WHERE shift_id = ?")
        .get(params.shiftId) as { name: string } | undefined;
      shiftName = shift?.name;
    }

    if (!staffName && params.staffId) {
      const staff = db
        .prepare("SELECT name FROM staff WHERE staff_id = ?")
        .get(params.staffId) as { name: string } | undefined;
      staffName = staff?.name;
    }

    const reason = storedReason(params.reason);
    db.prepare(`
      INSERT INTO audit_log (user_id, username, action, year, week_number, shift_id, shift_name, staff_id, staff_name,
        reason, reason_key, reason_params, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      params.userId,
      params.username,
      params.action,
      params.year,
      params.weekNumber,
      params.shiftId || null,
      shiftName || null,
      params.staffId || null,
      staffName || null,
      reason.text,
      reason.key,
      reason.params,
      params.source ?? "web",
    );
  }




  static getEntries(options?: {
    limit?: number;
    offset?: number;
  }): { entries: AuditEntry[]; total: number } {
    const db = getDatabase();
    purgeOldAuditEntries();
    const auditConfig = getAuditConfig();
    const requestedLimit = Number.isFinite(options?.limit) ? Math.trunc(options!.limit!) : auditConfig.defaultLimit;
    const limit = Math.min(auditConfig.maxLimit, Math.max(1, requestedLimit));
    const offset = options?.offset || 0;

    const total = db
      .prepare("SELECT COUNT(*) as count FROM audit_log")
      .get() as { count: number };

    const rows = db
      .prepare("SELECT * FROM audit_log ORDER BY created_at DESC, audit_id DESC LIMIT ? OFFSET ?")
      .all(limit, offset) as Array<Omit<AuditEntry, "reason_params"> & { reason_params: string | null }>;
    const entries = rows.map((row) => ({ ...row, reason_params: readReasonParams(row.reason_params) }));

    return { entries, total: total.count };
  }
}
