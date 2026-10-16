// @ts-check
import { getTableColumns, migrationApplied, tableExists } from "../schema.js";

const ID = "011_main_unescape_names";

// Names were saved HTML-escaped, once more on every edit: "F&B" became "F&amp;B", then "F&amp;amp;B".
/** @type {Array<[table: string, key: string, column: string]>} */
const NAME_COLUMNS = [
  ["staff", "staff_id", "name"],
  ["shifts", "shift_id", "name"],
  ["audit_log", "audit_id", "staff_name"],
  ["audit_log", "audit_id", "shift_name"],
];

/** @param {string} value */
export function unescapeName(value) {
  let text = value;
  while (text.includes("&amp;")) text = text.replaceAll("&amp;", "&");
  return text;
}

/** @type {import("../runner.js").Migration} */
export default {
  id: ID,
  description: "Names as typed instead of HTML-escaped",
  shouldRun(database) {
    // Once only: from now on a name may contain "&amp;" because someone typed it.
    return tableExists(database, "staff") && !migrationApplied(database, ID);
  },
  up(database) {
    for (const [table, key, column] of NAME_COLUMNS) {
      if (!tableExists(database, table) || !getTableColumns(database, table).has(column)) continue;
      const rows = /** @type {Array<{ id: number; value: string }>} */ (
        database.prepare(`SELECT ${key} AS id, ${column} AS value FROM ${table} WHERE ${column} LIKE '%&amp;%'`).all()
      );
      const update = database.prepare(`UPDATE ${table} SET ${column} = ? WHERE ${key} = ?`);
      for (const row of rows) update.run(unescapeName(row.value), row.id);
    }
  },
};
