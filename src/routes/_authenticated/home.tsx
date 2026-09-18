import { createFileRoute, Link } from "@tanstack/react-router";
import { useBusinesses } from "@/lib/hooks";
import { Panel, Eyebrow, StatusPill, Btn } from "@/components/kit";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — CreditBridge" },
      {
        name: "description",
        content: "Your assessed businesses and their latest creditworthiness signals.",
      },
      { property: "og:title", content: "Home — CreditBridge" },
      {
        property: "og:description",
        content: "Your assessed businesses and their latest creditworthiness signals.",
      },
    ],
  }),
  component: Home,
});

export function BusinessGrid() {
  const { data, isLoading } = useBusinesses();

  if (isLoading) return <p className="text-[13.5px] text-ink-soft">Loading businesses…</p>;

  if (!data?.length)
    return (
      <Panel className="text-center">
        <p className="font-display text-lg font-bold">No businesses yet</p>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-ink-soft">
          Create a business profile, add financial data — or load one of the three demo businesses —
          to generate an explainable creditworthiness signal.
        </p>
        <Link to="/new-business" className="mt-5 inline-block">
          <Btn>+ Create Business Profile</Btn>
        </Link>
      </Panel>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.map((b) => (
        <BusinessCard key={b.id} id={b.id} />
      ))}
    </div>
  );
}

import { useAnalysis, useBusiness } from "@/lib/hooks";

function BusinessCard({ id }: { id: string }) {
  const business = useBusiness(id);
  const analysis = useAnalysis(id);
  const b = business.data;
  const result = analysis.data?.result;
  if (!b) return null;

  const integrity = result?.integrity.level;

  return (
    <Panel className="cb-enter flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-[17px] font-bold tracking-tight">{b.name}</p>
          <p className="truncate text-[12.5px] text-ink-soft">{b.business_type}</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-ink px-3 py-2 text-center">
          <p className="font-display text-xl font-bold leading-none text-card">
            {result ? result.score.value : "—"}
          </p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.15em] text-card/50">
            Signal
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {result ? <StatusPill status={result.score.value >= 60 ? "good" : result.score.value >= 45 ? "warn" : "risk"}>{result.score.band}</StatusPill> : null}
        {integrity ? (
          <StatusPill
            status={integrity === "High" ? "good" : integrity === "Medium" ? "warn" : "risk"}
          >
            Data trust: {integrity}
          </StatusPill>
        ) : (
          <StatusPill status="warn">Not analysed yet</StatusPill>
        )}
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">
        Last analysed · {b.last_analyzed_at ? shortDate(b.last_analyzed_at) : "never"}
      </p>

      <div className="mt-5 flex gap-2">
        {result ? (
          <Link to="/b/$id/overview" params={{ id: b.id }} className="flex-1">
            <Btn className="w-full">View Dashboard</Btn>
          </Link>
        ) : (
          <Link to="/b/$id/data" params={{ id: b.id }} className="flex-1">
            <Btn className="w-full">Add Financial Data</Btn>
          </Link>
        )}
        <Link to="/b/$id/update" params={{ id: b.id }}>
          <Btn variant="ghost">Update Data</Btn>
        </Link>
      </div>
    </Panel>
  );
}

function Home() {
  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-ink p-8 text-card">
        <Eyebrow className="text-card/50">Welcome back</Eyebrow>
        <h1 className="mt-3 max-w-2xl font-display text-[30px] font-bold leading-tight tracking-tight">
          Turn real business activity into an explainable creditworthiness profile.
        </h1>
        <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-card/60">
          Every signal below is a decision-support output for human lender review — never an
          automatic approval or rejection.
        </p>
        <Link to="/new-business" className="mt-6 inline-block">
          <Btn>+ Create Business Profile</Btn>
        </Link>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight">My Businesses</h2>
          <Link to="/businesses" className="text-[13px] font-semibold text-brand-deep">
            View all →
          </Link>
        </div>
        <BusinessGrid />
      </div>
    </div>
  );
}
