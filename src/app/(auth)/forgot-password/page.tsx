"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { AuthButton, AuthCard, AuthInput, AuthToast } from "@/components/auth";
import { sendPasswordReset } from "../actions";

type ResetErrors = {
  email?: string;
};

type ResetState = {
  error?: string;
  status?: "reset_sent";
  email?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateReset(formData: FormData): ResetErrors {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { email: "Please enter your email address." };
  if (!emailPattern.test(email)) return { email: "That email doesn't look right. Try something like name@example.com." };
  return {};
}

export default function ForgotPasswordPage() {
  const [errors, setErrors] = useState<ResetErrors>({});
  const [sentEmail, setSentEmail] = useState("");
  const [toast, setToast] = useState<{ title: string; message: string; tone: "success" | "error" } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: ResetState | null, formData: FormData): Promise<ResetState | null> => {
      const nextErrors = validateReset(formData);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return null;

      const result = await sendPasswordReset(formData);
      if (result.status === "reset_sent") return { status: "reset_sent", email: result.email };
      return { error: result.error };
    },
    null,
  );

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state?.status === "reset_sent") {
      setSentEmail(state.email ?? "");
      setToast({
        title: "Check your inbox",
        message: "We sent reset instructions if this email belongs to an account.",
        tone: "success",
      });
    }

    if (state?.error) {
      setToast({ title: "Couldn't send reset link", message: state.error, tone: "error" });
    }
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
        eyebrow="Password reset"
        title="Reset your iota password"
        subtitle="Enter your account email and we will send a secure link to help you get back in."
        sideTitle={<>A clear path back in<span className="text-accent">.</span></>}
        sideText="Forgotten passwords happen. iota keeps recovery simple, private, and easy to understand."
        footer={
          <p className="text-sm text-muted text-center leading-relaxed">
            Remembered it?{" "}
            <Link href="/login" className="text-accent hover:underline">Back to sign in</Link>
          </p>
        }
      >
        {sentEmail ? (
          <div className="rounded-sm border border-teal-700/20 bg-teal-50/60 p-5 text-sm">
            <p className="font-serif italic text-2xl text-foreground">Check your inbox</p>
            <p className="mt-2 text-muted leading-relaxed">
              We sent reset instructions to {sentEmail}. If it belongs to an iota account, the link will arrive shortly.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <a href="mailto:" className="dash-btn-primary">Open email app</a>
              <button type="button" className="dash-btn" onClick={() => setSentEmail("")}>Send another link</button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-5" noValidate>
            <AuthInput
              ref={emailRef}
              id="email"
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              helper="Use the email connected to your iota account."
              error={errors.email}
              onChange={() => setErrors((current) => ({ ...current, email: undefined }))}
            />

            <AuthButton loading={pending} loadingText="Sending reset link...">
              Send reset link
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </AuthButton>
          </form>
        )}
      </AuthCard>
    </>
  );
}