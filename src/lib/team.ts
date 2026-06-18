import { createClient } from "@/lib/supabase/server";

export type Membership = {
  userId: string;
  orgId: string;
  role: string; // 'owner' | 'member'
};

/** Aktuelle Org-Mitgliedschaft des eingeloggten Dashboard-Nutzers. */
export const getMembership = async (): Promise<Membership | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { userId: user.id, orgId: profile.org_id, role: profile.role ?? "member" };
};
