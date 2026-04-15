import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    isAdmin: false,
    isChecking: true,
    csrfToken: null as string | null,
  }),

  getters: {
    isAuthenticated(): boolean {
      return this.isAdmin;
    },
  },

  actions: {
    /**
     * Holt den CSRF-Token aus dem Cookie
     */
    _readCsrfCookie(): string | null {
      if (import.meta.server) return null;
      const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : null;
    },

    /**
     * Prüft beim App-Start ob eine gültige Session existiert
     */
    async checkSession(): Promise<boolean> {
      this.isChecking = true;
      try {
        const result = await $fetch<{ authenticated: boolean; csrfToken?: string }>(
          "/api/auth/session"
        );
        this.isAdmin = result.authenticated;

        if (result.authenticated && result.csrfToken) {
          this.csrfToken = result.csrfToken;
        }

        // Fallback: CSRF-Token aus Cookie lesen
        if (result.authenticated && !this.csrfToken) {
          this.csrfToken = this._readCsrfCookie();
        }

        return result.authenticated;
      } catch {
        this.isAdmin = false;
        this.csrfToken = null;
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
        const result = await $fetch<{ success: boolean }>("/api/auth/login", {
          method: "POST",
          body: { password },
        });

        if (result.success) {
          this.isAdmin = true;

          // CSRF-Token aus Cookie lesen (wurde vom Server gesetzt)
          this.csrfToken = this._readCsrfCookie();

          // Fallback: Session-Endpoint holen
          if (!this.csrfToken) {
            const session = await $fetch<{ csrfToken?: string }>("/api/auth/session");
            this.csrfToken = session.csrfToken || null;
          }

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
        await $fetch("/api/auth/logout", {
          method: "POST",
          headers: this._csrfHeaders(),
        });
      } catch {
        // Ignorieren - Cookie wird trotzdem gelöscht
      } finally {
        this.isAdmin = false;
        this.csrfToken = null;
      }
    },

    /**
     * Gibt CSRF-Header für fetch-Requests zurück.
     * Alle state-ändernden Requests müssen diesen Header mitsenden.
     */
    _csrfHeaders(): Record<string, string> {
      if (this.csrfToken) {
        return { "x-csrf-token": this.csrfToken };
      }
      return {};
    },

    /**
     * Session verlängern (wird automatisch durch API-Calls gemacht)
     */
    extendSession(): void {
      // Die Session wird automatisch serverseitig verlängert
      // bei jedem authentifizierten API-Call
    },
  },
});
