import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { insertTransactions } from "@/lib/data";
import { useBusiness, useTransactions } from "@/lib/hooks";
import { DEMO_DATASETS } from "@/lib/demo";
import { CSV_HEADERS, downloadCsv, parseTransactionsCsv, sampleCsv } from "@/lib/csv";
import { Btn, Eyebrow, Field, Panel, inputClass, StatusPill } from "@/components/kit";
import { inr, shortDate } from "@/lib/format";
import type { Txn } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/b/$id/data")({
  head: () => ({
    meta: [
      { title: "Add Financial Data — CreditBridge" },
      {
        name: "description",
        content: "Upload a transaction CSV, enter transactions manually, or load a demo business.",
      },
      { property: "og:title", content: "Add Financial Data — CreditBridge" },
      {
        property: "og:description",
        content: "Upload a transaction CSV, enter transactions manually, or load a demo business.",
      },
    ],
  }),
  component: AddData,
});

export function ConsentPanel({ id, onGranted }: { id: string; onGranted: () => void }) {
  const [checks, setChecks] = useState({ history: true, activity: true, cashflow: true });
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  async function grant() {
    setBusy(true);
    await supabase.from("businesses").update({ consent_granted: true }).eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["business", id] });
    setBusy(false);
    onGranted();
  }

  const items = [
    { key: "history" as const, label: "Transaction history", note: "Dated inflows and outflows" },
    { key: "activity" as const, label: "Account activity", note: "Frequency and payment methods" },
    { key: "cashflow" as const, label: "Cash-flow summary", note: "Monthly net position" },
  ];

  return (
    <Panel className="border-brand/25 bg-brand/4">
      <Eyebrow>Simulated Account Aggregator consent · UI only</Eyebrow>
      <h2 className="mt-2 font-display text-xl font-bold tracking-tight">
        Share business financial data
      </h2>
      <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
        In a production system this step would run through a licensed Account Aggregator. Here it is
        a demonstration screen only — no real accounts are connected and all data used is synthetic.
      </p>

      <ul className="mt-5 space-y-2">
        {items.map((it) => (
          <li key={it.key}>
            <label className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-card px-4 py-3">
              <input
                type="checkbox"
                className="size-4 accent-[var(--brand)]"
                checked={checks[it.key]}
                onChange={(e) => setChecks({ ...checks, [it.key]: e.target.checked })}
              />
              <span>
                <span className="block text-[13.5px] font-semibold">{it.label}</span>
                <span className="block text-[12px] text-ink-soft">{it.note}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[12.5px] text-ink-soft">
        <span className="font-semibold text-ink">Purpose:</span> Creditworthiness assessment ·{" "}
        <span className="font-semibold text-ink">Retention:</span> This session only
      </p>

      <div className="mt-5 flex gap-2">
        <Btn onClick={grant} disabled={busy || !Object.values(checks).some(Boolean)}>
          Grant Consent
        </Btn>
        <Btn variant="ghost" onClick={() => toast("Consent declined — no data was requested.")}>
          Decline
        </Btn>
      </div>
    </Panel>
  );
}

function AddData() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const business = useBusiness(id);
  const txns = useTransactions(id);
  const [busy, setBusy] = useState(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "income",
    amount: "",
    payment_method: "UPI",
    category: "Daily sales",
    description: "",
  });

  const consentGranted = business.data?.consent_granted ?? false;

  async function commit(rows: Txn[], label: string) {
    setBusy(true);
    try {
      const { inserted, duplicates } = await insertTransactions(id, rows);
      await queryClient.invalidateQueries({ queryKey: ["transactions", id] });
      toast.success(
        `${label}: ${inserted} transaction${inserted === 1 ? "" : "s"} saved` +
          (duplicates ? ` · ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped` : ""),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save transactions.");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseTransactionsCsv(text);
    setCsvErrors(parsed.errors.slice(0, 6));
    if (parsed.rows.length) await commit(parsed.rows, "CSV uploaded");
    e.target.value = "";
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    if (!form.date) {
      toast.error("Pick a transaction date.");
      return;
    }
    await commit(
      [
        {
          transaction_id: `MAN-${Date.now()}`,
          txn_date: form.date,
          raw_date: form.date,
          type: form.type,
          amount,
          payment_method: form.payment_method,
          category: form.category.trim().slice(0, 60) || "Uncategorised",
          description: form.description.trim().slice(0, 200),
        },
      ],
      "Transaction added",
    );
    setForm({ ...form, amount: "", description: "" });
  }

  async function loadDemo(key: string) {
    const demo = DEMO_DATASETS.find((d) => d.key === key);
    if (!demo) return;
    setBusy(true);
    await supabase
      .from("businesses")
      .update({
        name: demo.name,
        business_type: demo.business_type,
        age_years: demo.age_years,
        declared_monthly_revenue: demo.declared_monthly_revenue,
        coverage_months: demo.coverage_months,
        demo_key: demo.key,
        consent_granted: true,
      })
      .eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["business", id] });
    await commit(demo.build(), `Loaded ${demo.name}`);
  }

  const recent = (txns.data ?? []).slice(-8).reverse();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Eyebrow>Step 2 of 3</Eyebrow>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">Add financial data</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          All data is synthetic and manually supplied. CreditBridge cannot prove that manually
          supplied data is authentic — it checks whether the data is internally consistent.
        </p>
      </div>

      {!consentGranted ? (
        <ConsentPanel id={id} onGranted={() => toast.success("Consent granted — synthetic data can now be received.")} />
      ) : null}

      <div className={consentGranted ? "space-y-6" : "pointer-events-none space-y-6 opacity-45"}>
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>Option A</Eyebrow>
              <h2 className="mt-1 font-display text-lg font-bold tracking-tight">
                Upload a transaction CSV
              </h2>
            </div>
            <Btn variant="ghost" onClick={() => downloadCsv("creditbridge-sample.csv", sampleCsv())}>
              Download Sample CSV
            </Btn>
          </div>
          <p className="mt-3 text-[13px] text-ink-soft">
            Expected columns:{" "}
            <span className="font-mono text-[12px] text-ink">{CSV_HEADERS.join(", ")}</span>. Dates
            may be YYYY-MM-DD or DD/MM/YYYY. <span className="font-mono">type</span> is income or
            expense; amounts in ₹.
          </p>
          <label className="mt-4 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-ink/20 px-4 py-8 text-[13.5px] text-ink-soft transition hover:border-brand hover:text-brand-deep">
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            Click to choose a CSV file
          </label>
          {csvErrors.length ? (
            <ul className="mt-3 space-y-1 rounded-2xl bg-amber/10 p-4 text-[12.5px] text-amber">
              {csvErrors.map((e) => (
                <li key={e}>⚠ {e}</li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Panel>
            <Eyebrow>Option B</Eyebrow>
            <h2 className="mt-1 font-display text-lg font-bold tracking-tight">
              Enter transactions manually
            </h2>
            <form onSubmit={addManual} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Date">
                <input
                  className={inputClass}
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Type">
                <select
                  className={inputClass}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </Field>
              <Field label="Amount (₹)">
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </Field>
              <Field label="Payment method">
                <select
                  className={inputClass}
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                >
                  {["UPI", "Bank Transfer", "Cash", "Card", "Other"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Category">
                <input
                  className={inputClass}
                  value={form.category}
                  maxLength={60}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </Field>
              <Field label="Description">
                <input
                  className={inputClass}
                  value={form.description}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Btn type="submit" disabled={busy}>
                  Add Transaction
                </Btn>
              </div>
            </form>
          </Panel>

          <Panel>
            <Eyebrow>Recently added</Eyebrow>
            <p className="mt-1 font-display text-lg font-bold tracking-tight">
              {txns.data?.length ?? 0} transactions stored
            </p>
            <ul className="mt-3 divide-y divide-ink/8">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                  <span className="font-mono text-[11.5px] text-ink-soft">
                    {shortDate(t.txn_date)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t.category}</span>
                  <span
                    className={
                      t.type === "income"
                        ? "font-mono text-[12.5px] font-bold text-brand-deep"
                        : "font-mono text-[12.5px] font-bold text-coral"
                    }
                  >
                    {t.type === "income" ? "+" : "−"}
                    {inr(t.amount)}
                  </span>
                </li>
              ))}
              {!recent.length ? (
                <li className="py-3 text-[13px] text-ink-soft">Nothing added yet.</li>
              ) : null}
            </ul>
          </Panel>
        </div>

        <Panel>
          <Eyebrow>Shortcut</Eyebrow>
          <h2 className="mt-1 font-display text-lg font-bold tracking-tight">
            Load a demo business
          </h2>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Three pre-built synthetic datasets that each produce a visibly different assessment.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {DEMO_DATASETS.map((d) => (
              <div key={d.key} className="rounded-2xl border border-ink/10 p-4">
                <p className="font-display text-[15px] font-bold">{d.title}</p>
                <p className="mt-1 text-[12.5px] text-ink-soft">{d.tagline}</p>
                <p className="mt-3 text-[12px] text-ink-soft">
                  <span className="font-semibold text-ink">Expect:</span> {d.expectation}
                </p>
                <Btn
                  variant="soft"
                  className="mt-4 w-full"
                  disabled={busy}
                  onClick={() => loadDemo(d.key)}
                >
                  Load Demo Business
                </Btn>
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex flex-wrap items-center gap-3">
          <Btn
            variant="dark"
            disabled={busy || !(txns.data?.length ?? 0)}
            onClick={() => navigate({ to: "/b/$id/analyze", params: { id } })}
          >
            Analyze Business
          </Btn>
          {!(txns.data?.length ?? 0) ? (
            <StatusPill status="warn">Add at least one transaction first</StatusPill>
          ) : null}
        </div>
      </div>
    </div>
  );
}
