import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  // Only allow in development, or require admin auth in production
  if (process.env.NODE_ENV === "production") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    // Only admins can access debug endpoints in production
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
        hasUrl: Boolean(supabaseUrl),
        hasKey: Boolean(supabaseKey),
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: supabaseKey,
      },
      cache: "no-store",
    });

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      url: supabaseUrl,
      keyPrefix: supabaseKey.slice(0, 14),
      body: await response.text(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        url: supabaseUrl,
        keyPrefix: supabaseKey.slice(0, 14),
        error: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error && "cause" in error ? error.cause : undefined,
      },
      { status: 500 },
    );
  }
}