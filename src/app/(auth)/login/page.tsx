"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { AuthButton, AuthCard, AuthInput, AuthToast, PasswordInput } from "@/components/auth";
import { signIn } from "../actions";

type LoginErrors = {
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(formData: FormData): LoginErrors {
  const errors: LoginErrors = {};
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) errors.email = "Please enter your email address.";
  else if (!emailPattern.test(email)) errors.email = "That email doesn't look right. Try something like name@example.com.";

  if (!password) errors.password = "Please enter your password.";

  return errors;
}

export default function LoginPage() {
  const [errors, setErrors] = useState<LoginErrors>({});
  const [toast, setToast] = useState<{ title: string; message: string; tone: "success" | "error" } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const nextErrors = validateLogin(formData);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return null;

      const result = await signIn(formData);
      return result ?? null;
    },
    null,
  );

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!state?.error) return;
    setToast({
      title: "Couldn't sign in",
      message: state.error,
      tone: "error",
    });
    passwordRef.current?.focus();
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      {toast ? <AuthToast {...toast} onClose={() => setToast(null)} /> : null}
      <AuthCard
        eyebrow="Sign in"
        title="Welcome back to iota"
        subtitle="Sign in to continue building your private knowledge archive."
        sideTitle={<>Your archive remembers what matters<span className="text-accent">.</span></>}
        sideText="Return to your PDFs, websites, and notes with a calm sign-in flow that helps you recover when something goes wrong."
        footer={
          <p className="text-sm text-muted text-center leading-relaxed">
            New to iota?{" "}
            <Link href="/register" className="text-accent hover:underline">Create an account</Link>
          </p>
        }
      >
        <form action={formAction} className="space-y-5" noValidate>
          <AuthInput
            ref={emailRef}
            id="email"
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            helper="Use the email you used to create your iota account."
            error={errors.email}
            onChange={() => setErrors((current) => ({ ...current, email: undefined }))}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="auth-label">Password</span>
              <Link href="/forgot-password" className="text-[11px] text-muted hover:text-accent transition-colors">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              ref={passwordRef}
              id="password"
              name="password"
              label=""
              autoComplete="current-password"
              placeholder="Enter your password"
              helper="Enter your password. You can reset it if you forgot."
              error={errors.password}
              onChange={() => setErrors((current) => ({ ...current, password: undefined }))}
            />
          </div>

          <AuthButton loading={pending} loadingText="Signing in...">
            Sign in
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </AuthButton>
        </form>

        <div className="mt-6 rounded-sm border border-black/10 bg-white/35 p-3 text-xs text-muted leading-relaxed">
          Trouble signing in? Check your email spelling, use the password visibility toggle, or reset your password in a few seconds.
        </div>
      </AuthCard>
    </>
  );
}