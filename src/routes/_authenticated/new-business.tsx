import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/data";
import { Btn, Field, Panel, Eyebrow, inputClass } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/new-business")({
  head: () => ({
    meta: [
      { title: "Create Business Profile — CreditBridge" },
      {
        name: "description",
        content: "Describe the business so its transaction data can be assessed in context.",
      },
      { property: "og:title", content: "Create Business Profile — CreditBridge" },
      {
        property: "og:description",
        content: "Describe the business so its transaction data can be assessed in context.",
      },
    ],
  }),
  component: NewBusiness,
});

const TYPES = [
  "Food Services",
  "Retail — Textiles",
  "Retail — General Store",
  "Hardware & Building Supplies",
  "Services — Repair",
  "Manufacturing — Small Unit",
  "Transport & Logistics",
  "Other",
];

function NewBusiness() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [age, setAge] = useState("3");
  const [revenue, setRevenue] = useState("");
  const [coverage, setCoverage] = useState("12");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Please enter the business name.");
      return;
    }
    const ageNum = Number(age);
    if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 100) {
      setError("Business age must be between 0 and 100 years.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const userId = await currentUserId();
      if (!userId) throw new Error("Not signed in");
      const { data, error: err } = await supabase
        .from("businesses")
        .insert({
          user_id: userId,
          name: name.trim().slice(0, 120),
          business_type: type,
          age_years: ageNum,
          declared_monthly_revenue: revenue.trim() ? Number(revenue) : null,
          coverage_months: Number(coverage),
        })
        .select("id")
        .single();
      if (err) throw err;
      await queryClient.invalidateQueries({ queryKey: ["businesses"] });
      navigate({ to: "/b/$id/data", params: { id: data.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the business profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Eyebrow>Step 1 of 3</Eyebrow>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
          Create business profile
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Context helps interpret the transaction data. Declared revenue is optional — when given,
          it is compared against observed activity as a consistency check.
        </p>
      </div>

      <Panel>
        <form onSubmit={save} className="space-y-4">
          <Field label="Business name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Lakshmi Street Foods"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business type">
              <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Business age (years)">
              <input
                className={inputClass}
                type="number"
                min={0}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </Field>
            <Field
              label="Declared monthly revenue (₹)"
              hint="Optional — used only for the financial story consistency check."
            >
              <input
                className={inputClass}
                type="number"
                min={0}
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="150000"
              />
            </Field>
            <Field label="Data coverage period">
              <select
                className={inputClass}
                value={coverage}
                onChange={(e) => setCoverage(e.target.value)}
              >
                {[3, 6, 12, 18, 24, 36].map((m) => (
                  <option key={m} value={m}>
                    Last {m} months
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {error ? (
            <p className="rounded-2xl bg-coral/10 px-4 py-2.5 text-[13px] text-coral">{error}</p>
          ) : null}

          <Btn type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save & Continue"}
          </Btn>
        </form>
      </Panel>
    </div>
  );
}
