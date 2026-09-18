import { createFileRoute } from "@tanstack/react-router";
import { NotAnalysedYet, PageHead, useAnalysisResult } from "@/components/gate";
import { Eyebrow, Metric, Panel } from "@/components/kit";
import { BarSeries, Donut, SeasonBars } from "@/components/charts";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/b/$id/behaviour")({
  head: () => ({
    meta: [
      { title: "Transaction Behaviour — CreditBridge" },
      {
        name: "description",
        content: "Transaction frequency, activity gaps, seasonality and payment mix.",
      },
      { property: "og:title", content: "Transaction Behaviour — CreditBridge" },
      {
        property: "og:description",
        content: "Transaction frequency, activity gaps, seasonality and payment mix.",
      },
    ],
  }),
  component: Behaviour;
});

function Behaviour() {
  const { id } = Route.useParams();
  const { result, isLoading } = useAnalysisResult(id);
  if (isLoading) return <p className="text-[13.5px] text-ink-soft">Loading…</p>;
  if (!result) return <NotAnalysedYet id={id} />;

  const { behaviour, seasonality, paymentMix } = result;

  return (
    <div className="space-y-6">
      <PageHead
        title="Transaction Behaviour"
        sub="How often the business transacts, how regular that activity is, and how money moves."
      />

      <Panel>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total transactions" value={behaviour.count} tone="brand" />
          <Metric label="Average amount" value={inr(behaviour.avgAmount)} />
          <Metric
            label="Frequency"
            value={`${behaviour.frequencyPerMonth}/month`}
            note={`${behaviour.inflowCount} inflows · ${behaviour.outflowCount} outflows`}
          />
          <Metric
            label="Longest inactive gap"
            value={`${behaviour.maxGapDays} days`}
            tone={behaviour.maxGapDays > 21 ? "amber" : undefined}
            note={`${behaviour.gapCount} gap${behaviour.gapCount === 1 ? "" : "s"} over 21 days`}
          />
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Transaction trend</Eyebrow>
        <p className="mb-3 mt-1 text-[13px] text-ink-soft">
          Number of transactions recorded each month.
        </p>
        <BarSeries data={behaviour.perMonth} money={false} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Eyebrow>Seasonality</Eyebrow>
          <p className="mb-3 mt-1 text-[13px] text-ink-soft">{seasonality.note}</p>
          <SeasonBars data={seasonality.index} />
          <div className="mt-4 flex flex-wrap gap-4 text-[12.5px] text-ink-soft">
            <span>
              High months:{" "}
              <span className="font-semibold text-ink">
                {seasonality.highMonths.join(", ") || "none"}
              </span>
            </span>
            <span>
              Low months:{" "}
              <span className="font-semibold text-ink">
                {seasonality.lowMonths.join(", ") || "none"}
              </span>
            </span>
          </div>
        </Panel>

        <Panel>
          <Eyebrow>Payment mix</Eyebrow>
          <p className="mb-4 mt-1 text-[13px] text-ink-soft">
            Share of transaction value by payment method.
          </p>
          <Donut segments={paymentMix.map((p) => ({ method: p.method, pct: p.pct }))} />
        </Panel>
      </div>
    </div>
  );
}
