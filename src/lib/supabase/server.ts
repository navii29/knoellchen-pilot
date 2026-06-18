import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const createClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — middleware refreshes the session
          }
        },
      },
    }
  );
};

export const createAdminClient = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

// RLS-bearing portal client: ANON key + the customer's portal JWT as bearer,
// so Postgres RLS (portal_customer_id()/portal_org_id() policies) applies to
// every query. Use ONLY after getPortalSession/requirePortal has confirmed the
// session is live. Never pass a service-role key here.
export const createPortalClient = (accessToken: string) =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );

export const requireUser = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("No profile");
  return { user, profile, supabase };
};
