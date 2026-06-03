import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });

  // Kundenportal hat eigene Auth (JWT-Cookie + Layout-Guard).
  // Supabase-Session-Check hier komplett überspringen.
  const path0 = request.nextUrl.pathname;
  if (path0.startsWith("/portal") || path0.startsWith("/api/portal")) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Error-Landings (?error=…) müssen rendern dürfen, auch wenn noch eine
  // Session besteht — sonst Redirect-Loop bei kaputten/unvollständigen Konten
  // (Session vorhanden, aber keine Organisation/Profil-Row).
  const isAuthPage =
    (path === "/login" || path === "/register") &&
    !request.nextUrl.searchParams.has("error");
  const isProtected = path.startsWith("/dashboard");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
};
