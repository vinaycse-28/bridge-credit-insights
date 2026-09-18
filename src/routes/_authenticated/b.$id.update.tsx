import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { insertTransactions, runAnalysis } from "@/lib/data";
import { useTransactions } from "@/lib/hooks";
import { useAnalysisResult } from "@/components/gate";
import { PageHead } from "@/components/gate";
import { Btn, Eyebrow, Field, Panel, StatusPill, inputClass } from "@/components/kit";
import { parseTransactionsCsv, downloadCsv, sampleCsv } from "@/lib/csv";
import type { AnalysisResult, Txn } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/b/$id/update")({
  head: () => ({
    meta: [
      { title: "Update Financial Data — CreditBridge" },
      {
        name: "description",
        content:
          "Add newer transactions, re-run the checks and see exactly how the signal changed and why.",
      },
      { property: "og:title", content: "Update Financial Data — CreditBridge" },
      {
        property: "og:description",
        content:
          "Add newer transactions, re-run the checks and see exactly how the signal changed and why.",
      },
    ],
  }),
  component: UpdateData,
});

function UpdateData() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const txns = useTransactions(id);
  const { result } = useAnalysisResult(id);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<{ inserted: number; duplicates: number } | null>(null);
  const [change, setChange] = useState<{
    before: AnalysisResult;
    after: AnalysisResult;
  } | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "income",
    amount: "",
    payment_method: "UPI",
    category: "Daily sales",
    description: "",
  });

  async function save(rows: Txn[]) {
    setBusy(true);
    try {
      const outcome = await insertTransactions(id, rows);
      setPending(outcome);
      await queryClient.invalidateQueries({ queryKey: ["transactions", id] });
      toast.success(
        `${outcome.inserted} saved · ${outcome.duplicates} duplicate${outcome.duplicates === 1 ? "" : "s"} skipped`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the new data.");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = parseTransactionsCsv(await file.text());
    setErrors(parsed.errors.slice(0, 6));
    if (parsed.rows.length) await save(parsed.rows);
    e.target.value = "";
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    await save([
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
    ]);
    setForm({ ...form, amount: "", description: "" });
  }

  async function recalculate() {
    if (!result) {
      toast.error("Run the first analysis from the Add Financial Data page.");
      return;
    }
    setBusy(true);
    try {
      const before = result;
      const after = await runAnalysis(id);
      await queryClient.invalidateQueries();
      setChange({ before, after });
      setPending(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not recalculate.");
    } finally {
      setBusy(false);
    }
  }

  const delta = change ? change.after.score.value - change.before.score.value : null;

  return (
    <div className="space-y-6">
      <PageHead
        title="Update Financial Data"
        sub="New data is validated, de-duplicated and merged into the same profile. The integrity and consistency checks re-run and the signal is recalculated — there is no separate dashboard."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow>Upload newer transactions</Eyebrow>
            <button
              className="text-[12.5px] font-semibold text-brand-deep"
              onClick={() => downloadCsv("creditbridge-sample.csv", sampleCsv())}
            >
              Sample CSV
            </button>
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-ink/20 px-4 py-8 text-[13.5px] text-ink-soft transition hover:border-brand hover:text-brand-deep">
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            Click to choose a CSV file
          </label>
          {errors.length ? (
            <ul className="mt-3 space-y-1 rounded-2xl bg-amber/10 p-4 text-[12.5px] text-amber">
              {errors.map((e) => (
                <li key={e}>⚠ {e}</li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <Panel>
          <Eyebrow>Or add a single transaction</Eyebrow>
          <form onSubmit={addManual} className="mt-3 grid gap-3 sm:grid-cols-2">
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
            <div className="sm:col-span-2">
              <Btn type="submit" disabled={busy} variant="soft">
                Add Transaction
              </Btn>
            </div>
          </form>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>Recalculate</Eyebrow>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              {txns.data?.length ?? 0} transactions stored
              {pending
                ? ` · ${pending.inserted} new, ${pending.duplicates} duplicate${pending.duplicates === 1 ? "" : "s"} skipped`
                : ""}
            </p>
          </div>
          <Btn variant="dark" onClick={recalculate} disabled={busy}>
            {busy ? "Recalculating…" : "Recalculate signal"}
          </Btn>
        </div>
      </Panel>

      {change ? (
        <Panel className="cb-enter">
          <Eyebrow>What changed</Eyebrow>
          <div className="mt-4 flex flex-wrap items-end gap-8">
            <div>
              <Eyebrow>Previous signal</Eyebrow>
              <p className="mt-1 font-display text-4xl font-bold text-ink-soft">
                {change.before.score.value}
              </p>
            </div>
            <p className="pb-3 font-display text-2xl text-ink-soft">→</p>
            <div>
              <Eyebrow>Updated signal</Eyebrow>
              <p className="mt-1 font-display text-4xl font-bold text-brand-deep">
                {change.after.score.value}
              </p>
            </div>
            <div className="pb-1">
              <StatusPill status={(delta ?? 0) >= 0 ? "good" : "risk"}>
                {(delta ?? 0) >= 0 ? "+" : ""}
                {delta} points
              </StatusPill>
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-[13.5px]">
            {reasons(change.before, change.after).map((r) => (
              <li key={r} className="rounded-2xl bg-paper px-4 py-2.5">
                {r}
              </li>
            ))}
          </ul>

          <Link to="/b/$id/overview" params={{ id }} className="mt-5 inline-block">
            <Btn>Back to dashboard</Btn>
          </Link>
        </Panel>
      ) : null}
    </div>
  );
}

function reasons(before: AnalysisResult, after: AnalysisResult) {
  const out: string[] = [];
  const added = after.processing.valid - before.processing.valid;
  if (added > 0) out.push(`${added} additional valid transaction${added === 1 ? "" : "s"} were included in the analysis.`);
  const rev = after.revenue.consistency - before.revenue.consistency;
  if (Math.abs(rev) >= 2)
    out.push(
      `Revenue consistency ${rev > 0 ? "improved" : "fell"} by ${Math.abs(rev)} points, which ${rev > 0 ? "lifts" : "lowers"} the signal.`,
    );
  const cf = after.cashflow.stability - before.cashflow.stability;
  if (Math.abs(cf) >= 2)
    out.push(
      `Cash-flow stability ${cf > 0 ? "improved" : "weakened"} by ${Math.abs(cf)} points.`,
    );
  if (after.integrity.level !== before.integrity.level)
    out.push(
      `Data integrity moved from ${before.integrity.level} to ${after.integrity.level} after re-running the checks.`,
    );
  if (after.storyConsistency.status !== before.storyConsistency.status)
    out.push(`Financial story consistency changed: ${after.storyConsistency.message}`);
  if (after.crossSignal.status !== before.crossSignal.status)
    out.push(`Cross-signal consistency changed: ${after.crossSignal.message}`);
  if (!out.length)
    out.push("The new data did not materially change any of the underlying factors.");
  return out;
}
