import type { RetentionDays } from "~/shared/utils/retention";

/** Deployment facts the privacy policy depends on. Served by /api/legal/privacy. */
export interface PrivacyFacts {
  microsoft: boolean;
  appPush: boolean;
  defaultRelay: boolean;
  relayHost: string | null;
  retentionDays: RetentionDays;
  /** The planner's sign-in in the browser: lifetime and cookie names from auth.session. */
  session: { durationMinutes: number; cookieName: string; csrfCookieName: string };
}
