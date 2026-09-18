import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CreditBridge — Explainable credit signals for credit-invisible MSMEs" },
      {
        name: "description",
        content:
          "Turn real business activity into an explainable creditworthiness profile. A decision-support signal for human lenders, not an automated loan decision.",
      },
      {
        property: "og:title",
        content: "CreditBridge — Explainable credit signals for credit-invisible MSMEs",
      },
      {
        property: "og:description",
        content:
          "Alternative-data credit assessment for MSMEs: transaction behaviour, cash-flow analysis, trust checks and a fully explained signal.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-2.5 px-5">
        <div className="grid size-9 place-items-center rounded-xl bg-brand">
          <span className="font-display text-lg font-bold leading-none text-card">C</span>
        </div>
        <div className="leading-none">
          <p className="font-display text-[17px] font-bold tracking-tight">CreditBridge</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-soft">
            Explainable credit signal
          </p>
        </div>
        <Link
          to="/auth"
          className="ml-auto rounded-full border border-ink/15 px-4 py-2 text-[13px] font-semibold transition hover:bg-ink hover:text-card"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber/15 px-3 py-1.5">
          <span className="size-2 rounded-full bg-amber" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">
            Hackathon prototype · synthetic data only
          </span>
        </div>
        <h1 className="mt-5 max-w-3xl font-display text-[44px] font-bold leading-[0.98] tracking-tight lg:text-[64px]">
          A business can be credit-invisible without being financially invisible.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          CreditBridge turns business transaction activity into an explainable creditworthiness
          profile — and checks whether the submitted financial story is internally consistent. The
          output is a signal for human lender review, never an automatic loan decision.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="rounded-full bg-brand px-6 py-3 text-[14px] font-semibold text-card transition hover:bg-brand-deep"
          >
            Open the lender console
          </Link>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            {
              t: "Traditional credit view",
              d: "No meaningful formal credit history → insufficient information.",
            },
            {
              t: "CreditBridge view",
              d: "Transaction activity, cash-flow behaviour, payment regularity and revenue patterns.",
            },
            {
              t: "The result",
              d: "An explainable 0–100 signal with drivers, risk indicators and a written business story.",
            },
          ].map((c) => (
            <div key={c.t} className="rounded-3xl border border-ink/8 bg-card p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                {c.t}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
