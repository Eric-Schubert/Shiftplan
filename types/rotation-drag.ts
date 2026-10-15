// Browser-only drag and drop payloads, kept apart from types/rotation.ts because
// server code imports that file and is type-checked without the DOM types.

export interface RotationDropPayload {
  event: DragEvent;
  patternWeek: number;
  shiftId: number;
}

export interface RotationStaffDragPayload extends RotationDropPayload {
  staffId: number;
  staffName: string;
}
