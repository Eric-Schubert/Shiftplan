import type { FullRotationPattern, RotationConfig } from "~/types/rotation";
import { getDataStoreCsrfHeaders } from "./shared";

interface RotationStoreContext {
  rotationPattern: FullRotationPattern | null;
  loadingRotation: boolean;
}

export async function fetchRotationData(store: RotationStoreContext): Promise<void> {
  store.loadingRotation = true;
  try {
    store.rotationPattern = await $fetch<FullRotationPattern>("/api/rotation");
  } finally {
    store.loadingRotation = false;
  }
}

export async function updateRotationConfigData(
  store: RotationStoreContext,
  data: Partial<RotationConfig>
): Promise<void> {
  await $fetch("/api/rotation/config", {
    method: "PATCH",
    body: data,
    headers: getDataStoreCsrfHeaders(),
  });

  await fetchRotationData(store);
}

export async function assignToRotationData(
  store: RotationStoreContext,
  patternWeek: number,
  staffId: number,
  shiftId: number
): Promise<void> {
  await $fetch("/api/rotation/assign", {
    method: "POST",
    body: { pattern_week: patternWeek, staff_id: staffId, shift_id: shiftId },
    headers: getDataStoreCsrfHeaders(),
  });

  await fetchRotationData(store);
}

export async function unassignFromRotationData(
  store: RotationStoreContext,
  patternWeek: number,
  staffId: number,
  shiftId: number
): Promise<void> {
  await $fetch("/api/rotation/unassign", {
    method: "POST",
    body: { pattern_week: patternWeek, staff_id: staffId, shift_id: shiftId },
    headers: getDataStoreCsrfHeaders(),
  });

  await fetchRotationData(store);
}
