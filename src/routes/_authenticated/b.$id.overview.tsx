import { createFileRoute, Link } from "@tanstack/react-router";
import { useBusiness } from "@/lib/hooks";
import { NotAnalysedYet, PageHead, useAnalysisResult } from "@/components/gate";
import { Btn, Eyebrow, Metric, Panel, StatusPill } from "@/components/kit";
import { inr, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/b/$id/overview")({
  head: () => ({
    meta: [
      { title: "Business Dashboard — CreditBridge" },
      {
        name: "description",
        content:
          "Creditworthiness signal, data trust, financial story and risk indicators for this business.",
      },
      { property: "og:title", content: "Business Dashboard — CreditBridge" },
      {
        property: "og:description",
        content:
          "Creditworthiness signal, data trust, financial story and risk indicators for this business.",
      },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { id } = Route.useParams();
  const business = useBusiness(id);
  const { result, isLoading } = useAnalysisResult(id);
  const b = business.data;

  if (isLoading) return <p className="text-[13.5px] text-ink-soft">Loading dashboard…</p>;
  if (!result) return <NotAnalysedYet id={id} />;

  const integrityStatus =
    result.integrity.level === "High" ? "good" : result.integrity.level === "Medium" ? "warn" : "risk";

  return (
    <div className="space-y-6">
      <PageHead
        title={b?.name ?? "Business dashboard"}
        sub="A decision-support view for a human lender. CreditBridge never approves or rejects a loan."
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Panel className="cb-enter bg-ink text-card">
          <Eyebrow className="text-card/50">Alternative Creditworthiness Signal</Eyebrow>
          <div className="mt-4 flex items-end gap-4">
            <p className="font-display text-[76px] font-bold leading-[0.85]">{result.score.value}</p>
            <div className="pb-2">
              <p className="font-display text-xl font-bold">{result.score.band}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-card/50">
                out of 100
              </p>
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-card/15">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${result.score.value}%` }}
            />
          </div>
          <p className="mt-4 text-[13.5px] leading-relaxed text-card/70">{result.score.summary}</p>
          <div className="mt-5 flex gap-2">
            <Link to="/b/$id/score" params={{ id }}>
              <Btn>Why this signal?</Btn>
            </Link>
            <Link to="/b/$id/story" params={{ id }}>
              <Btn variant="soft">Business story</Btn>
            </Link>
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel>
            <Eyebrow>Business details</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Metric label="Type" value={<span className="text-[15px]">{b?.business_type}</span>} />
              <Metric label="Age" value={<span className="text-[15px]">{b?.age_years} yrs</span>} />
              <Metric
                label="Declared monthly revenue"
                value={
                  <span className="text-[15px]">
                    {b?.declared_monthly_revenue ? inr(b.declared_monthly_revenue) : "Not declared"}
                  </span>
                }
              />
              <Metric
                label="Observed data"
                value={<span className="text-[15px]">{result.processing.valid} txns</span>}
                note={`${shortDate(result.processing.start)} – ${shortDate(result.processing.end)}`}
              />
            </div>
          </Panel>

          <Panel>
            <Eyebrow>Data trust</Eyebrow>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="font-display text-xl font-bold">
                Data Integrity: {result.integrity.level}
              </p>
              <StatusPill status={integrityStatus}>{result.integrity.score}/100</StatusPill>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              {result.integrity.level === "High"
                ? "No significant data anomalies were detected in the submitted records."
                : "Potential data anomalies were detected. Review the Trust & Consistency page before relying on this signal."}
            </p>
            <Link to="/b/$id/trust" params={{ id }} className="mt-4 inline-block">
              <Btn variant="ghost">Open trust checks</Btn>
            </Link>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Eyebrow>Financial story consistency</Eyebrow>
          <div className="mt-3">
            <StatusPill status={result.storyConsistency.status}>
              {result.storyConsistency.status === "good"
                ? "Consistent"
                : result.storyConsistency.status === "warn"
                  ? "Some deviation"
                  : "Significant deviation"}
            </StatusPill>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
            {result.storyConsistency.message}
          </p>
        </Panel>

        <Panel>
          <Eyebrow>Cross-signal consistency</Eyebrow>
          <div className="mt-3">
            <StatusPill status={result.crossSignal.status}>
              {result.crossSignal.status === "good"
                ? "Signals agree"
                : result.crossSignal.status === "warn"
                  ? "Partial disagreement"
                  : "Signals disagree"}
            </StatusPill>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
            {result.crossSignal.message}
          </p>
        </Panel>
      </div>

      <Panel>
        <Eyebrow>Risk indicators</Eyebrow>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {result.risks.map((r) => (
            <li
              key={r.label}
              className="rounded-2xl border border-ink/10 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13.5px] font-semibold">{r.label}</p>
                <StatusPill status={r.severity}>
                  {r.severity === "good" ? "Clear" : r.severity === "warn" ? "Watch" : "Risk"}
                </StatusPill>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{r.detail}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Eyebrow>Traditional credit vs CreditBridge</Eyebrow>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-paper p-4">
              <p className="font-display text-[15px] font-bold">Traditional bureau view</p>
              <ul className="mt-2 space-y-1.5 text-[12.5px] text-ink-soft">
                <li>· Needs formal loan or card history</li>
                <li>· Thin file → no score at all</li>
                <li>· Backward looking</li>
                <li>· Opaque reason codes</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-brand/8 p-4">
              <p className="font-display text-[15px] font-bold text-brand-deep">CreditBridge view</p>
              <ul className="mt-2 space-y-1.5 text-[12.5px] text-ink-soft">
                <li>· Uses day-to-day business activity</li>
                <li>· Works with no credit history</li>
                <li>· Reflects current cash flow</li>
                <li>· Every point is explained</li>
              </ul>
            </div>
          </div>
        </Panel>

        <Panel>
          <Eyebrow>Responsible scoring</Eyebrow>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[13px] font-semibold text-brand-deep">Features used</p>
              <ul className="mt-1.5 space-y-1 text-[12.5px] text-ink-soft">
                <li>· Revenue consistency</li>
                <li>· Cash-flow stability</li>
                <li>· Payment behaviour</li>
                <li>· Transaction patterns</li>
                <li>· Business activity level</li>
              </ul>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-coral">Explicitly excluded</p>
              <ul className="mt-1.5 space-y-1 text-[12.5px] text-ink-soft">
                <li>· Religion</li>
                <li>· Caste or community</li>
                <li>· Personal social-media behaviour</li>
                <li>· Unrelated personal characteristics</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">
            Proxy bias remains a live risk: business location, payment-method mix and customer base
            can indirectly encode protected characteristics. A human lender reviews every signal, and
            the model stays rule-based so drivers can be audited.
          </p>
        </Panel>
      </div>

      <Panel>
        <Eyebrow>Methodology &amp; limitations</Eyebrow>
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
          This is a prototype using synthetic demonstration data. There is no connection to banking
          systems, GST, UPI, Account Aggregators or credit bureaus, and no KYC. Manually supplied
          data cannot be proven authentic — CreditBridge only checks whether records are internally
          consistent and flags potential data anomalies. The signal is a transparent weighted
          rule-based calculation intended for human review, not an automated lending decision.
        </p>
      </Panel>
    </div>
  );
}
