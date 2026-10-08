import { defineStore } from "pinia";
import type { SessionUser } from "~/types/auth";
import { readCsrfCookie, type AuthSessionResponse, type LoginResponse } from "./auth/session";

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
    _readCsrfCookie(): string | null {
      return readCsrfCookie();
    },

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
          this.csrfToken = this._readCsrfCookie();

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

    async logout(): Promise<void> {
      try {
        await $fetch("/api/auth/logout", {
          method: "POST",
          headers: this._csrfHeaders(),
        });
      } catch {
        // Signed out locally either way.
      } finally {
        this.user = null;
        this.csrfToken = null;
      }
    },

    _csrfHeaders(): Record<string, string> {
      if (this.csrfToken) {
        return { "x-csrf-token": this.csrfToken };
      }
      return {};
    },

    extendSession(): void {},
  },
});
