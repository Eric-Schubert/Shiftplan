import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    isAdmin: false,
    sessionExpiry: null as number | null,
  }),

  getters: {
    isAuthenticated(): boolean {
      if (!this.isAdmin) return false;
      if (this.sessionExpiry && Date.now() > this.sessionExpiry) {
        this.isAdmin = false;
        this.sessionExpiry = null;
        return false;
      }
      return true;
    },
  },

  actions: {
    async login(password: string): Promise<boolean> {
      try {
        const result = await $fetch<{ success: boolean }>("/api/auth/login", {
          method: "POST",
          body: { password },
        });

        if (result.success) {
          this.isAdmin = true;
          // Session läuft nach 30 Minuten ab
          this.sessionExpiry = Date.now() + 30 * 60 * 1000;
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    logout() {
      this.isAdmin = false;
      this.sessionExpiry = null;
    },

    extendSession() {
      if (this.isAdmin) {
        this.sessionExpiry = Date.now() + 30 * 60 * 1000;
      }
    },
  },
});
