import { createFileRoute } from "@tanstack/react-router";
import { NotAnalysedYet, PageHead, useAnalysisResult } from "@/components/gate";
import { Eyebrow, Metric, Panel } from "@/components/kit";
import { BarSeries, NetFlowSeries } from "@/components/charts";
import { inr, monthShort, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/b/$id/financial")({
  head: () => ({
    meta: [
      { title: "Financial Analysis — CreditBridge" },
      {
        name: "description",
        content: "Revenue, expenses and cash-flow analysis derived from business transactions.",
      },
      { property: "og:title", content: "Financial Analysis — CreditBridge" },
      {
        property: "og:description",
        content: "Revenue, expenses and cash-flow analysis derived from business transactions.",
      },
    ],
  }),
  component: Financial,
});

function Financial() {
  const { id } = Route.useParams();
  const { result, isLoading } = useAnalysisResult(id);
  if (isLoading) return <p className="text-[13.5px] text-ink-soft">Loading…</p>;
  if (!result) return <NotAnalysedYet id={id} />;

  const { revenue, expense, cashflow } = result;

  return (
    <div className="space-y-6">
      <PageHead
        title="Financial Analysis"
        sub="Revenue, expenses and cash flow rebuilt month by month from the submitted transactions."
      />

      <Panel>
        <Eyebrow>Revenue</Eyebrow>
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total revenue" value={inr(revenue.total)} tone="brand" />
          <Metric label="Average monthly" value={inr(revenue.avgMonthly)} />
          <Metric
            label="Consistency"
            value={`${revenue.consistency}/100`}
            note="Higher means steadier month-to-month revenue"
          />
          <Metric
            label="Growth"
            value={pct(revenue.growthPct)}
            tone={revenue.growthPct >= 0 ? "brand" : "coral"}
            note={`${revenue.activeMonths} active months`}
          />
        </div>
        <div className="mt-6">
          <p className="mb-3 text-[13px] font-semibold">Monthly revenue</p>
          <BarSeries data={revenue.monthly} />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-[12.5px] text-ink-soft">
          {revenue.highest ? (
            <span>
              Highest month:{" "}
              <span className="font-semibold text-ink">
                {monthShort(revenue.highest.month)} · {inr(revenue.highest.value)}
              </span>
            </span>
          ) : null}
          {revenue.lowest ? (
            <span>
              Lowest month:{" "}
              <span className="font-semibold text-ink">
                {monthShort(revenue.lowest.month)} · {inr(revenue.lowest.value)}
              </span>
            </span>
          ) : null}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Expenses</Eyebrow>
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total expenses" value={inr(expense.total)} tone="coral" />
          <Metric label="Average monthly" value={inr(expense.avgMonthly)} />
          <Metric
            label="Expense-to-revenue"
            value={`${Math.round(expense.ratio * 100)}%`}
            tone={expense.ratio > 0.85 ? "coral" : undefined}
          />
          <Metric
            label="Expense growth"
            value={pct(expense.growthPct)}
            note={`${expense.spikes.length} spike month${expense.spikes.length === 1 ? "" : "s"}`}
          />
        </div>
        <div className="mt-6">
          <p className="mb-3 text-[13px] font-semibold">Monthly expenses</p>
          <BarSeries data={expense.monthly} tone="amber" />
        </div>
        {expense.spikes.length ? (
          <p className="mt-4 text-[12.5px] text-ink-soft">
            Spike months:{" "}
            <span className="font-semibold text-ink">
              {expense.spikes.map((s) => monthShort(s.month)).join(", ")}
            </span>
          </p>
        ) : null}
      </Panel>

      <Panel>
        <Eyebrow>Cash flow</Eyebrow>
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total inflow" value={inr(cashflow.inflow)} tone="brand" />
          <Metric label="Total outflow" value={inr(cashflow.outflow)} tone="coral" />
          <Metric
            label="Net position"
            value={inr(cashflow.net)}
            tone={cashflow.net >= 0 ? "brand" : "coral"}
          />
          <Metric
            label="Stability"
            value={`${cashflow.stability}/100`}
            note={`${cashflow.positiveMonths} positive · ${cashflow.negativeMonths} negative months`}
          />
        </div>
        <div className="mt-6">
          <p className="mb-3 text-[13px] font-semibold">Monthly net cash flow</p>
          <NetFlowSeries data={cashflow.monthly} />
        </div>
      </Panel>
    </div>
  );
}
