import { Link } from "@tanstack/react-router";
import { Btn, Panel } from "./kit";
import { useAnalysis } from "@/lib/hooks";
import type { AnalysisResult } from "@/lib/types";

export function useAnalysisResult(id: string) {
  const q = useAnalysis(id);
  return { result: q.data?.result as AnalysisResult | undefined, isLoading: q.isLoading };
}

export function NotAnalysedYet({ id }: { id: string }) {
  return (
    <Panel className="mx-auto max-w-lg text-center">
      <p className="font-display text-lg font-bold">No analysis yet</p>
      <p className="mt-2 text-[13.5px] text-ink-soft">
        Add financial data for this business and run the analysis to see this page.
      </p>
      <Link to="/b/$id/data" params={{ id }} className="mt-5 inline-block">
        <Btn>Add Financial Data</Btn>
      </Link>
    </Panel>
  );
}

export function PageHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 max-w-2xl text-[13.5px] text-ink-soft">{sub}</p>
    </div>
  );
}
