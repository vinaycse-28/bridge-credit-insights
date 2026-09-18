import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { NotAnalysedYet, PageHead, useAnalysisResult } from "@/components/gate";
import { Eyebrow, Panel, StatusPill } from "@/components/kit";
import { DriverBar } from "@/components/charts";
import { getAnalysisHistory } from "@/lib/data";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/b/$id/score")({
  head: () => ({
    meta: [
      { title: "Score Explanation — CreditBridge" },
      {
        name: "description",
        content: "Every point of the creditworthiness signal, with positive and negative drivers.",
      },
      { property: "og:title", content: "Score Explanation — CreditBridge" },
      {
        property: "og:description",
        content: "Every point of the creditworthiness signal, with positive and negative drivers.",
      },
    ],
  }),
  component: Score,
});

function Score() {
  const { id } = Route.useParams();
  const { result, isLoading } = useAnalysisResult(id);
  const history = useQuery({
    queryKey: ["analysis-history", id],
    queryFn: () => getAnalysisHistory(id),
  });

  if (isLoading) return <p className="text-[13.5px] text-ink-soft">Loading…</p>;
  if (!result) return <NotAnalysedYet id={id} />;

  const { score, risks } = result;
  const all = [...score.positives, ...score.negatives];
  const max = Math.max(...all.map((d) => Math.abs(d.points)), 1);
  const rows = history.data ?? [];
  const previous = rows.length > 1 ? rows[1] : null;
  const delta = previous ? score.value - previous.score : null;

  return (
    <div className="space-y-6">
      <PageHead
        title="Why this signal?"
        sub="The signal is a transparent weighted calculation. Every driver below moved it by the exact number of points shown."
      />

      <Panel className="bg-ink text-card">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <Eyebrow className="text-card/50">Alternative Creditworthiness Signal</Eyebrow>
            <div className="mt-3 flex items-end gap-4">
              <p className="font-display text-[68px] font-bold leading-[0.85]">{score.value}</p>
              <p className="pb-2 font-display text-xl font-bold">{score.band}</p>
            </div>
          </div>
          {delta !== null ? (
            <div className="rounded-2xl bg-card/10 px-5 py-3">
              <Eyebrow className="text-card/50">Since previous analysis</Eyebrow>
              <p className="mt-1 font-display text-2xl font-bold">
                {delta > 0 ? "+" : ""}
                {delta} pts
              </p>
              <p className="font-mono text-[10px] text-card/50">
                was {previous?.score} · {shortDate(previous?.created_at ?? null)}
              </p>
            </div>
          ) : null}
        </div>
        <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-card/70">{score.summary}</p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Eyebrow>Positive drivers</Eyebrow>
          <ul className="mt-4 space-y-3">
            {score.positives.map((d) => (
              <li key={d.label}>
                <ul>
                  <DriverBar label={d.label} points={d.points} max={max} />
                </ul>
                <p className="ml-[9.7rem] mt-1 text-[12px] leading-relaxed text-ink-soft">
                  {d.detail}
                </p>
              </li>
            ))}
            {!score.positives.length ? (
              <li className="text-[13px] text-ink-soft">No positive drivers identified.</li>
            ) : null}
          </ul>
        </Panel>

        <Panel>
          <Eyebrow>Negative drivers</Eyebrow>
          <ul className="mt-4 space-y-3">
            {score.negatives.map((d) => (
              <li key={d.label}>
                <ul>
                  <DriverBar label={d.label} points={d.points} max={max} />
                </ul>
                <p className="ml-[9.7rem] mt-1 text-[12px] leading-relaxed text-ink-soft">
                  {d.detail}
                </p>
              </li>
            ))}
            {!score.negatives.length ? (
              <li className="text-[13px] text-ink-soft">No penalties were applied.</li>
            ) : null}
          </ul>
        </Panel>
      </div>

      <Panel>
        <Eyebrow>What changed the signal?</Eyebrow>
        <p className="mb-4 mt-1 text-[13px] text-ink-soft">
          Contribution of each factor to the final number, largest first.
        </p>
        <ul className="space-y-2.5">
          {[...all]
            .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
            .map((d) => (
              <DriverBar key={d.label} label={d.label} points={d.points} max={max} />
            ))}
        </ul>
      </Panel>

      <Panel>
        <Eyebrow>Risk warnings</Eyebrow>
        <ul className="mt-3 space-y-2">
          {risks
            .filter((r) => r.severity !== "good")
            .map((r) => (
              <li key={r.label} className="rounded-2xl border border-ink/10 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-semibold">{r.label}</p>
                  <StatusPill status={r.severity}>
                    {r.severity === "warn" ? "Watch" : "Risk"}
                  </StatusPill>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{r.detail}</p>
              </li>
            ))}
          {!risks.some((r) => r.severity !== "good") ? (
            <li className="text-[13px] text-ink-soft">No risk warnings were raised.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
