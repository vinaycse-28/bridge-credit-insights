import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Field, inputClass } from "@/components/kit";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CreditBridge" },
      {
        name: "description",
        content: "Sign in or register to open the CreditBridge lender console.",
      },
      { property: "og:title", content: "Sign in — CreditBridge" },
      {
        property: "og:description",
        content: "Sign in or register to open the CreditBridge lender console.",
      },
    ],
  }),
  component: AuthPage,
});

const DEMO_EMAIL = "demo.lender@creditbridge.app";
const DEMO_PASSWORD = "creditbridge-demo-2026";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  function validate() {
    if (mode === "register" && fullName.trim().length < 2) return "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (mode === "register" && password !== confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (err) throw err;
        toast.success("Account created");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
      navigate({ to: "/home", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function demoLogin() {
    setBusy(true);
    setError(null);
    try {
      let { error: err } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (err) {
        const signUp = await supabase.auth.signUp({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: "Demo Lender" },
          },
        });
        if (signUp.error) throw signUp.error;
        if (!signUp.data.session) {
          ({ error: err } = await supabase.auth.signInWithPassword({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
          }));
          if (err) throw err;
        }
      }
      navigate({ to: "/home", replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col justify-between bg-ink p-12 text-card lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-brand">
            <span className="font-display text-lg font-bold leading-none text-card">C</span>
          </div>
          <div className="leading-none">
            <p className="font-display text-[17px] font-bold tracking-tight">CreditBridge</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-card/50">
              Explainable credit signal
            </p>
          </div>
        </div>
        <div>
          <p className="font-display text-[34px] font-bold leading-tight">
            A business can be credit-invisible without being financially invisible.
          </p>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-card/60">
            Transaction activity, cash-flow behaviour and payment regularity become an explainable
            signal — reviewed by a human lender, never an automated decision.
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-card/40">
          Prototype · synthetic data only
        </p>
      </div>

      <div className="flex items-center justify-center bg-paper px-5 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {mode === "login" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-soft">
            {mode === "login"
              ? "Access your lender console and business assessments."
              : "Register to start assessing credit-invisible businesses."}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {mode === "register" ? (
              <Field label="Full name">
                <input
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Priya Raman"
                  autoComplete="name"
                />
              </Field>
            ) : null}
            <Field label="Email">
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@lender.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Password" hint={mode === "register" ? "Minimum 8 characters." : undefined}>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </Field>
            {mode === "register" ? (
              <Field label="Confirm password">
                <input
                  className={inputClass}
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            ) : null}

            {error ? (
              <p className="rounded-2xl bg-coral/10 px-4 py-2.5 text-[13px] text-coral">{error}</p>
            ) : null}

            <Btn type="submit" disabled={busy} className="w-full">
              {busy ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
            </Btn>
          </form>

          <div className="mt-4 space-y-2">
            <Btn
              variant="ghost"
              className="w-full"
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === "login" ? "register" : "login");
              }}
            >
              {mode === "login" ? "Continue to registration" : "Back to login"}
            </Btn>
            <Btn variant="soft" className="w-full" type="button" onClick={demoLogin} disabled={busy}>
              Use the demo account
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
