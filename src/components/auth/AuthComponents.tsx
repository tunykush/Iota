"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { useState } from "react";

type AuthCardProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  sideTitle: ReactNode;
  sideText: string;
};

export function AuthCard({ eyebrow, title, subtitle, children, footer, sideTitle, sideText }: AuthCardProps) {
  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <BlueprintBackdrop />
      <aside className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 border-r border-black/10 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-80 pointer-events-none" />
        <div className="absolute inset-8 border border-black/10 pointer-events-none" />
        <div className="absolute left-12 right-12 top-28 h-px bg-black/10" />
        <div className="absolute left-12 right-12 bottom-28 h-px bg-black/10" />
        <div className="absolute left-28 top-12 bottom-12 w-px bg-black/10" />
        <BlueprintCorner className="top-6 left-6" />
        <BlueprintCorner className="bottom-6 right-6 rotate-180" />
        <BlueprintRuler side="left" />
        <BlueprintRuler side="bottom" />

        <div className="relative z-10">
          <BrandMark className="mb-16" />
          <div className="flex items-center gap-3 mb-6">
            <span className="w-6 h-px bg-accent" />
            <span className="section-label">Private knowledge archive</span>
          </div>
          <h2 className="text-4xl font-display font-medium leading-[1.1] tracking-tight mb-5">{sideTitle}</h2>
          <p className="text-foreground/60 text-base max-w-sm leading-relaxed">{sideText}</p>
        </div>

        <div className="relative z-10 rounded-sm border border-black/10 bg-white/40 p-5 shadow-[0_18px_60px_rgba(26,26,26,0.06)]">
          <BlueprintCorner className="-top-3 -left-3 scale-75" />
          <BlueprintCorner className="-bottom-3 -right-3 rotate-180 scale-75" />
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.18em] uppercase text-accent mb-4">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_0_4px_rgba(217,108,78,.14)]" />
            Access blueprint
          </div>
          <div className="grid grid-cols-[72px_1fr] gap-x-4 gap-y-3 text-sm text-foreground/70">
            <span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">01 / id</span>
            <p>Use your account email to locate the private workspace.</p>
            <span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">02 / key</span>
            <p>Reveal password only when you need to inspect the entry.</p>
            <span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">03 / route</span>
            <p className="font-serif italic text-lg text-foreground">Recover access without losing the trail.</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-muted tracking-wider uppercase border-t border-black/10 pt-4">
          <span>EST. MMXXVI</span>
          <span>AUTH · UX · IO/26</span>
          <span>iota</span>
        </div>
      </aside>

      <main className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-16 relative">
        <div className="lg:hidden mb-10"><BrandMark /></div>
        <section className="max-w-md w-full mx-auto rounded-sm border border-black/10 bg-card-bg/75 p-5 sm:p-7 shadow-[0_24px_70px_rgba(26,26,26,0.08)] relative backdrop-blur-[2px]">
          <BlueprintCorner className="-top-4 -left-4" />
          <BlueprintCorner className="-top-4 -right-4 rotate-90" />
          <BlueprintCorner className="-bottom-4 -left-4 -rotate-90" />
          <BlueprintCorner className="-bottom-4 -right-4 rotate-180" />
          <div className="absolute left-0 right-0 top-[72px] h-px bg-black/10" aria-hidden="true" />
          <div className="absolute left-7 top-0 bottom-0 w-px bg-black/[.055]" aria-hidden="true" />
          <div className="absolute right-7 top-0 bottom-0 w-px bg-black/[.055]" aria-hidden="true" />
          <div className="relative mb-7">
            <div className="mb-4 flex items-center justify-between border-b border-black/10 pb-3 font-mono text-[9px] uppercase tracking-[.18em] text-muted">
              <span>Sheet / auth</span>
              <span>Scale 1:1</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-accent" />
              <span className="section-label text-[10px]">{eyebrow}</span>
            </div>
            <h1 className="text-3xl font-display font-medium tracking-tight leading-tight">{title}<span className="text-accent">.</span></h1>
            <p className="text-sm text-muted mt-2 leading-relaxed">{subtitle}</p>
          </div>
          <div className="relative">{children}</div>
          {footer ? <div className="relative mt-7 border-t border-black/10 pt-5">{footer}</div> : null}
        </section>
      </main>
    </div>
  );
}

function BlueprintBackdrop() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(217,108,78,.10),transparent_26%),radial-gradient(circle_at_78%_72%,rgba(196,162,77,.12),transparent_28%)]" />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(0,0,0,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.035)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(0,0,0,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.055)_1px,transparent_1px)] [background-size:96px_96px]" />
    </div>
  );
}

