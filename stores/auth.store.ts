import { defineStore } from "pinia";
import type { SessionUser } from "~/types/auth";

type AuthSessionResponse =
  | { authenticated: false }
  | { authenticated: true; user: SessionUser; csrfToken?: string | null };

type LoginResponse = {
  success: boolean;
  user?: SessionUser;
};

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as SessionUser | null,
    isChecking: true,
    csrfToken: null as string | null,
  }),

  getters: {
    isAuthenticated(): boolean {
      return this.user !== null;
    },

    isAdmin(): boolean {
      return this.user?.role === "admin";
    },

    isPlanner(): boolean {
      return this.user?.role === "planner";
    },

    canEditShifts(): boolean {
      return this.user?.role === "admin" || this.user?.role === "planner";
    },

    canEditSettings(): boolean {
      return this.user?.role === "admin";
    },

    username(): string {
      return this.user?.username || "";
    },
  },

  actions: {
    /**
     * Holt den CSRF-Token aus dem Cookie
     */
    _readCsrfCookie(): string | null {
      if (import.meta.server) return null;
      const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
      return match?.[1] ? decodeURIComponent(match[1]) : null;
    },

    /**
     * Prüft beim App-Start ob eine gültige Session existiert
     */
    async checkSession(): Promise<boolean> {
      this.isChecking = true;
      try {
        const result = await $fetch<AuthSessionResponse>("/api/auth/session");

        if (!result.authenticated) {
          this.user = null;
          this.csrfToken = null;
          return false;
        }

        this.user = result.user;
        this.csrfToken = result.csrfToken || this._readCsrfCookie();

        return true;
      } catch {
        this.user = null;
        this.csrfToken = null;
        return false;
      } finally {
        this.isChecking = false;
      }
    },

    /**
     * Login mit Passwort
     */
    async login(
      username: string,
      password: string
    ): Promise<{ success: boolean; message?: string }> {
      try {
        const result = await $fetch<LoginResponse>("/api/auth/login", {
          method: "POST",
          body: { username, password },
        });

        if (result.success && result.user) {
          this.user = result.user;

          // CSRF-Token aus Cookie lesen (wurde vom Server gesetzt)
          this.csrfToken = this._readCsrfCookie();

          // Fallback: Session-Endpoint holen
          if (!this.csrfToken) {
            const session = await $fetch<AuthSessionResponse>("/api/auth/session");
            this.csrfToken = session.authenticated ? session.csrfToken || null : null;
          }

          return { success: true };
        }
        this.user = null;
        this.csrfToken = null;
        return { success: false, message: "Login fehlgeschlagen" };
      } catch (error: any) {
        this.user = null;
        this.csrfToken = null;
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
        this.user = null;
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
