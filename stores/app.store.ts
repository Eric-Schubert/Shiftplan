import { defineStore } from "pinia";
import { isoWeekOfDate, isoWeeksInYear } from "~/shared/utils/week";
import { getEffectiveCurrentWeek, getEffectiveCurrentYear, getUpcomingWeeks, type UpcomingWeek } from "./app/week";

export const useAppStore = defineStore("app", {
  state: () => ({
    selectedYear: getEffectiveCurrentYear(),
    selectedWeek: getEffectiveCurrentWeek(),
    // Instance setting, loaded by plugins/instance-settings.ts.
    nextWeekFromSaturday: true,
    isDarkMode: false,
    _initialized: false,
  }),

  getters: {
    /** The week „Heute“ jumps to (next week from Saturday on, unless the team works weekends). */
    isCurrentWeek(): boolean {
      return (
        this.selectedYear === getEffectiveCurrentYear(this.nextWeekFromSaturday) &&
        this.selectedWeek === getEffectiveCurrentWeek(this.nextWeekFromSaturday)
      );
    },

    currentWeekLabel(): string | null {
      if (!this.isCurrentWeek) return null;
      return this.selectedWeek === isoWeekOfDate(new Date()).week ? "Diese Woche" : "Ab Montag";
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
      const maxWeeks = isoWeeksInYear(this.selectedYear);
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
        this.selectedWeek = isoWeeksInYear(this.selectedYear);
      } else {
        this.selectedWeek--;
      }
    },

    goToCurrentWeek() {
      this.selectedYear = getEffectiveCurrentYear(this.nextWeekFromSaturday);
      this.selectedWeek = getEffectiveCurrentWeek(this.nextWeekFromSaturday);
    },

    setNextWeekFromSaturday(enabled: boolean) {
      this.nextWeekFromSaturday = enabled;
      this.goToCurrentWeek();
    },

    setWeek(year: number, week: number) {
      this.selectedYear = year;
      this.selectedWeek = week;
    },
  },
});

