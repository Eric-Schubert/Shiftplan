import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    isAdmin: false,
    isChecking: true, // Für initialen Session-Check
  }),

  getters: {
    isAuthenticated(): boolean {
      return this.isAdmin;
    },
  },

  actions: {
    /**
     * Prüft beim App-Start ob eine gültige Session existiert
     */
    async checkSession(): Promise<boolean> {
      this.isChecking = true;
      try {
        const result = await $fetch<{ authenticated: boolean }>("/api/auth/session");
        this.isAdmin = result.authenticated;
        return result.authenticated;
      } catch {
        this.isAdmin = false;
        return false;
      } finally {
        this.isChecking = false;
      }
    },

    /**
     * Login mit Passwort
     */
    async login(password: string): Promise<{ success: boolean; message?: string }> {
      try {
        const result = await $fetch<{ success: boolean; token: string }>("/api/auth/login", {
          method: "POST",
          body: { password },
        });

        if (result.success) {
          this.isAdmin = true;
          return { success: true };
        }
        return { success: false, message: "Login fehlgeschlagen" };
      } catch (error: any) {
        const message = error.data?.statusMessage || error.data?.message || "Login fehlgeschlagen";
        return { success: false, message };
      }
    },

    /**
     * Logout - Session serverseitig beenden
     */
    async logout(): Promise<void> {
      try {
        await $fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Ignorieren - Cookie wird trotzdem gelöscht
      } finally {
        this.isAdmin = false;
      }
    },

    /**
     * Session verlängern (wird automatisch durch API-Calls gemacht)
     * Diese Methode ist jetzt nur noch für UI-Feedback
     */
    extendSession(): void {
      // Die Session wird automatisch serverseitig verlängert
      // bei jedem authentifizierten API-Call
    },
  },
});
