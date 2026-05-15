import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  PORTAL_COOKIE,
  getPortalCustomer,
  portalCookieOptions,
} from "@/lib/portal-auth";
import { LoginClient } from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  // Symmetrisch zum (app)/layout.tsx prüfen: Session + Customer müssen
  // BEIDE existieren. Sonst gibt's Redirect-Loops, wenn ein gültiger JWT-
  // Cookie auf einen gelöschten/inaktiven Customer zeigt — Layout würde
  // dann zu /portal/login redirecten, login zu /portal/dashboard, endlos.
  const ctx = await getPortalCustomer();
  if (ctx) redirect("/portal/dashboard");
  // Falls Cookie existiert aber Customer-Lookup leer war: stales Cookie
  // mit denselben Optionen (insb. domain) löschen wie beim Set.
  if (cookies().get(PORTAL_COOKIE)?.value) {
    cookies().set(PORTAL_COOKIE, "", { ...portalCookieOptions(), maxAge: 0 });
  }

  const errorMap: Record<string, string> = {
    invalid: "Ungültiger Login-Link.",
    expired: "Login-Link abgelaufen — bitte einen neuen anfordern.",
  };
  const initialError = searchParams.error
    ? errorMap[searchParams.error] ?? null
    : null;

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 items-center justify-center shadow-lg shadow-teal-500/20 mb-3">
            <span className="text-white font-bold text-[20px]">K</span>
          </div>
          <h1 className="font-display text-stone-900 text-[26px] tracking-tight font-medium">
            Kundenportal
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Verträge, Dokumente und Selfservice an einem Ort.
          </p>
        </div>
        <LoginClient initialError={initialError} />
      </div>
    </div>
  );
}
