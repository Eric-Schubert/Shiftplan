import { defineStore } from "pinia";
import {
  formatWeekDateRange,
  getDateOfISOWeek,
  getEffectiveCurrentWeek,
  getEffectiveCurrentYear,
  getISOWeek,
  getISOWeeksInYear,
  getUpcomingWeeks,
  getWeekDateRange,
  type UpcomingWeek,
} from "./app/week";

export const useAppStore = defineStore("app", {
  state: () => ({
    selectedYear: getEffectiveCurrentYear(),
    selectedWeek: getEffectiveCurrentWeek(),
    isDarkMode: false,
    _initialized: false,
  }),

  getters: {
    weekDateRange(): { start: Date; end: Date } {
      return getWeekDateRange(this.selectedWeek, this.selectedYear);
    },

    formattedWeekRange(): string {
      return formatWeekDateRange(this.weekDateRange);
    },

    getUpcomingWeeks(): (count: number) => UpcomingWeek[] {
      return (count: number) => getUpcomingWeeks(this.selectedYear, this.selectedWeek, count);
    },
  },

  actions: {
    initDarkMode() {
      if (this._initialized) return;
      this._initialized = true;

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("darkMode");
        if (saved !== null) {
          this.isDarkMode = saved === "true";
        } else {
          this.isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        this.applyDarkMode();
      }
    },

    applyDarkMode() {
      if (typeof document !== "undefined") {
        if (this.isDarkMode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    },

    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      this.applyDarkMode();

      if (typeof window !== "undefined") {
        localStorage.setItem("darkMode", String(this.isDarkMode));
      }
    },

    nextWeek() {
      const maxWeeks = getISOWeeksInYear(this.selectedYear);
      if (this.selectedWeek >= maxWeeks) {
        this.selectedYear++;
        this.selectedWeek = 1;
      } else {
        this.selectedWeek++;
      }
    },

    previousWeek() {
      if (this.selectedWeek <= 1) {
        this.selectedYear--;
        this.selectedWeek = getISOWeeksInYear(this.selectedYear);
      } else {
        this.selectedWeek--;
      }
    },

    goToCurrentWeek() {
      this.selectedYear = getEffectiveCurrentYear();
      this.selectedWeek = getEffectiveCurrentWeek();
    },

    setWeek(year: number, week: number) {
      this.selectedYear = year;
      this.selectedWeek = week;
    },
  },
});

export { getISOWeek, getDateOfISOWeek, getISOWeeksInYear };
