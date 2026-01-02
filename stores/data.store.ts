import { defineStore } from "pinia";
import type { Staff, StaffCreateDTO, StaffUpdateDTO } from "~/types/staff";
import type { Shift, ShiftCreateDTO, ShiftUpdateDTO } from "~/types/shift";
import type { FullRotationPattern, RotationConfig } from "~/types/rotation";

export const useDataStore = defineStore("data", {
  state: () => ({
    // Daten
    staff: [] as Staff[],
    shifts: [] as Shift[],
    rotationPattern: null as FullRotationPattern | null,

    // Loading States
    loadingStaff: false,
    loadingShifts: false,
    loadingRotation: false,

    // Initialisierung
    initialized: false,
  }),

  getters: {
    // Aktive Mitarbeiter
    activeStaff(): Staff[] {
      return this.staff.filter((s) => s.active);
    },

    // Aktive Schichten
    activeShifts(): Shift[] {
      return this.shifts.filter((s) => s.active);
    },

    // Rotationskonfiguration
    rotationConfig(): RotationConfig | null {
      return this.rotationPattern?.config || null;
    },

    // Staff by ID
    getStaffById: (state) => (id: number) => {
      return state.staff.find((s) => s.staff_id === id);
    },

    // Shift by ID
    getShiftById: (state) => (id: number) => {
      return state.shifts.find((s) => s.shift_id === id);
    },
  },

  actions: {
    // ============================================
    // INITIALISIERUNG - Alles auf einmal laden
    // ============================================
    async init() {
      if (this.initialized) return;

      await Promise.all([
        this.fetchStaff(),
        this.fetchShifts(),
        this.fetchRotation(),
      ]);

      this.initialized = true;
    },

    // ============================================
    // STAFF
    // ============================================
    async fetchStaff() {
      this.loadingStaff = true;
      try {
        this.staff = await $fetch<Staff[]>("/api/staff");
      } finally {
        this.loadingStaff = false;
      }
    },

    async createStaff(data: StaffCreateDTO): Promise<Staff> {
      const newStaff = await $fetch<Staff>("/api/staff", {
        method: "POST",
        body: data,
      });
      this.staff.push(newStaff);
      return newStaff;
    },

    async updateStaff(id: number, data: StaffUpdateDTO): Promise<Staff | null> {
      const updated = await $fetch<Staff>(`/api/staff/${id}`, {
        method: "PATCH",
        body: data,
      });
      const index = this.staff.findIndex((s) => s.staff_id === id);
      if (index !== -1) {
        this.staff[index] = updated;
      }
      return updated;
    },

    async deleteStaff(id: number): Promise<boolean> {
      await $fetch(`/api/staff/${id}`, { method: "DELETE" });
      this.staff = this.staff.filter((s) => s.staff_id !== id);
      // Auch aus Rotation entfernen (lokal)
      await this.fetchRotation();
      return true;
    },

    async toggleStaffActive(id: number): Promise<void> {
      const staff = this.getStaffById(id);
      if (staff) {
        await this.updateStaff(id, { active: staff.active ? 0 : 1 });
      }
    },

    // ============================================
    // SHIFTS
    // ============================================
    async fetchShifts() {
      this.loadingShifts = true;
      try {
        this.shifts = await $fetch<Shift[]>("/api/shift");
      } finally {
        this.loadingShifts = false;
      }
    },

    async createShift(data: ShiftCreateDTO): Promise<Shift> {
      const newShift = await $fetch<Shift>("/api/shift", {
        method: "POST",
        body: data,
      });
      this.shifts.push(newShift);
      // Rotation neu laden (neue Schicht erscheint dort)
      await this.fetchRotation();
      return newShift;
    },

    async updateShift(id: number, data: ShiftUpdateDTO): Promise<Shift | null> {
      const updated = await $fetch<Shift>(`/api/shift/${id}`, {
        method: "PATCH",
        body: data,
      });
      const index = this.shifts.findIndex((s) => s.shift_id === id);
      if (index !== -1) {
        this.shifts[index] = updated;
      }
      // Rotation neu laden falls Schicht aktiviert/deaktiviert
      if (data.active !== undefined) {
        await this.fetchRotation();
      }
      return updated;
    },

    async deleteShift(id: number): Promise<boolean> {
      await $fetch(`/api/shift/${id}`, { method: "DELETE" });
      this.shifts = this.shifts.filter((s) => s.shift_id !== id);
      await this.fetchRotation();
      return true;
    },

    async toggleShiftActive(id: number): Promise<void> {
      const shift = this.getShiftById(id);
      if (shift) {
        await this.updateShift(id, { active: shift.active ? 0 : 1 });
      }
    },

    // ============================================
    // ROTATION
    // ============================================
    async fetchRotation() {
      this.loadingRotation = true;
      try {
        this.rotationPattern = await $fetch<FullRotationPattern>("/api/rotation");
      } finally {
        this.loadingRotation = false;
      }
    },

    async updateRotationConfig(data: Partial<RotationConfig>): Promise<void> {
      await $fetch("/api/rotation/config", {
        method: "PATCH",
        body: data,
      });
      await this.fetchRotation();
    },

    async assignToRotation(
      patternWeek: number,
      staffId: number,
      shiftId: number
    ): Promise<void> {
      await $fetch("/api/rotation/assign", {
        method: "POST",
        body: { pattern_week: patternWeek, staff_id: staffId, shift_id: shiftId },
      });
      await this.fetchRotation();
    },

    async unassignFromRotation(
      patternWeek: number,
      staffId: number,
      shiftId: number
    ): Promise<void> {
      await $fetch("/api/rotation/unassign", {
        method: "POST",
        body: { pattern_week: patternWeek, staff_id: staffId, shift_id: shiftId },
      });
      await this.fetchRotation();
    },
  },
});
