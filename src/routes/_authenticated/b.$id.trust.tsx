import { createFileRoute } from "@tanstack/react-router";
import { NotAnalysedYet, PageHead, useAnalysisResult } from "@/components/gate";
import { CheckRow, Eyebrow, Panel, StatusPill } from "@/components/kit";
import { inr, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/b/$id/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Consistency — CreditBridge" },
      {
        name: "description",
        content:
          "Data integrity, financial story consistency and cross-signal consistency checks for the submitted data.",
      },
      { property: "og:title", content: "Trust & Consistency — CreditBridge" },
      {
        property: "og:description",
        content:
          "Data integrity, financial story consistency and cross-signal consistency checks for the submitted data.",
      },
    ],
  }),
  component: Trust,
});

function Trust() {
  const { id } = Route.useParams();
  const { result, isLoading } = useAnalysisResult(id);
  if (isLoading) return <p className="text-[13.5px] text-ink-soft">Loading…</p>;
  if (!result) return <NotAnalysedYet id={id} />;

  const { integrity, storyConsistency, crossSignal } = result;
  const integrityStatus =
    integrity.level === "High" ? "good" : integrity.level === "Medium" ? "warn" : "risk";

  return (
    <div className="space-y-6">
      <PageHead
        title="Trust & Consistency"
        sub="Three independent checks on whether the submitted financial data holds together. These are plausibility checks, not fraud detection."
      />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>Check 1</Eyebrow>
            <h2 className="mt-1 font-display text-lg font-bold tracking-tight">
              Data Integrity: {integrity.level}
            </h2>
          </div>
          <StatusPill status={integrityStatus}>{integrity.score}/100</StatusPill>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
          Structural checks on the records themselves: duplicates, unreadable dates, missing values,
          records outside the declared period, repeated identical entries, unusual round-number
          patterns and suspiciously uniform activity. Anything unusual is reported as a{" "}
          <span className="font-semibold text-ink">potential data anomaly</span> — it is never
          proof of wrongdoing.
        </p>
        <ul className="mt-4">
          {integrity.checks.map((c) => (
            <CheckRow key={c.label} status={c.status} label={c.label} detail={c.detail} />
          ))}
        </ul>
        {integrity.flaggedIds.length ? (
          <p className="mt-4 rounded-2xl bg-amber/10 px-4 py-3 text-[12.5px] text-amber">
            {integrity.flaggedIds.length} transaction
            {integrity.flaggedIds.length === 1 ? " is" : "s are"} highlighted in Transaction History
            for review.
          </p>
        ) : null}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>Check 2</Eyebrow>
            <h2 className="mt-1 font-display text-lg font-bold tracking-tight">
              Financial Story Consistency
            </h2>
          </div>
          <StatusPill status={storyConsistency.status}>
            {storyConsistency.status === "good"
              ? "Consistent"
              : storyConsistency.status === "warn"
                ? "Some deviation"
                : "Significant deviation"}
          </StatusPill>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
          Compares what the business declared with what its transactions actually show. A gap does
          not mean anything was falsified — declared figures are often rough estimates, or the data
          shared may cover only part of the business.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-paper p-4">
            <Eyebrow>Declared monthly</Eyebrow>
            <p className="mt-1 font-display text-xl font-bold">
              {storyConsistency.declared ? inr(storyConsistency.declared) : "Not declared"}
            </p>
          </div>
          <div className="rounded-2xl bg-paper p-4">
            <Eyebrow>Observed monthly inflow</Eyebrow>
            <p className="mt-1 font-display text-xl font-bold">{inr(storyConsistency.observed)}</p>
          </div>
          <div className="rounded-2xl bg-paper p-4">
            <Eyebrow>Deviation</Eyebrow>
            <p className="mt-1 font-display text-xl font-bold">
              {storyConsistency.deviationPct === null
                ? "—"
                : pct(storyConsistency.deviationPct)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed">{storyConsistency.message}</p>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>Check 3</Eyebrow>
            <h2 className="mt-1 font-display text-lg font-bold tracking-tight">
              Cross-Signal Consistency
            </h2>
          </div>
          <StatusPill status={crossSignal.status}>
            {crossSignal.status === "good"
              ? "Signals agree"
              : crossSignal.status === "warn"
                ? "Partial disagreement"
                : "Signals disagree"}
          </StatusPill>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
          Healthy growth usually shows up in several places at once. This rule-based check compares
          revenue growth, transaction-count growth and cash-flow growth. Large disagreement is worth
          a question, not a conclusion.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Revenue growth", v: crossSignal.revenueGrowth },
            { label: "Transaction growth", v: crossSignal.txnGrowth },
            { label: "Cash-flow growth", v: crossSignal.cashflowGrowth },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl bg-paper p-4">
              <Eyebrow>{m.label}</Eyebrow>
              <p className="mt-1 font-display text-xl font-bold">{pct(m.v)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed">{crossSignal.message}</p>
      </Panel>
    </div>
  );
}
