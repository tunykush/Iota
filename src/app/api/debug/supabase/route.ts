import { NextResponse } from "next/server";

export async function GET() {
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