import type { Shift } from "./shift";
import type { Staff } from "./staff";

// Rotationskonfiguration
export interface RotationConfig {
  config_id: number;
  cycle_length: number;  // Anzahl Wochen im Zyklus (z.B. 4)
  start_year: number;    // Startjahr für die Berechnung
  start_week: number;    // Startwoche für die Berechnung
}

// Einzelne Musterzuweisung
export interface RotationPatternEntry {
  pattern_id: number;
  pattern_week: number;  // 1 bis cycle_length
  staff_id: number;
  shift_id: number;
}

// Pattern mit aufgelösten Referenzen für die UI
export interface RotationPatternWithDetails extends RotationPatternEntry {
  staff_name: string;
  shift_name: string;
  shift_color: string;
}

// Komplettes Muster für eine Musterwoche
export interface PatternWeekData {
  pattern_week: number;
  assignments: {
    shift: Shift;
    staff: Staff[];
  }[];
}

// Das gesamte Rotationsmuster
export interface FullRotationPattern {
  config: RotationConfig;
  weeks: PatternWeekData[];
}

// DTOs für API
export interface RotationConfigUpdateDTO {
  cycle_length?: number;
  start_year?: number;
  start_week?: number;
}

export interface RotationPatternAssignDTO {
  pattern_week: number;
  staff_id: number;
  shift_id: number;
}

export interface RotationPatternUnassignDTO {
  pattern_week: number;
  staff_id: number;
  shift_id: number;
}
