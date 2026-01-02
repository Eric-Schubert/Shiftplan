import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    selectedYear: new Date().getFullYear(),
    selectedWeek: getISOWeek(new Date()),
    isDarkMode: false,
  }),

  getters: {
    weekDateRange(): { start: Date; end: Date } {
      const start = getDateOfISOWeek(this.selectedWeek, this.selectedYear);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end };
    },

    formattedWeekRange(): string {
      const { start, end } = this.weekDateRange;
      const formatDate = (d: Date) =>
        d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
      return `${formatDate(start)} - ${formatDate(end)}`;
    },
  },

  actions: {
    setWeek(year: number, week: number) {
      this.selectedYear = year;
      this.selectedWeek = week;
    },

    nextWeek() {
      const maxWeeks = getISOWeeksInYear(this.selectedYear);
      if (this.selectedWeek < maxWeeks) {
        this.selectedWeek++;
      } else {
        this.selectedYear++;
        this.selectedWeek = 1;
      }
    },

    previousWeek() {
      if (this.selectedWeek > 1) {
        this.selectedWeek--;
      } else {
        this.selectedYear--;
        this.selectedWeek = getISOWeeksInYear(this.selectedYear);
      }
    },

    goToCurrentWeek() {
      this.selectedYear = new Date().getFullYear();
      this.selectedWeek = getISOWeek(new Date());
    },

    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      if (this.isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    },
  },
});

// Hilfsfunktionen
function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

function getISOWeeksInYear(year: number): number {
  const d = new Date(year, 11, 31);
  const week = getISOWeek(d);
  return week === 1 ? 52 : week;
}
