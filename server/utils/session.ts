import { randomBytes, timingSafeEqual } from "crypto";
import type { SessionUser } from "~/types/auth";

// ============================================
// SESSION STORE (In-Memory — für Production: Redis/SQLite empfohlen)
// ============================================
const sessions = new Map<
  string,
  {
    createdAt: number;
    expiresAt: number;
    lastActivity: number;
    csrfToken: string;
    user: SessionUser;
  }
>();

// Rate Limiting Store
const loginAttempts = new Map<
  string,
  {
    count: number;
    firstAttempt: number;
    blockedUntil: number | null;
  }
>();

// Konfiguration
const SESSION_DURATION = 30 * 60 * 1000; // 30 Minuten
const SESSION_EXTEND_ON_ACTIVITY = true;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW = 15 * 60 * 1000; // 15 Minuten
const BLOCK_DURATION = 15 * 60 * 1000; // 15 Minuten Sperre

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Erstellt eine neue Session und gibt den Token zurück
 */
export function createSession(user: SessionUser): { sessionToken: string; csrfToken: string } {
  // Cleanup alte Sessions
  cleanupExpiredSessions();

  const sessionToken = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(32).toString("hex");
  const now = Date.now();

  sessions.set(sessionToken, {
    createdAt: now,
    expiresAt: now + SESSION_DURATION,
    lastActivity: now,
    csrfToken,
    user,
  });

  return { sessionToken, csrfToken };
}

/**
 * Validiert einen Session-Token
 */
export function validateSession(token: string | undefined): boolean {
  return getSessionData(token) !== null;
}

/**
 * Holt den Benutzer zu einem gÃ¼ltigen Session-Token.
 */
export function getSessionData(token: string | undefined): SessionUser | null {
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;

  const now = Date.now();

  // Session abgelaufen?
  if (now > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  // Session verlängern bei Aktivität
  if (SESSION_EXTEND_ON_ACTIVITY) {
    session.lastActivity = now;
    session.expiresAt = now + SESSION_DURATION;
  }

  return session.user;
}

/**
 * Validiert den CSRF-Token für eine Session
 */
export function validateCsrfToken(
  sessionToken: string | undefined,
  csrfToken: string | undefined
): boolean {
  if (!sessionToken || !csrfToken) return false;

  const session = sessions.get(sessionToken);
  if (!session) return false;

  const now = Date.now();
  if (now > session.expiresAt) {
    sessions.delete(sessionToken);
    return false;
  }

  // Timing-safe comparison um Timing-Attacks zu verhindern
  if (session.csrfToken.length !== csrfToken.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(session.csrfToken),
      Buffer.from(csrfToken)
    );
  } catch {
    return false;
  }
}

/**
 * Holt den CSRF-Token für eine gültige Session
 */
export function getCsrfToken(sessionToken: string | undefined): string | null {
  if (!sessionToken) return null;

  const session = sessions.get(sessionToken);
  if (!session) return null;

  const now = Date.now();
  if (now > session.expiresAt) return null;

  return session.csrfToken;
}

/**
 * Löscht eine Session (Logout)
 */
export function destroySession(token: string | undefined): boolean {
  if (!token) return false;
  return sessions.delete(token);
}

/**
 * Bereinigt abgelaufene Sessions
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Prüft ob eine IP blockiert ist und zählt Versuche
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  blockedForSeconds: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  // Kein Record = erster Versuch
  if (!record) {
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS, blockedForSeconds: 0 };
  }

  // Aktuell blockiert?
  if (record.blockedUntil && now < record.blockedUntil) {
    const blockedForSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, blockedForSeconds };
  }

  // Block abgelaufen? Reset
  if (record.blockedUntil && now >= record.blockedUntil) {
    loginAttempts.delete(ip);
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS, blockedForSeconds: 0 };
  }

  // Zeitfenster abgelaufen? Reset
  if (now - record.firstAttempt > LOGIN_WINDOW) {
    loginAttempts.delete(ip);
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS, blockedForSeconds: 0 };
  }

  const remainingAttempts = MAX_LOGIN_ATTEMPTS - record.count;
  return { allowed: remainingAttempts > 0, remainingAttempts, blockedForSeconds: 0 };
}

/**
 * Registriert einen fehlgeschlagenen Login-Versuch
 */
export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  let record = loginAttempts.get(ip);

  if (!record || now - record.firstAttempt > LOGIN_WINDOW) {
    record = { count: 1, firstAttempt: now, blockedUntil: null };
  } else {
    record.count++;

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_DURATION;
    }
  }

  loginAttempts.set(ip, record);
}

/**
 * Setzt Rate Limit bei erfolgreichem Login zurück
 */
export function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// ============================================
// HELPER
// ============================================

/**
 * Extrahiert den Session-Token aus dem Request
 */
export function getSessionToken(event: any): string | undefined {
  // 1. Aus Authorization Header
  const authHeader = getHeader(event, "authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // 2. Aus Cookie
  const cookieToken = getCookie(event, "session_token");
  if (cookieToken) {
    return cookieToken;
  }

  return undefined;
}

/**
 * Extrahiert den CSRF-Token aus dem Request
 */
export function getCsrfTokenFromRequest(event: any): string | undefined {
  return getHeader(event, "x-csrf-token") || undefined;
}

/**
 * Holt die Client-IP (berücksichtigt Proxies wie Cloudflare/Traefik)
 */
export function getClientIP(event: any): string {
  // Cloudflare
  const cfIP = getHeader(event, "cf-connecting-ip");
  if (cfIP) return cfIP;

  // Standard Proxy Header
  const xForwardedFor = getHeader(event, "x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIP = getHeader(event, "x-real-ip");
  if (xRealIP) return xRealIP;

  // Fallback
  return event.node?.req?.socket?.remoteAddress || "unknown";
}
