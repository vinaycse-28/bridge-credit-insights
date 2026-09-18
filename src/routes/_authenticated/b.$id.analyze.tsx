import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { runAnalysis } from "@/lib/data";
import { Eyebrow, Panel } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/b/$id/analyze")({
  head: () => ({
    meta: [
      { title: "Analysing business — CreditBridge" },
      {
        name: "description",
        content: "Running the CreditBridge alternative-data analysis pipeline.",
      },
      { property: "og:title", content: "Analysing business — CreditBridge" },
      {
        property: "og:description",
        content: "Running the CreditBridge alternative-data analysis pipeline.",
      },
    ],
  }),
  component: Processing,
});

const STEPS = [
  "Loading transactions",
  "Validating and normalising records",
  "Analysing revenue",
  "Analysing expenses",
  "Analysing cash flow",
  "Analysing transaction behaviour",
  "Running data integrity checks",
  "Detecting seasonality",
  "Analysing payment mix",
  "Checking financial story consistency",
  "Checking cross-signal consistency",
  "Identifying risk indicators",
  "Calculating creditworthiness signal",
  "Generating score explanation",
  "Writing business story",
];

function Processing() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const timer = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 260);

    (async () => {
      try {
        await runAnalysis(id);
        await queryClient.invalidateQueries();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed.");
        clearInterval(timer);
        return;
      }
      const wait = Math.max(0, STEPS.length * 260 + 300 - 0);
      setTimeout(() => {
        clearInterval(timer);
        setStep(STEPS.length - 1);
        setDone(true);
        setTimeout(() => navigate({ to: "/b/$id/overview", params: { id } }), 900);
      }, wait);
    })();

    return () => clearInterval(timer);
  }, [id, navigate, queryClient]);

  return (
    <div className="mx-auto max-w-2xl py-6">
      <Eyebrow>Step 3 of 3</Eyebrow>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
        {done ? "Analysis complete" : "Analysing business activity"}
      </h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        Rule-based, fully explainable analysis — no machine-learning black box.
      </p>

      <Panel className="mt-6">
        <ol className="space-y-1">
          {STEPS.map((label, i) => {
            const state = done || i < step ? "done" : i === step ? "active" : "todo";
            return (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition",
                  state === "active" && "bg-brand/8 font-semibold text-brand-deep",
                  state === "todo" && "text-ink-soft/55",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px]",
                    state === "done" && "bg-brand text-card",
                    state === "active" && "animate-pulse bg-amber text-card",
                    state === "todo" && "bg-ink/8 text-ink-soft",
                  )}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                {label}
              </li>
            );
          })}
        </ol>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ink/8">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${done ? 100 : ((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-2.5 text-[13px] text-coral">{error}</p>
        ) : null}
      </Panel>
    </div>
  );
}
