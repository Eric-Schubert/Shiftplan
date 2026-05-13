import { getDatabase } from "~/server/utils/database";
import { getAuditConfig } from "~/server/config/domain-config";
import type { AuditEntry } from "~/types/auth";

export class AuditService {
  /**
   * Schreibt einen Audit-Log-Eintrag
   */
  static log(params: {
    userId: number;
    username: string;
    action: "assign" | "unassign";
    year: number;
    weekNumber: number;
    shiftId?: number;
    shiftName?: string;
    staffId?: number;
    staffName?: string;
    reason?: string;
  }): void {
    const db = getDatabase();

    // Schicht- und Mitarbeiternamen auflösen falls nicht mitgegeben
    let shiftName = params.shiftName;
    let staffName = params.staffName;

    if (!shiftName && params.shiftId) {
      const shift = db
        .prepare("SELECT name FROM shifts WHERE shift_id = ?")
        .get(params.shiftId) as { name: string } | undefined;
      shiftName = shift?.name || "Unbekannt";
    }

    if (!staffName && params.staffId) {
      const staff = db
        .prepare("SELECT name FROM staff WHERE staff_id = ?")
        .get(params.staffId) as { name: string } | undefined;
      staffName = staff?.name || "Unbekannt";
    }

    db.prepare(`
      INSERT INTO audit_log (user_id, username, action, year, week_number, shift_id, shift_name, staff_id, staff_name, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
      params.reason || null,
    );
  }

  /**
   * Holt Audit-Log-Einträge mit optionaler Filterung
   */
  static getEntries(options?: {
    limit?: number;
    offset?: number;
    year?: number;
    weekNumber?: number;
  }): { entries: AuditEntry[]; total: number } {
    const db = getDatabase();
    const auditConfig = getAuditConfig();
    const requestedLimit = Number.isFinite(options?.limit) ? Math.trunc(options!.limit!) : auditConfig.defaultLimit;
    const limit = Math.min(auditConfig.maxLimit, Math.max(1, requestedLimit));
    const offset = options?.offset || 0;

    let whereClause = "";
    const params: any[] = [];

    if (options?.year) {
      whereClause += " WHERE year = ?";
      params.push(options.year);
    }

    if (options?.weekNumber) {
      whereClause += whereClause ? " AND week_number = ?" : " WHERE week_number = ?";
      params.push(options.weekNumber);
    }

    const total = db
      .prepare(`SELECT COUNT(*) as count FROM audit_log${whereClause}`)
      .get(...params) as { count: number };

    const entries = db
      .prepare(
        `SELECT * FROM audit_log${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as AuditEntry[];

    return { entries, total: total.count };
  }
}
