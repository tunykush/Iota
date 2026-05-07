"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { AuthButton, AuthCard, AuthInput, AuthToast, PasswordInput, VerificationPanel } from "@/components/auth";
import { signUp } from "../actions";

type RegisterErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

type RegisterState = {
  error?: string;
  status?: "verification_sent";
  email?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(formData: FormData): RegisterErrors {
  const errors: RegisterErrors = {};
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const acceptedTerms = formData.get("terms") === "on";

  if (!fullName) errors.fullName = "Please enter your full name.";
  if (!email) errors.email = "Please enter your email address.";
  else if (!emailPattern.test(email)) errors.email = "That email doesn't look right. Try something like name@example.com.";
  if (!password) errors.password = "Please enter your password.";
  else if (password.length < 8) errors.password = "Your password needs at least 8 characters.";
  if (!confirmPassword) errors.confirmPassword = "Please confirm your password.";
  else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match yet.";
  if (!acceptedTerms) errors.terms = "Please accept the Terms and Privacy Policy before continuing.";

  return errors;
}

export default function RegisterPage() {
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; message: string; tone: "success" | "error" } | null>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: RegisterState | null, formData: FormData): Promise<RegisterState | null> => {
      const nextErrors = validateRegister(formData);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return null;

      const result = await signUp(formData);
      if (result.status === "verification_sent") return { status: "verification_sent", email: result.email };
      return { error: result.error };
    },
    null,
  );

  useEffect(() => {
    fullNameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state?.status === "verification_sent") {
      setVerificationEmail(state.email ?? "");
      setToast({
        title: "Check your inbox",
        message: "We sent a verification link to your email. Please check your inbox before continuing.",
        tone: "success",
      });
    }

    if (state?.error) {
      setToast({ title: "Couldn't create account", message: state.error, tone: "error" });
    }
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Za-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const strengthColor = ["bg-black/10", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-teal-600"];

  return (
    <>
      {toast ? <AuthToast {...toast} onClose={() => setToast(null)} /> : null}
      <AuthCard
        eyebrow="Create account"
        title="Create your iota workspace"
        subtitle="Start a private AI knowledge base for your PDFs, websites, and notes."
        sideTitle={<>A quieter home for your research<span className="text-accent">.</span></>}
        sideText="Set up a private workspace, upload your sources, and start asking grounded questions when you are ready."
        footer={
          <p className="text-sm text-muted text-center leading-relaxed">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">Sign in</Link>
          </p>
        }
      >
        {verificationEmail ? (
          <VerificationPanel email={verificationEmail} onBack={() => setVerificationEmail(null)} />
        ) : (
          <form action={formAction} className="space-y-5" noValidate>
            <AuthInput
              ref={fullNameRef}
              id="full-name"
              name="fullName"
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              error={errors.fullName}
              onChange={() => setErrors((current) => ({ ...current, fullName: undefined }))}
            />

            <AuthInput
              id="email"
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              helper="Use the email you want connected to your iota workspace."
              error={errors.email}
              onChange={() => setErrors((current) => ({ ...current, email: undefined }))}
            />

            <div>
              <PasswordInput
                id="password"
                name="password"
                label="Password"
                autoComplete="new-password"
                placeholder="Use at least 8 characters"
                helper="Use at least 8 characters with a mix of letters and numbers."
                error={errors.password}
                value={password}
                onChange={(event) => {
                  setPassword(event.currentTarget.value);
                  setErrors((current) => ({ ...current, password: undefined }));
                }}
              />
              <div className="flex gap-1 mt-2" aria-hidden="true">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className={`h-0.5 flex-1 rounded-full transition-colors ${item <= strength ? strengthColor[strength] : "bg-black/10"}`} />
                ))}
              </div>
            </div>

            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              label="Confirm password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              helper="Re-enter your password to make sure it matches."
              error={errors.confirmPassword}
              onChange={() => setErrors((current) => ({ ...current, confirmPassword: undefined }))}
            />

            <div>
              <label className="flex items-start gap-3 rounded-sm border border-black/10 bg-white/30 p-3 text-sm text-foreground/75">
                <input
                  name="terms"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-black/20 accent-[#D96C4E]"
                  aria-invalid={Boolean(errors.terms)}
                  onChange={() => setErrors((current) => ({ ...current, terms: undefined }))}
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="text-accent hover:underline">Terms</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
                </span>
              </label>
              {errors.terms ? <p className="mt-1.5 text-xs text-red-700 leading-relaxed">{errors.terms}</p> : null}
            </div>

            <AuthButton loading={pending} loadingText="Creating account...">
              Create account
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