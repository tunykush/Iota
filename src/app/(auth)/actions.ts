"use server";

// ─── Auth Server Actions ───────────────────────────────────────
// All Supabase auth calls live here (server-side only).
// Forms call these actions — no API routes needed for auth.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ─── Sign In ───────────────────────────────────────────────────
export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Clear any existing browser session before switching accounts.
  await supabase.auth.signOut();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("email", email).maybeSingle();

  revalidatePath("/", "layout");
  redirect(profile?.role === "admin" ? "/dashboard/admin" : "/dashboard");
}

// ─── Sign Up ───────────────────────────────────────────────────
export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Supabase may require email confirmation depending on project settings.
  // If email confirmation is OFF, user is logged in immediately → redirect to dashboard.
  // If email confirmation is ON, show a "check your email" message.
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// ─── Sign Out ──────────────────────────────────────────────────
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// ─── OAuth (Google / GitHub) ───────────────────────────────────
export async function signInWithOAuth(provider: "google" | "github") {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}
