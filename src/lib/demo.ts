import type { Txn } from "./types";

export interface DemoDataset {
  key: string;
  title: string;
  tagline: string;
  expectation: string;
  name: string;
  business_type: string;
  age_years: number;
  declared_monthly_revenue: number;
  coverage_months: number;
  build: () => Txn[];
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function monthsBack(count: number) {
  const now = new Date();
  const out: { y: number; m: number }[] = [];
  for (let i = count; i >= 1; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 });
  }
  return out;
}

const dateOf = (y: number, m: number, day: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(Math.min(day, 28)).padStart(2, "0")}`;

const INCOME_METHODS = ["UPI", "UPI", "UPI", "Cash", "Bank Transfer", "Card"];
const EXPENSE_METHODS = ["Bank Transfer", "Bank Transfer", "UPI", "Cash"];

interface GenOptions {
  seed: number;
  months: number;
  baseRevenue: number;
  growthPerMonth: number;
  noise: number;
  expenseRatio: number;
  seasonal?: Record<number, number>;
  incomePerMonth?: number;
  prefix: string;
  incomeCategories: string[];
  expenseCategories: string[];
  incomeNote: string;
}

function generate(opts: GenOptions): Txn[] {
  const rand = rng(opts.seed);
  const rows: Txn[] = [];
  let n = 0;
  monthsBack(opts.months).forEach(({ y, m }, mi) => {
    const seasonal = opts.seasonal?.[m] ?? 1;
    const monthRevenue =
      opts.baseRevenue * (1 + opts.growthPerMonth * mi) * seasonal * (1 + (rand() - 0.5) * opts.noise);
    const incomeCount = opts.incomePerMonth ?? 10;
    let allocated = 0;
    for (let i = 0; i < incomeCount; i++) {
      const share = (0.6 + rand() * 0.8) / incomeCount;
      const amount = Math.round(monthRevenue * share);
      allocated += amount;
      n += 1;
      rows.push({
        transaction_id: `${opts.prefix}-${String(n).padStart(5, "0")}`,
        txn_date: dateOf(y, m, 1 + Math.floor(rand() * 27)),
        type: "income",
        amount,
        payment_method: INCOME_METHODS[Math.floor(rand() * INCOME_METHODS.length)],
        category: opts.incomeCategories[Math.floor(rand() * opts.incomeCategories.length)],
        description: opts.incomeNote,
      });
    }
    const monthExpense = allocated * opts.expenseRatio * (1 + (rand() - 0.5) * 0.2);
    const expenseCount = 6;
    for (let i = 0; i < expenseCount; i++) {
      const share = (0.6 + rand() * 0.8) / expenseCount;
      n += 1;
      rows.push({
        transaction_id: `${opts.prefix}-${String(n).padStart(5, "0")}`,
        txn_date: dateOf(y, m, 1 + Math.floor(rand() * 27)),
        type: "expense",
        amount: Math.round(monthExpense * share),
        payment_method: EXPENSE_METHODS[Math.floor(rand() * EXPENSE_METHODS.length)],
        category: opts.expenseCategories[Math.floor(rand() * opts.expenseCategories.length)],
        description: "Operating outflow",
      });
    }
  });
  return rows.sort((a, b) => (a.txn_date! < b.txn_date! ? -1 : 1));
}

export const DEMO_DATASETS: DemoDataset[] = [
  {
    key: "stable",
    title: "Demo 1 — Stable growing business",
    tagline: "Consistent revenue, positive cash flow, gradual growth.",
    expectation: "Expected: strong signal with high data trust.",
    name: "Lakshmi Street Foods",
    business_type: "Food Services",
    age_years: 3,
    declared_monthly_revenue: 150000,
    coverage_months: 24,
    build: () =>
      generate({
        seed: 11,
        months: 24,
        baseRevenue: 128000,
        growthPerMonth: 0.012,
        noise: 0.12,
        expenseRatio: 0.58,
        incomePerMonth: 12,
        prefix: "LSF",
        incomeCategories: ["Sales", "Catering", "Delivery"],
        expenseCategories: ["Supplies", "Wages", "Rent", "Utilities"],
        incomeNote: "Daily service receipts",
      }),
  },
  {
    key: "seasonal",
    title: "Demo 2 — Seasonal business",
    tagline: "Strong festive peaks and predictable quiet months.",
    expectation: "Expected: seasonality detected, moderate signal.",
    name: "Ganesh Handloom Textiles",
    business_type: "Retail — Textiles",
    age_years: 6,
    declared_monthly_revenue: 220000,
    coverage_months: 24,
    build: () =>
      generate({
        seed: 27,
        months: 24,
        baseRevenue: 205000,
        growthPerMonth: 0.004,
        noise: 0.1,
        expenseRatio: 0.66,
        incomePerMonth: 10,
        seasonal: { 1: 0.7, 2: 0.65, 3: 0.8, 4: 0.9, 5: 1.55, 6: 0.85, 7: 0.8, 8: 1.1, 9: 1.2, 10: 1.7, 11: 1.6, 12: 0.9 },
        prefix: "GHT",
        incomeCategories: ["Counter Sales", "Wholesale", "Festive Orders"],
        expenseCategories: ["Stock Purchase", "Wages", "Rent", "Transport"],
        incomeNote: "Store sales settlement",
      }),
  },
  {
    key: "inconsistent",
    title: "Demo 3 — Inconsistent data business",
    tagline: "Duplicates, round-number patterns and a declared/observed gap.",
    expectation: "Expected: trust and consistency warnings.",
    name: "Sunrise Hardware Traders",
    business_type: "Hardware & Building Supplies",
    age_years: 2,
    declared_monthly_revenue: 500000,
    coverage_months: 18,
    build: () => {
      const base = generate({
        seed: 43,
        months: 18,
        baseRevenue: 115000,
        growthPerMonth: 0.03,
        noise: 0.55,
        expenseRatio: 0.82,
        incomePerMonth: 7,
        prefix: "SHT",
        incomeCategories: ["Counter Sales", "Contractor Orders"],
        expenseCategories: ["Stock Purchase", "Wages", "Transport"],
        incomeNote: "Sales entry",
      });
      // Round-number pattern
      const rounded = base.map((t, i) =>
        i % 2 === 0 ? { ...t, amount: Math.max(1000, Math.round(t.amount / 1000) * 1000) } : t,
      );
      // Duplicate IDs + identical repeated rows
      const dupes: Txn[] = [];
      for (let i = 0; i < 8; i++) {
        const src = rounded[i * 9 + 3];
        if (src) dupes.push({ ...src });
      }
      // A record with a broken date and one with a zero amount
      const broken: Txn[] = [
        {
          transaction_id: "SHT-BAD-1",
          txn_date: null,
          raw_date: "31/02/2024",
          type: "income",
          amount: 50000,
          payment_method: "Cash",
          category: "Counter Sales",
          description: "Unreadable date",
        },
        {
          transaction_id: "SHT-BAD-2",
          txn_date: rounded[5]?.txn_date ?? null,
          type: "income",
          amount: 0,
          payment_method: "Cash",
          category: "Counter Sales",
          description: "Missing amount",
        },
      ];
      return [...rounded, ...dupes, ...broken].sort((a, b) =>
        (a.txn_date ?? "9999") < (b.txn_date ?? "9999") ? -1 : 1,
      );
    },
  },
];
