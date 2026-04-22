import type { Shift, ShiftCreateDTO, ShiftUpdateDTO } from "~/types/shift";
import { getDataStoreCsrfHeaders } from "./shared";

interface ShiftStoreContext {
  shifts: Shift[];
  loadingShifts: boolean;
  fetchRotation(): Promise<void>;
  getShiftById(id: number): Shift | undefined;
}

export async function fetchShiftsData(store: ShiftStoreContext): Promise<void> {
  store.loadingShifts = true;
  try {
    store.shifts = await $fetch<Shift[]>("/api/shift");
  } finally {
    store.loadingShifts = false;
  }
}

export async function createShiftRecord(
  store: ShiftStoreContext,
  data: ShiftCreateDTO
): Promise<Shift> {
  const newShift = await $fetch<Shift>("/api/shift", {
    method: "POST",
    body: data,
    headers: getDataStoreCsrfHeaders(),
  });

  store.shifts.push(newShift);
  await store.fetchRotation();
  return newShift;
}

export async function updateShiftRecord(
  store: ShiftStoreContext,
  id: number,
  data: ShiftUpdateDTO
): Promise<Shift | null> {
  const updated = await $fetch<Shift>(`/api/shift/${id}`, {
    method: "PATCH",
    body: data,
    headers: getDataStoreCsrfHeaders(),
  });

  const index = store.shifts.findIndex((shift) => shift.shift_id === id);
  if (index !== -1) {
    store.shifts[index] = updated;
  }

  if (data.active !== undefined) {
    await store.fetchRotation();
  }

  return updated;
}

export async function deleteShiftRecord(
  store: ShiftStoreContext,
  id: number
): Promise<boolean> {
  await $fetch(`/api/shift/${id}`, {
    method: "DELETE",
    headers: getDataStoreCsrfHeaders(),
  });

  store.shifts = store.shifts.filter((shift) => shift.shift_id !== id);
  await store.fetchRotation();
  return true;
}

export async function toggleShiftActiveStatus(
  store: ShiftStoreContext,
  id: number
): Promise<void> {
  const shift = store.getShiftById(id);
  if (!shift) return;

  await updateShiftRecord(store, id, { active: shift.active ? 0 : 1 });
}
