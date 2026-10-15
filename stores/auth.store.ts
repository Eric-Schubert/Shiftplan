import { defineStore } from "pinia";
import type { SessionUser } from "~/types/auth";
import {
  SESSION_EXTEND_INTERVAL_MS,
  readCsrfCookie,
  type AuthSessionResponse,
  type LoginResponse,
} from "./auth/session";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as SessionUser | null,
    isChecking: true,
    csrfToken: null as string | null,
    /** The server ended the session while the page still showed planner controls. */
    sessionExpired: false,
    lastExtendedAt: 0,
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
    _readCsrfCookie(): string | null {
      return readCsrfCookie();
    },

    _signOutLocally(): void {
      this.user = null;
      this.csrfToken = null;
    },

    /** Asks the server for the session. `quiet` leaves the page as it is while checking. */
    async checkSession(options: { quiet?: boolean } = {}): Promise<boolean> {
      if (!options.quiet) this.isChecking = true;
      let result: AuthSessionResponse;
      try {
        result = await $fetch<AuthSessionResponse>("/api/auth/session");
      } catch {
        // Server unreachable: a quiet check keeps the state, a full one starts signed out.
        if (!options.quiet) this._signOutLocally();
        return this.isAuthenticated;
      } finally {
        if (!options.quiet) this.isChecking = false;
      }

      if (result.authenticated) {
        this.user = result.user;
        this.csrfToken = result.csrfToken || this._readCsrfCookie();
        return true;
      }
      this.sessionExpired = this.isAuthenticated;
      this._signOutLocally();
      return false;
    },

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
          this.sessionExpired = false;
          this.csrfToken = this._readCsrfCookie();

          if (!this.csrfToken) {
            const session = await $fetch<AuthSessionResponse>("/api/auth/session");
            this.csrfToken = session.authenticated ? session.csrfToken || null : null;
          }

          return { success: true };
        }
        this._signOutLocally();
        return { success: false, message: "Login fehlgeschlagen" };
      } catch (error: any) {
        this._signOutLocally();
        const message = error.data?.statusMessage || error.data?.message || "Login fehlgeschlagen";
        return { success: false, message };
      }
    },

    /** The server ends the session without a CSRF token, so even a stale tab signs out for real. */
    async logout(): Promise<void> {
      try {
        await $fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Signed out locally either way.
      } finally {
        this._signOutLocally();
        this.sessionExpired = false;
      }
    },

    /** Keeps the session alive while the planner works, with at most one request per interval. */
    extendSession(): void {
      if (!this.user || Date.now() - this.lastExtendedAt < SESSION_EXTEND_INTERVAL_MS) return;
      this.lastExtendedAt = Date.now();
      void this.checkSession({ quiet: true });
    },
  },
});
