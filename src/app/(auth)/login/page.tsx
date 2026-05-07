"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signInWithOAuth } from "../actions";

// ─── Login Page ────────────────────────────────────────────────
export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await signIn(formData);
      return result ?? null;
    },
    null,
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 border-r border-black/10 relative overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-60 pointer-events-none" />

        {/* Registration marks */}
        <span className="reg reg-tl absolute top-6 left-6" aria-hidden="true" />
        <span className="reg reg-br absolute bottom-6 right-6" aria-hidden="true" />

        {/* Top */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center">
              <span className="font-serif italic text-sm">ι</span>
            </div>
            <span className="font-display font-medium text-lg">iota</span>
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <span className="w-6 h-px bg-accent" />
            <span className="section-label">Private knowledge engine</span>
          </div>

          <h2 className="text-4xl font-display font-medium leading-[1.1] tracking-tight mb-5">
            Your knowledge,{" "}
            <span className="font-serif italic text-accent">always</span>{" "}
            within reach
            <span className="text-accent">.</span>
          </h2>

          <p className="text-foreground/60 text-base max-w-sm leading-relaxed">
            Sign in to access your private vector index — PDFs, websites, and databases, all searchable in one place.
          </p>
        </div>

        {/* Chat preview card */}
        <div className="relative z-10">
          <div className="image-frame">
            <div className="chat-card">
              <div className="chat-head">
                <span className="dot" />
                <span>iota · live retrieval</span>
                <span className="src ml-auto">
                  <span>14 PDF</span>
                  <span>3 SITES</span>
                </span>
              </div>
              <div className="chat-body" style={{ minHeight: 0 }}>
                <div className="msg msg-user">
                  <div className="avatar">U</div>
                  <div className="bubble">Summarise the Q3 board report.</div>
                </div>
                <div className="msg msg-bot">
                  <div className="avatar">ι</div>
                  <div className="bubble">
                    Revenue grew 18% QoQ to $4.2M{" "}
                    <span className="cite">[1]</span>. Churn dropped to 2.1%{" "}
                    <span className="cite">[2]</span> after the onboarding revamp.
                    <div className="sources">
                      <div className="source">
                        <span className="ix">[1]</span>
                        <div>
                          <span className="nm">Q3-board-deck.pdf</span>
                          <br />
                          <span>p. 7</span>
                        </div>
                      </div>
                      <div className="source">
                        <span className="ix">[2]</span>
                        <div>
                          <span className="nm">metrics-q3.csv</span>
                          <br />
                          <span>row 42</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-muted tracking-wider uppercase">
            <span>iota · sheet 01</span>
            <span className="text-accent">AUTH · GATE · IO/26</span>
          </div>
        </div>

        {/* Bottom meta */}
        <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-muted tracking-wider uppercase border-t border-black/10 pt-4">
          <span>EST. MMXXVI</span>
          <span>10.7626° N · 106.6602° E</span>
          <span>v1.4.0</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center">
              <span className="font-serif italic text-sm">ι</span>
            </div>
            <span className="font-display font-medium text-lg">iota</span>
          </Link>
        </div>

        <div className="max-w-sm w-full mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-accent" />
              <span className="section-label text-[10px]">Sign in</span>
            </div>
            <h1 className="text-2xl font-display font-medium tracking-tight">
              Welcome back
              <span className="text-accent">.</span>
            </h1>
            <p className="text-sm text-muted mt-1.5">
              Don't have an account?{" "}
              <Link href="/register" className="text-accent hover:underline">
                Create one free
              </Link>
            </p>
          </div>

          {/* Error banner */}
          {state?.error && (
            <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded-sm text-sm text-red-700">
              {state.error}
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="space-y-4">
            <div>
              <label className="auth-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="auth-input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="auth-label" htmlFor="password">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[11px] text-muted hover:text-accent transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="auth-input"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="auth-primary-btn mt-2"
            >
              {pending ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-[10px] font-mono text-muted tracking-wider uppercase">or continue with</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3">
            <form action={async () => { await signInWithOAuth("google"); }}>
              <button type="submit" className="auth-oauth-btn w-full">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </form>
            <form action={async () => { await signInWithOAuth("github"); }}>
              <button type="submit" className="auth-oauth-btn w-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-muted text-center mt-8 leading-relaxed">
            By signing in you agree to our{" "}
            <Link href="#" className="hover:text-accent transition-colors">Terms</Link>
            {" "}and{" "}
            <Link href="#" className="hover:text-accent transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
