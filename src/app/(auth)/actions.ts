"use server";

// ─── Auth Server Actions ───────────────────────────────────────
// All Supabase auth calls live here (server-side only).
// Forms call these actions — no API routes needed for auth.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AuthActionState = {
  error?: string;
  status?: "verification_sent" | "reset_sent";
  email?: string;
};

function friendlyAuthError(message?: string): string {
  const text = (message ?? "").toLowerCase();

  if (text.includes("invalid login") || text.includes("invalid credentials")) {
    return "We couldn't sign you in. Check your email and password, then try again.";
  }

  if (text.includes("already registered") || text.includes("already been registered") || text.includes("user already")) {
    return "This email already has an iota account. Try signing in instead.";
  }

  if (text.includes("network") || text.includes("fetch failed")) {
    return "Something went wrong connecting to iota. Please check your internet and try again.";
  }

  return "iota is having trouble right now. Please try again in a moment.";
}

// ─── Sign In ───────────────────────────────────────────────────
export async function signIn(formData: FormData): Promise<AuthActionState | never> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Clear any existing browser session before switching accounts.
  await supabase.auth.signOut();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("email", email).maybeSingle();

  revalidatePath("/", "layout");
  redirect(profile?.role === "admin" ? "/dashboard/admin" : "/dashboard");
}

// ─── Sign Up ───────────────────────────────────────────────────
export async function signUp(formData: FormData): Promise<AuthActionState | never> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  // Supabase may require email confirmation depending on project settings.
  // If email confirmation is OFF, user is logged in immediately → redirect to dashboard.
  // If email confirmation is ON, show a "check your email" message.
  revalidatePath("/", "layout");
  if (!data.session) {
    return { status: "verification_sent", email };
  }

  redirect("/dashboard");
}

// ─── Forgot Password ────────────────────────────────────────────
export async function sendPasswordReset(formData: FormData): Promise<AuthActionState> {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/dashboard/settings`,
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  return { status: "reset_sent", email };
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
