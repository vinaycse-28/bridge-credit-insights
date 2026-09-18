import type { Txn } from "./types";

export const CSV_HEADERS = [
  "transaction_id",
  "date",
  "type",
  "amount",
  "payment_method",
  "category",
  "description",
];

function splitLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const d = dmy[1] ?? "";
    const m = dmy[2] ?? "";
    const y = dmy[3] ?? "";
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function normalizeType(raw: string) {
  const s = raw.trim().toLowerCase();
  if (["income", "credit", "inflow", "in", "revenue", "sale"].includes(s)) return "income";
  if (["expense", "debit", "outflow", "out", "purchase", "cost"].includes(s)) return "expense";
  return s;
}

export interface ParsedCsv {
  rows: Txn[];
  errors: string[];
}

export function parseTransactionsCsv(text: string): ParsedCsv {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { rows: [], errors: ["The file is empty."] };

  const header = splitLine(lines[0] ?? "").map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const idx = (name: string) => header.indexOf(name);
  if (idx("amount") === -1 || idx("date") === -1) {
    return {
      rows: [],
      errors: ["The file must include at least 'date' and 'amount' columns."],
    };
  }

  const rows: Txn[] = [];
  lines.slice(1).forEach((line, i) => {
    const cells = splitLine(line);
    const get = (name: string) => {
      const j = idx(name);
      return j === -1 ? "" : (cells[j] ?? "");
    };
    const rawDate = get("date");
    const amount = Number(get("amount").replace(/[₹,\s]/g, ""));
    const row: Txn = {
      transaction_id: get("transaction_id") || `CSV-${Date.now()}-${i + 1}`,
      txn_date: normalizeDate(rawDate),
      raw_date: rawDate,
      type: normalizeType(get("type") || (amount >= 0 ? "income" : "expense")),
      amount: Math.abs(amount),
      payment_method: get("payment_method") || "Other",
      category: get("category") || "Uncategorised",
      description: get("description") || "",
    };
    if (!row.txn_date) errors.push(`Row ${i + 2}: unreadable date "${rawDate}".`);
    if (!Number.isFinite(amount)) errors.push(`Row ${i + 2}: unreadable amount.`);
    rows.push(row);
  });

  return { rows, errors };
}

export function sampleCsv() {
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, "0");
  return [
    CSV_HEADERS.join(","),
    `TXN-0001,${y}-${m}-02,income,4820,UPI,Sales,Lunch service`,
    `TXN-0002,${y}-${m}-03,expense,1640,Bank Transfer,Supplies,Vegetables and grains`,
    `TXN-0003,${y}-${m}-05,income,5310,Cash,Sales,Evening service`,
    `TXN-0004,${y}-${m}-07,expense,2200,Bank Transfer,Wages,Weekly settlement`,
    `TXN-0005,${y}-${m}-09,income,6120,UPI,Sales,Weekend catering`,
  ].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
