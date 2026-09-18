export type TxnType = "income" | "expense";

export interface Txn {
  id?: string;
  transaction_id: string;
  txn_date: string | null; // YYYY-MM-DD
  raw_date?: string | null;
  type: TxnType | string;
  amount: number;
  payment_method: string | null;
  category: string | null;
  description: string | null;
}

export interface BusinessProfile {
  id: string;
  name: string;
  business_type: string;
  age_years: number;
  declared_monthly_revenue: number | null;
  coverage_months: number;
  consent_granted: boolean;
  demo_key: string | null;
  last_analyzed_at: string | null;
  created_at: string;
}

export type StatusLevel = "good" | "warn" | "risk";

export interface CheckItem {
  label: string;
  status: StatusLevel;
  detail: string;
}

export interface MonthPoint {
  month: string; // YYYY-MM
  value: number;
}

export interface Driver {
  label: string;
  points: number;
  detail: string;
}

export interface AnalysisResult {
  generatedAt: string;
  processing: {
    total: number;
    valid: number;
    invalid: number;
    start: string | null;
    end: string | null;
    months: string[];
    totalInflow: number;
    totalOutflow: number;
  };
  revenue: {
    total: number;
    avgMonthly: number;
    monthly: MonthPoint[];
    highest: MonthPoint | null;
    lowest: MonthPoint | null;
    consistency: number;
    growthPct: number;
    activeMonths: number;
  };
  expense: {
    total: number;
    avgMonthly: number;
    monthly: MonthPoint[];
    ratio: number;
    growthPct: number;
    spikes: MonthPoint[];
    volatility: number;
  };
  cashflow: {
    inflow: number;
    outflow: number;
    net: number;
    monthly: MonthPoint[];
    positiveMonths: number;
    negativeMonths: number;
    stability: number;
    growthPct: number;
  };
  behaviour: {
    count: number;
    avgAmount: number;
    perMonth: MonthPoint[];
    frequencyPerMonth: number;
    maxGapDays: number;
    gapCount: number;
    txnGrowthPct: number;
    inflowCount: number;
    outflowCount: number;
  };
  integrity: {
    level: "High" | "Medium" | "Low";
    score: number;
    checks: CheckItem[];
    flaggedIds: string[];
  };
  seasonality: {
    detected: boolean;
    highMonths: string[];
    lowMonths: string[];
    index: { name: string; value: number }[];
    note: string;
  };
  paymentMix: { method: string; pct: number; amount: number }[];
  paymentRegularity: number;
  storyConsistency: {
    status: StatusLevel;
    declared: number | null;
    observed: number;
    deviationPct: number | null;
    message: string;
  };
  crossSignal: {
    status: StatusLevel;
    revenueGrowth: number;
    txnGrowth: number;
    cashflowGrowth: number;
    message: string;
  };
  risks: { label: string; severity: StatusLevel; detail: string }[];
  score: {
    value: number;
    band: string;
    positives: Driver[];
    negatives: Driver[];
    summary: string;
  };
  story: {
    text: string;
    evidence: { label: string; value: string; note: string }[];
  };
}
