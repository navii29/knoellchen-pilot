import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const POST = async (req: Request) => {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url));
};
