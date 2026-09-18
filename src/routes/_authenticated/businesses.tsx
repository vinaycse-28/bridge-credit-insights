import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn } from "@/components/kit";
import { BusinessGrid } from "./home";

export const Route = createFileRoute("/_authenticated/businesses")({
  head: () => ({
    meta: [
      { title: "My Businesses — CreditBridge" },
      {
        name: "description",
        content: "All business profiles you have assessed with CreditBridge.",
      },
      { property: "og:title", content: "My Businesses — CreditBridge" },
      {
        property: "og:description",
        content: "All business profiles you have assessed with CreditBridge.",
      },
    ],
  }),
  component: Businesses,
});

function Businesses() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">My Businesses</h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Each profile keeps its own transactions, analysis history and signal.
          </p>
        </div>
        <Link to="/new-business">
          <Btn>+ Create Business Profile</Btn>
        </Link>
      </div>
      <BusinessGrid />
    </div>
  );
}
