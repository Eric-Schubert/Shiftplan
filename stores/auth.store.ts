import { defineStore } from "pinia";
import type { UserRole } from "~/types/auth";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    role: null as UserRole | null,
    username: null as string | null,
    isChecking: true,
  }),

  getters: {
    isAuthenticated(): boolean {
      return this.role !== null;
    },
    isAdmin(): boolean {
      return this.role === "admin";
    },
    isPlanner(): boolean {
      return this.role === "planner";
    },
    /** Darf Schichtzuweisungen ändern (Admin oder Planner) */
    canEditShifts(): boolean {
      return this.role === "admin" || this.role === "planner";
    },
    /** Darf Stammdaten ändern (nur Admin) */
    canEditSettings(): boolean {
      return this.role === "admin";
    },
  },

  actions: {
    /**
     * Prüft beim App-Start ob eine gültige Session existiert
     */
    async checkSession(): Promise<boolean> {
      this.isChecking = true;
      try {
        const result = await $fetch<{
          authenticated: boolean;
          role: UserRole | null;
          username: string | null;
        }>("/api/auth/session");

        if (result.authenticated) {
          this.role = result.role;
          this.username = result.username;
          return true;
        }

        this.role = null;
        this.username = null;
        return false;
      } catch {
        this.role = null;
        this.username = null;
        return false;
      } finally {
        this.isChecking = false;
      }
    },

    /**
     * Login mit Benutzername und Passwort
     */
    async login(
      username: string,
      password: string
    ): Promise<{ success: boolean; message?: string }> {
      try {
        const result = await $fetch<{
          success: boolean;
          token: string;
          role: UserRole;
          username: string;
        }>("/api/auth/login", {
          method: "POST",
          body: { username, password },
        });

        if (result.success) {
          this.role = result.role;
          this.username = result.username;
          return { success: true };
        }
        return { success: false, message: "Login fehlgeschlagen" };
      } catch (error: any) {
        const message =
          error.data?.statusMessage || error.data?.message || "Login fehlgeschlagen";
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
        this.role = null;
        this.username = null;
      }
    },

    /**
     * Session verlängern (wird automatisch durch API-Calls gemacht)
     */
    extendSession(): void {
      // Die Session wird automatisch serverseitig verlängert
    },
  },
});
