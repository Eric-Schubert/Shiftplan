import type { RotationConfig, RotationConfigUpdateDTO } from "~/types/rotation";
import { getDatabase } from "~/server/utils/database";
import { getRotationDefaults } from "~/server/config/domain-config";

export function getConfig(): RotationConfig {
  const db = getDatabase();
  let config = db
    .prepare("SELECT * FROM rotation_config LIMIT 1")
    .get() as RotationConfig | undefined;

  if (!config) {
    const currentYear = new Date().getFullYear();
    const defaults = getRotationDefaults();
    const result = db
      .prepare(
        "INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (?, ?, ?)"
      )
      .run(defaults.cycleLength, currentYear, defaults.startWeek);
    config = {
      config_id: result.lastInsertRowid as number,
      cycle_length: defaults.cycleLength,
      start_year: currentYear,
      start_week: defaults.startWeek,
    };
  }

  return config;
}

export function updateConfig(data: RotationConfigUpdateDTO): RotationConfig {
  const db = getDatabase();
  const current = getConfig();

  db.prepare(`
    UPDATE rotation_config
    SET cycle_length = ?, start_year = ?, start_week = ?
    WHERE config_id = ?
  `).run(
    data.cycle_length ?? current.cycle_length,
    data.start_year ?? current.start_year,
    data.start_week ?? current.start_week,
    current.config_id
  );

  return getConfig();
}
