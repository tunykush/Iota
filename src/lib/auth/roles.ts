import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "user";

export type AuthUserContext = {
  id: string;
  email?: string;
  role: AppRole;
};

export async function getCurrentUserContext(): Promise<AuthUserContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? undefined,
    role: profile?.role === "admin" ? "admin" : "user",
  };
}

export async function requireAdmin(): Promise<AuthUserContext> {
  const user = await getCurrentUserContext();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return user;
}