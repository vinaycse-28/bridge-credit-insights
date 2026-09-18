import { createFileRoute } from "@tanstack/react-router";
import { NotAnalysedYet, PageHead, useAnalysisResult } from "@/components/gate";
import { Eyebrow, Panel } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/b/$id/story")({
  head: () => ({
    meta: [
      { title: "Business Story — CreditBridge" },
      {
        name: "description",
        content: "A plain-language, evidence-backed summary of how this business actually operates.",
      },
      { property: "og:title", content: "Business Story — CreditBridge" },
      {
        property: "og:description",
        content: "A plain-language, evidence-backed summary of how this business actually operates.",
      },
    ],
  }),
  component: Story,
});

function Story() {
  const { id } = Route.useParams();
  const { result, isLoading } = useAnalysisResult(id);
  if (isLoading) return <p className="text-[13.5px] text-ink-soft">Loading…</p>;
  if (!result) return <NotAnalysedYet id={id} />;

  return (
    <div className="space-y-6">
      <PageHead
        title="Business Story"
        sub="Written from the business's own numbers — every sentence traces back to the evidence below."
      />

      <Panel>
        <Eyebrow>Generated summary</Eyebrow>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
          {result.story.text
            .split("\n")
            .filter(Boolean)
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>
      </Panel>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Evidence</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.story.evidence.map((e) => (
            <Panel key={e.label} className="cb-enter">
              <Eyebrow>{e.label}</Eyebrow>
              <p className="mt-2 font-display text-xl font-bold">{e.value}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{e.note}</p>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
