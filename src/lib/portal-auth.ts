import { cookies, headers } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

export const PORTAL_COOKIE = "kp_portal";              // short-lived access token
export const REFRESH_COOKIE = "kp_portal_refresh";     // long-lived refresh token

const ACCESS_TTL = "15m";
const ACCESS_MAXAGE_S = 15 * 60;                       // access cookie lifetime
const REFRESH_TTL_DAYS = 30;
const REFRESH_MAXAGE_S = REFRESH_TTL_DAYS * 24 * 60 * 60;

// =====================================================
// Passwort-Hashing
// =====================================================
export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

// =====================================================
// Refresh-Token (opak, server-seitig gehasht gespeichert)
// =====================================================
export const randomRefresh = (): string => randomBytes(32).toString("hex");
export const hashRefresh = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

// =====================================================
// Access-JWT — mit dem SUPABASE-JWT-Secret (HS256) signiert, damit PostgREST
// die Claims liest und RLS greift. Trägt role=authenticated + Portal-Claims,
// aber NIEMALS `sub` (siehe Invariante unten).
// =====================================================
export type PortalClaims = {
  customer_id: string;
  org_id: string;
  session_id: string;
  email: string;
};

// Rückwärtskompatibler Alias — viele Routen/Guards typisieren noch auf
// PortalSession; PortalClaims ist additiv (zusätzlich session_id).
export type PortalSession = PortalClaims;

const supabaseSecret = (): Uint8Array => {
  const s = process.env.SUPABASE_JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "SUPABASE_JWT_SECRET fehlt oder zu kurz (min 32 Zeichen). Legacy JWT Secret in .env.local setzen."
    );
  }
  return new TextEncoder().encode(s);
};

// INVARIANTE (sicherheitskritisch): Portal-Access-Tokens dürfen NIE `sub`
// setzen. Die RLS-Koexistenz beruht darauf, dass auth.uid() für Portal-Tokens
// NULL ist, damit die Operator-Policies (current_org_id()) keine Zeilen
// treffen. Ein `sub` würde Portal-Tokens Operator-Leserechte geben.
export const signAccessToken = (c: PortalClaims): Promise<string> =>
  new SignJWT({
    customer_id: c.customer_id,
    org_id: c.org_id,
    session_id: c.session_id,
    email: c.email,
    role: "authenticated",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setAudience("authenticated")
    .setExpirationTime(ACCESS_TTL)
    .sign(supabaseSecret());

export const verifyAccessToken = async (token: string): Promise<PortalClaims | null> => {
  try {
    const { payload } = await jwtVerify(token, supabaseSecret(), {
      audience: "authenticated",
    });
    if (
      typeof payload.customer_id === "string" &&
      typeof payload.org_id === "string" &&
      typeof payload.session_id === "string" &&
      typeof payload.email === "string"
    ) {
      return {
        customer_id: payload.customer_id,
        org_id: payload.org_id,
        session_id: payload.session_id,
        email: payload.email,
      };
    }
    return null;
  } catch {
    return null;
  }
};

// =====================================================
// Session-Lifecycle (portal_sessions). Diese Helper laufen vor/um eine gültige
// Portal-Session herum (Login/Refresh/Revoke) und nutzen daher BEWUSST den
// Admin-Client (Service-Role) — portal_sessions hat nur eine SELECT-RLS-Policy.
// =====================================================
type LoginRow = { id: string; customer_id: string; org_id: string; email: string };

export const createSession = async (
  login: LoginRow,
  meta: { userAgent?: string | null; ip?: string | null }
): Promise<{ access: string; refresh: string; session_id: string }> => {
  const admin = createAdminClient();
  const refresh = randomRefresh();
  const expiresAt = new Date(Date.now() + REFRESH_MAXAGE_S * 1000).toISOString();
  const { data, error } = await admin
    .from("portal_sessions")
    .insert({
      login_id: login.id,
      customer_id: login.customer_id,
      org_id: login.org_id,
      refresh_hash: hashRefresh(refresh),
      user_agent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Portal-Session konnte nicht erstellt werden: ${error?.message ?? "unbekannt"}`);
  }
  const session_id = data.id as string;
  const access = await signAccessToken({
    customer_id: login.customer_id,
    org_id: login.org_id,
    session_id,
    email: login.email,
  });
  return { access, refresh, session_id };
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  const admin = createAdminClient();
  await admin
    .from("portal_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);
};

export const revokeAllForCustomer = async (customerId: string): Promise<void> => {
  const admin = createAdminClient();
  await admin
    .from("portal_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("customer_id", customerId)
    .is("revoked_at", null);
};

// =====================================================
// Cookie-Optionen
// =====================================================
type CookieOpts = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  domain?: string;
};

const baseCookieOptions = (maxAge: number): CookieOpts => {
  const opts: CookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
  const domain = process.env.PORTAL_COOKIE_DOMAIN?.trim();
  if (domain) opts.domain = domain;
  return opts;
};

export const portalCookieOptions = (): CookieOpts => baseCookieOptions(ACCESS_MAXAGE_S);
export const portalRefreshCookieOptions = (): CookieOpts => baseCookieOptions(REFRESH_MAXAGE_S);

// Beide Portal-Cookies löschen (gleiche Optionen wie beim Set → inkl. domain).
export const clearPortalCookies = () => {
  cookies().set(PORTAL_COOKIE, "", { ...portalCookieOptions(), maxAge: 0 });
  cookies().set(REFRESH_COOKIE, "", { ...portalRefreshCookieOptions(), maxAge: 0 });
};

// =====================================================
// Server-Side: aktuelle Session abrufen.
// Prüft das Access-JWT UND dass die portal_sessions-Zeile noch lebt
// (Revocation / Logout-everywhere greifen sofort, unabhängig vom JWT-Exp).
// =====================================================
export const getPortalSession = async (): Promise<PortalClaims | null> => {
  const token = cookies().get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_sessions")
    .select("id, revoked_at, expires_at")
    .eq("id", claims.session_id)
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
  return claims;
};

// Lädt zusätzlich den vollständigen Customer-Datensatz aus DB.
// (Liest noch über den Admin-Client; die Umstellung auf den RLS-Client
// erfolgt in der Read-Migration, Phase 0.1 Task 9.)
export const getPortalCustomer = async () => {
  const session = await getPortalSession();
  if (!session) return null;
  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("id", session.customer_id)
    .eq("org_id", session.org_id)
    .maybeSingle();
  if (!customer) return null;
  return { session, customer };
};

// =====================================================
// In-Memory-Rate-Limit (pro Instanz; für Multi-Region prod durch
// Upstash/Redis ersetzen).
// =====================================================
type RateBucket = { count: number; reset: number };
const rateLimits = new Map<string, RateBucket>();

export const checkRateLimit = (
  key: string,
  maxAttempts = 5,
  windowMs = 60_000
): { ok: boolean; retry_after_s?: number } => {
  const now = Date.now();
  const bucket = rateLimits.get(key);
  if (!bucket || bucket.reset < now) {
    rateLimits.set(key, { count: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= maxAttempts) {
    return { ok: false, retry_after_s: Math.ceil((bucket.reset - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
};

export const resetRateLimit = (key: string) => {
  rateLimits.delete(key);
};

export const ipFromHeaders = (): string => {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
};

// =====================================================
// Portal-Base-URL Helper
// =====================================================
export const portalBaseUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
};
