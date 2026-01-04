import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    selectedYear: getEffectiveCurrentYear(),
    selectedWeek: getEffectiveCurrentWeek(),
    isDarkMode: false,
    _initialized: false,
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

    // NEU: Getter für die nächsten N Wochen (für Vorschau)
    getUpcomingWeeks(): (count: number) => Array<{ year: number; week: number; dateRange: string }> {
      return (count: number) => {
        const weeks: Array<{ year: number; week: number; dateRange: string }> = [];
        let year = this.selectedYear;
        let week = this.selectedWeek;

        for (let i = 0; i < count; i++) {
          // Nächste Woche berechnen
          week++;
          const maxWeeks = getISOWeeksInYear(year);
          if (week > maxWeeks) {
            week = 1;
            year++;
          }

          const start = getDateOfISOWeek(week, year);
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          
          const formatDate = (date: Date) => {
            return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
          };

          weeks.push({
            year,
            week,
            dateRange: `${formatDate(start)} - ${formatDate(end)}`,
          });
        }

        return weeks;
      };
    },
  },

  actions: {
    // Dark Mode aus localStorage laden (nur im Browser)
    initDarkMode() {
      if (this._initialized) return;
      this._initialized = true;
      
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("darkMode");
        if (saved !== null) {
          this.isDarkMode = saved === "true";
        } else {
          // System-Präferenz prüfen
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
      
      // In localStorage speichern
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
      // Ab Samstag wird bereits die nächste Woche angezeigt
      this.selectedYear = getEffectiveCurrentYear();
      this.selectedWeek = getEffectiveCurrentWeek();
    },

    setWeek(year: number, week: number) {
      this.selectedYear = year;
      this.selectedWeek = week;
    },
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Berechnet die ISO-Kalenderwoche für ein Datum
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Berechnet das Startdatum (Montag) einer ISO-Kalenderwoche
 */
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

/**
 * Gibt die Anzahl der ISO-Wochen in einem Jahr zurück
 */
function getISOWeeksInYear(year: number): number {
  const d = new Date(year, 11, 31);
  const week = getISOWeek(d);
  return week === 1 ? 52 : week;
}

/**
 * NEU: Prüft ob heute Samstag oder Sonntag ist
 * Wenn ja, wird die nächste Woche als "aktuelle" Woche betrachtet
 */
function isSaturdayOrLater(): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sonntag, 6 = Samstag
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * NEU: Gibt die effektive aktuelle Kalenderwoche zurück
 * Ab Samstag wird die nächste Woche zurückgegeben
 */
function getEffectiveCurrentWeek(): number {
  const today = new Date();
  let week = getISOWeek(today);
  
  if (isSaturdayOrLater()) {
    const year = today.getFullYear();
    const maxWeeks = getISOWeeksInYear(year);
    week++;
    if (week > maxWeeks) {
      week = 1;
    }
  }
  
  return week;
}

/**
 * NEU: Gibt das effektive aktuelle Jahr zurück
 * Berücksichtigt den Wochenwechsel am Samstag
 */
function getEffectiveCurrentYear(): number {
  const today = new Date();
  let year = today.getFullYear();
  
  if (isSaturdayOrLater()) {
    const week = getISOWeek(today);
    const maxWeeks = getISOWeeksInYear(year);
    if (week >= maxWeeks) {
      year++;
    }
  }
  
  return year;
}

// Exportiere Helper für Verwendung in Komponenten
export { getISOWeek, getDateOfISOWeek, getISOWeeksInYear };
