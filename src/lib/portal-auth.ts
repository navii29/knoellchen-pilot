import { cookies, headers } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

export const PORTAL_COOKIE = "kp_portal";
const TOKEN_TTL_DAYS = 30;

const getSecret = () => {
  const secret = process.env.PORTAL_JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error(
      "PORTAL_JWT_SECRET fehlt oder zu kurz (min 24 Zeichen). In .env.local setzen."
    );
  }
  return new TextEncoder().encode(secret);
};

// =====================================================
// Passwort-Hashing
// =====================================================
export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, 12);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

// =====================================================
// Magic-Token (kryptographisch zufällig, 32 Byte → 64 hex)
// =====================================================
export const createMagicToken = (): {
  token: string;
  expires: Date;
} => {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  return { token, expires };
};

// =====================================================
// JWT
// =====================================================
export type PortalSession = {
  customer_id: string;
  org_id: string;
  email: string;
};

export const signSessionToken = async (s: PortalSession): Promise<string> => {
  return await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_DAYS}d`)
    .sign(getSecret());
};

export const verifySessionToken = async (
  token: string
): Promise<PortalSession | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.customer_id === "string" &&
      typeof payload.org_id === "string" &&
      typeof payload.email === "string"
    ) {
      return {
        customer_id: payload.customer_id,
        org_id: payload.org_id,
        email: payload.email,
      };
    }
    return null;
  } catch {
    return null;
  }
};

// =====================================================
// Cookie-Helpers
// =====================================================
export const portalCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60,
});

export const setSessionCookie = (token: string) => {
  cookies().set(PORTAL_COOKIE, token, portalCookieOptions());
};

export const clearSessionCookie = () => {
  cookies().delete(PORTAL_COOKIE);
};

// =====================================================
// Server-Side: aktuelle Session abrufen
// =====================================================
export const getPortalSession = async (): Promise<PortalSession | null> => {
  const token = cookies().get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
};

// Lädt zusätzlich den vollständigen Customer-Datensatz aus DB.
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
// In-Memory-Rate-Limit (pro Instanz; für Multi-Region prod sollte
// das durch Upstash/Redis ersetzt werden — reicht aber für Vercel
// Single-Region und schützt vor offensichtlichem Brute-Force).
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
// Portal-Base-URL Helper (für Magic-Links)
// =====================================================
export const portalBaseUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
};
