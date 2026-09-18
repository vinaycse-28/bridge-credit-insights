import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHead, useAnalysisResult } from "@/components/gate";
import { Eyebrow, Panel, inputClass } from "@/components/kit";
import { useTransactions } from "@/lib/hooks";
import { inr, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/b/$id/transactions")({
  head: () => ({
    meta: [
      { title: "Transaction History — CreditBridge" },
      {
        name: "description",
        content: "Search, filter and sort every transaction behind this creditworthiness signal.",
      },
      { property: "og:title", content: "Transaction History — CreditBridge" },
      {
        property: "og:description",
        content: "Search, filter and sort every transaction behind this creditworthiness signal.",
      },
    ],
  }),
  component: History,
});

function History() {
  const { id } = Route.useParams();
  const txns = useTransactions(id);
  const { result } = useAnalysisResult(id);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [method, setMethod] = useState("all");
  const [sort, setSort] = useState("date-desc");

  const flagged = useMemo(
    () => new Set(result?.integrity.flaggedIds ?? []),
    [result],
  );

  const methods = useMemo(
    () => Array.from(new Set((txns.data ?? []).map((t) => t.payment_method || "Other"))),
    [txns.data],
  );

  const rows = useMemo(() => {
    let list = [...(txns.data ?? [])];
    const needle = q.trim().toLowerCase();
    if (needle)
      list = list.filter((t) =>
        [t.transaction_id, t.category, t.description, t.payment_method]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    if (type !== "all") list = list.filter((t) => t.type === type);
    if (method !== "all") list = list.filter((t) => (t.payment_method || "Other") === method);
    list.sort((a, b) => {
      if (sort === "amount-desc") return b.amount - a.amount;
      if (sort === "amount-asc") return a.amount - b.amount;
      const da = a.txn_date ?? "";
      const db = b.txn_date ?? "";
      return sort === "date-asc" ? da.localeCompare(db) : db.localeCompare(da);
    });
    return list;
  }, [txns.data, q, type, method, sort]);

  return (
    <div className="space-y-5">
      <PageHead
        title="Transaction History"
        sub="The complete record set behind the analysis. Rows flagged as potential data anomalies are highlighted."
      />

      <Panel>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className={inputClass}
            placeholder="Search description, category, ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={80}
          />
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            <option value="income">Income only</option>
            <option value="expense">Expenses only</option>
          </select>
          <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="all">All payment methods</option>
            {methods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select className={inputClass} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Largest amount</option>
            <option value="amount-asc">Smallest amount</option>
          </select>
        </div>

        <Eyebrow className="mt-4">
          {rows.length} of {txns.data?.length ?? 0} transactions
        </Eyebrow>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink/10 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                <th className="py-2.5 pr-3">Date</th>
                <th className="py-2.5 pr-3">ID</th>
                <th className="py-2.5 pr-3">Type</th>
                <th className="py-2.5 pr-3 text-right">Amount</th>
                <th className="py-2.5 pr-3">Method</th>
                <th className="py-2.5 pr-3">Category</th>
                <th className="py-2.5">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const anomaly = flagged.has(t.transaction_id);
                return (
                  <tr
                    key={t.id ?? t.transaction_id}
                    className={cn(
                      "border-b border-ink/6",
                      anomaly && "bg-amber/8",
                    )}
                  >
                    <td className="py-2.5 pr-3 font-mono text-[12px]">
                      {shortDate(t.txn_date)}
                      {anomaly ? <span className="ml-1.5 text-amber">⚠</span> : null}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11.5px] text-ink-soft">
                      {t.transaction_id}
                    </td>
                    <td className="py-2.5 pr-3">{t.type === "income" ? "Income" : "Expense"}</td>
                    <td
                      className={cn(
                        "py-2.5 pr-3 text-right font-mono font-bold",
                        t.type === "income" ? "text-brand-deep" : "text-coral",
                      )}
                    >
                      {t.type === "income" ? "+" : "−"}
                      {inr(t.amount)}
                    </td>
                    <td className="py-2.5 pr-3">{t.payment_method}</td>
                    <td className="py-2.5 pr-3">{t.category}</td>
                    <td className="max-w-[240px] truncate py-2.5 text-ink-soft">{t.description}</td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-ink-soft">
                    No transactions match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
