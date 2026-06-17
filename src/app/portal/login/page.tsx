import { redirect } from "next/navigation";
import { getPortalCustomer } from "@/lib/portal-auth";
import { LoginClient } from "./LoginClient";
import { Logo } from "@/components/ui/Logo";

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
  // Stale Cookies können wir hier nicht löschen (Next 14 verbietet
  // cookies().set() in Server-Components); sie werden beim nächsten Login
  // überschrieben oder laufen nach 30 Tagen aus.
  const ctx = await getPortalCustomer();
  if (ctx) redirect("/portal/dashboard");

  const errorMap: Record<string, string> = {
    invalid: "Ungültiger Login-Link.",
    expired: "Login-Link abgelaufen — bitte einen neuen anfordern.",
  };
  const initialError = searchParams.error
    ? errorMap[searchParams.error] ?? null
    : null;

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo size={36} tone="light" wordmark={false} />
          </div>
          <h1 className="font-display text-ink text-[26px] tracking-tightest font-bold">
            Kundenportal
          </h1>
          <p className="text-[13px] text-ink-muted mt-1.5">
            Verträge, Dokumente und Selfservice an einem Ort.
          </p>
        </div>
        <LoginClient initialError={initialError} />

        <div className="mt-6 flex items-center justify-center gap-x-4 text-[11px] text-ink-muted">
          <a href="/impressum" className="hover:text-ink-soft transition-colors">Impressum</a>
          <a href="/datenschutz" className="hover:text-ink-soft transition-colors">Datenschutz</a>
          <a href="/agb" className="hover:text-ink-soft transition-colors">AGB</a>
        </div>
      </div>
    </div>
  );
}