function BlueprintCorner({ className = "" }: { className?: string }) {
  return (
    <span className={`absolute h-6 w-6 pointer-events-none ${className}`} aria-hidden="true">
      <span className="absolute left-0 top-0 h-px w-6 bg-foreground/50" />
      <span className="absolute left-0 top-0 h-6 w-px bg-foreground/50" />
      <span className="absolute left-2 top-2 h-1.5 w-1.5 border border-accent/60" />
    </span>
  );
}

function BlueprintRuler({ side }: { side: "left" | "bottom" }) {
  const ticks = Array.from({ length: 9 }, (_, index) => index);
  if (side === "bottom") {
    return (
      <div className="absolute bottom-12 left-28 right-12 flex justify-between" aria-hidden="true">
        {ticks.map((tick) => <span key={tick} className="h-2 w-px bg-black/20" />)}
      </div>
    );
  }

  return (
    <div className="absolute left-12 top-28 bottom-28 flex flex-col justify-between" aria-hidden="true">
      {ticks.map((tick) => <span key={tick} className="h-px w-2 bg-black/20" />)}
    </div>
  );
}

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center bg-white/30">
        <span className="font-serif italic text-sm">ι</span>
      </div>
      <span className="font-display font-medium text-lg">iota</span>
    </Link>
  );
}

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: string;
  error?: string;
};

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput({ label, helper, error, id, className = "", ...props }, ref) {
  const inputId = id ?? props.name;
  const describedBy = [helper ? `${inputId}-helper` : null, error ? `${inputId}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      {label ? <label className="auth-label" htmlFor={inputId}>{label}</label> : null}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`auth-input ${error ? "border-red-300 bg-red-50/50 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(217,108,78,.14)]" : ""} ${className}`}
        {...props}
      />
      {helper ? <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-muted leading-relaxed">{helper}</p> : null}
      <InlineError id={`${inputId}-error`} message={error} />
    </div>
  );
});

type PasswordInputProps = Omit<AuthInputProps, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput({ label, helper, error, id, onKeyUp, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const inputId = id ?? props.name;
  const describedBy = [helper ? `${inputId}-helper` : null, error ? `${inputId}-error` : null, capsLock ? `${inputId}-caps` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      {label ? <label className="auth-label" htmlFor={inputId}>{label}</label> : null}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`auth-input pr-20 ${error ? "border-red-300 bg-red-50/50" : ""}`}
          onKeyUp={(event) => {
            setCapsLock(event.getModifierState("CapsLock"));
            onKeyUp?.(event);
          }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-muted hover:text-accent"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {helper ? <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-muted leading-relaxed">{helper}</p> : null}
      {capsLock ? <p id={`${inputId}-caps`} className="mt-1.5 text-xs text-amber-700">Caps Lock is on. Your password may not match.</p> : null}
      <InlineError id={`${inputId}-error`} message={error} />
    </div>
  );
});

export function InlineError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-1.5 text-xs text-red-700 leading-relaxed">{message}</p>;
}

export function AuthButton({ children, loading, loadingText, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText: string }) {
  return (
    <button type="submit" disabled={loading || props.disabled} className="auth-primary-btn mt-2 disabled:cursor-not-allowed disabled:opacity-60" {...props}>
      {loading ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />{loadingText}</> : children}
    </button>
  );
}

export function AuthToast({ title, message, tone, onClose }: { title: string; message: string; tone: "success" | "error"; onClose: () => void }) {
  return (
    <div className="fixed right-4 top-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-sm border border-black/10 bg-card-bg p-4 shadow-[0_18px_50px_rgba(26,26,26,.16)]" role="status">
      <div className={`mb-2 h-1 w-12 rounded-full ${tone === "success" ? "bg-teal-600" : "bg-accent"}`} />
      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted leading-relaxed">{message}</p>
        </div>
        <button type="button" onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close notification">×</button>
      </div>
    </div>
  );
}

export function VerificationPanel({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="rounded-sm border border-teal-700/20 bg-teal-50/60 p-5 text-sm">
      <p className="font-serif italic text-2xl text-foreground">Verify your email</p>
      <p className="mt-2 text-muted leading-relaxed">We sent a link to {email || "your inbox"}. Once verified, you can continue to your iota workspace.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <a href="mailto:" className="dash-btn-primary">Open email app</a>
        <button type="button" className="dash-btn">Resend link</button>
        <button type="button" onClick={onBack} className="dash-btn">Back to sign in</button>
      </div>
    </div>
  );
}
