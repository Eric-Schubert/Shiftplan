import type { Shift } from "./shift";
import type { Staff } from "./staff";

export interface RotationConfig {
  config_id: number;
  cycle_length: number;
  start_year: number;
  start_week: number;
}

export interface RotationPatternEntry {
  pattern_id: number;
  pattern_week: number;
  staff_id: number;
  shift_id: number;
}

export interface RotationPatternWithDetails extends RotationPatternEntry {
  staff_name: string;
  shift_name: string;
  shift_color: string;
}

export interface PatternWeekData {
  pattern_week: number;
  assignments: {
    shift: Shift;
    staff: Staff[];
  }[];
}

export interface FullRotationPattern {
  config: RotationConfig;
  weeks: PatternWeekData[];
}

export interface RotationAssignContext {
  patternWeek: number;
  shiftId: number;
  shiftName: string;
}

export interface RotationDropPayload {
  event: DragEvent;
  patternWeek: number;
  shiftId: number;
}

export interface RotationStaffDragPayload extends RotationDropPayload {
  staffId: number;
  staffName: string;
}

export interface RotationTransferPayload {
  staffId: number;
  staffName: string;
  source: "pool" | "rotation";
  sourceShiftId?: number;
  sourcePatternWeek?: number;
}

export interface RotationExcelImportResult {
  importedRows: number;
  importedAssignments: number;
  config: RotationConfig;
}

export interface RotationConfigPreviewItem {
  year: number;
  week: number;
  patternWeek: number;
  isStart: boolean;
}

export interface RotationGeneratePreviewItem {
  year: number;
  week: number;
  patternWeek: number;
}

export interface RotationGenerateResult {
  generated: number;
  weeks: Array<{ year: number; week: number; pattern_week: number }>;
}

export interface RotationYearCopyPreview {
  year: number;
  totalWeeks: number;
  totalAssignments: number;
  weeks: Array<{ week: number; assignments: number }>;
}

export interface RotationYearCopyResult {
  success: boolean;
  copiedWeeks: number;
  skippedWeeks: number;
  copiedAssignments: number;
}

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
