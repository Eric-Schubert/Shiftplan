import { defineStore } from "pinia";
import type { Staff, StaffCreateDTO, StaffUpdateDTO } from "~/types/staff";
import type { Shift, ShiftCreateDTO, ShiftUpdateDTO } from "~/types/shift";
import type { FullRotationPattern, RotationConfig } from "~/types/rotation";
import { fetchStaffData, createStaffRecord, updateStaffRecord, deleteStaffRecord, toggleStaffActiveStatus } from "./data/staff";
import { fetchShiftsData, createShiftRecord, updateShiftRecord, deleteShiftRecord, toggleShiftActiveStatus } from "./data/shifts";
import { fetchRotationData, updateRotationConfigData, assignToRotationData, unassignFromRotationData } from "./data/rotation";

export const useDataStore = defineStore("data", {
  state: () => ({
    staff: [] as Staff[],
    shifts: [] as Shift[],
    rotationPattern: null as FullRotationPattern | null,

    loadingStaff: false,
    loadingShifts: false,
    loadingRotation: false,

    initialized: false,
    /** The last init failed; the layout offers to try again. */
    loadError: false,
  }),

  getters: {
    activeStaff(): Staff[] {
      return this.staff.filter((staff) => staff.active);
    },

    rotationConfig(): RotationConfig | null {
      return this.rotationPattern?.config || null;
    },

    getStaffById: (state) => (id: number) => {
      return state.staff.find((staff) => staff.staff_id === id);
    },

    getShiftById: (state) => (id: number) => {
      return state.shifts.find((shift) => shift.shift_id === id);
    },
  },

  actions: {
    /** Loads staff, shifts and the rotation once; a failure is kept in `loadError` instead of thrown. */
    async init(): Promise<boolean> {
      if (this.initialized) return true;

      this.loadError = false;
      try {
        await Promise.all([this.fetchStaff(), this.fetchShifts(), this.fetchRotation()]);
        this.initialized = true;
      } catch {
        this.loadError = true;
      }
      return this.initialized;
    },

    async fetchStaff() {
      await fetchStaffData(this);
    },

    async createStaff(data: StaffCreateDTO): Promise<Staff> {
      return createStaffRecord(this, data);
    },

    async updateStaff(id: number, data: StaffUpdateDTO): Promise<Staff | null> {
      return updateStaffRecord(this, id, data);
    },

    async deleteStaff(id: number): Promise<boolean> {
      return deleteStaffRecord(this, id);
    },

    async toggleStaffActive(id: number): Promise<void> {
      await toggleStaffActiveStatus(this, id);
    },

    async fetchShifts() {
      await fetchShiftsData(this);
    },

    async createShift(data: ShiftCreateDTO): Promise<Shift> {
      return createShiftRecord(this, data);
    },

    async updateShift(id: number, data: ShiftUpdateDTO): Promise<Shift | null> {
      return updateShiftRecord(this, id, data);
    },

    async deleteShift(id: number): Promise<boolean> {
      return deleteShiftRecord(this, id);
    },

    async toggleShiftActive(id: number): Promise<void> {
      await toggleShiftActiveStatus(this, id);
    },

    async fetchRotation() {
      await fetchRotationData(this);
    },

    async updateRotationConfig(data: Partial<RotationConfig>): Promise<void> {
      await updateRotationConfigData(this, data);
    },

    async assignToRotation(patternWeek: number, staffId: number, shiftId: number): Promise<void> {
      await assignToRotationData(this, patternWeek, staffId, shiftId);
    },

    async unassignFromRotation(patternWeek: number, staffId: number, shiftId: number): Promise<void> {
      await unassignFromRotationData(this, patternWeek, staffId, shiftId);
    },
  },
});
