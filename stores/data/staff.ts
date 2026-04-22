import type { Staff, StaffCreateDTO, StaffUpdateDTO } from "~/types/staff";
import { getDataStoreCsrfHeaders } from "./shared";

interface StaffStoreContext {
  staff: Staff[];
  loadingStaff: boolean;
  fetchRotation(): Promise<void>;
  getStaffById(id: number): Staff | undefined;
}

export async function fetchStaffData(store: StaffStoreContext): Promise<void> {
  store.loadingStaff = true;
  try {
    store.staff = await $fetch<Staff[]>("/api/staff");
  } finally {
    store.loadingStaff = false;
  }
}

export async function createStaffRecord(
  store: StaffStoreContext,
  data: StaffCreateDTO
): Promise<Staff> {
  const newStaff = await $fetch<Staff>("/api/staff", {
    method: "POST",
    body: data,
    headers: getDataStoreCsrfHeaders(),
  });

  store.staff.push(newStaff);
  return newStaff;
}

export async function updateStaffRecord(
  store: StaffStoreContext,
  id: number,
  data: StaffUpdateDTO
): Promise<Staff | null> {
  const updated = await $fetch<Staff>(`/api/staff/${id}`, {
    method: "PATCH",
    body: data,
    headers: getDataStoreCsrfHeaders(),
  });

  const index = store.staff.findIndex((staff) => staff.staff_id === id);
  if (index !== -1) {
    store.staff[index] = updated;
  }

  return updated;
}

export async function deleteStaffRecord(
  store: StaffStoreContext,
  id: number
): Promise<boolean> {
  await $fetch(`/api/staff/${id}`, {
    method: "DELETE",
    headers: getDataStoreCsrfHeaders(),
  });

  store.staff = store.staff.filter((staff) => staff.staff_id !== id);
  await store.fetchRotation();
  return true;
}

export async function toggleStaffActiveStatus(
  store: StaffStoreContext,
  id: number
): Promise<void> {
  const staff = store.getStaffById(id);
  if (!staff) return;

  await updateStaffRecord(store, id, { active: staff.active ? 0 : 1 });
}
