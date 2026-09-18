import type { AnalysisResult, CheckItem, Driver, MonthPoint, StatusLevel, Txn } from "./types";

/**
 * SCORING CONFIGURATION — easy to tune.
 * Positive components sum to 100 at best; penalties are subtracted.
 */
export const SCORE_WEIGHTS = {
  revenueConsistency: 22,
  cashflowStability: 18,
  paymentRegularity: 15,
  revenueGrowth: 12,
  transactionActivity: 10,
  expenseBehaviour: 13,
  dataIntegrity: 10,
};

export const SCORE_PENALTIES = {
  expenseVolatility: 8,
  negativeCashflow: 10,
  storyInconsistency: 8,
  crossSignalInconsistency: 6,
  dataAnomaly: 6,
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const mean = (arr: number[]) => (arr.length ? sum(arr) / arr.length : 0);

function stddev(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((v) => (v - m) ** 2)));
}

/** 100 = perfectly steady, 0 = wildly variable. */
function consistencyScore(values: number[]) {
  const m = mean(values);
  if (!m || values.length < 2) return values.length ? 60 : 0;
  const cv = stddev(values) / Math.abs(m);
  return clamp(Math.round((1 - cv) * 100));
}

function halfGrowth(values: number[]) {
  if (values.length < 2) return 0;
  const mid = Math.floor(values.length / 2);
  const first = mean(values.slice(0, mid));
  const second = mean(values.slice(mid));
  if (!first) return second > 0 ? 100 : 0;
  return Math.round(((second - first) / first) * 100);
}

const monthKey = (d: string) => d.slice(0, 7);

function monthRange(start: string, end: string) {
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (out.length > 600) break;
  }
  return out;
}

function isValidDate(s: string | null | undefined) {
  if (!s) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime());
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1]?.slice(0, 3) ?? m} ${y.slice(2)}`;
}

export interface AnalysisInput {
  transactions: Txn[];
  declaredMonthlyRevenue: number | null;
  coverageMonths: number;
}

export function analyze({
  transactions,
  declaredMonthlyRevenue,
  coverageMonths,
}: AnalysisInput): AnalysisResult {
  // ---------- STEP 1: transaction data processing ----------
  const invalidRecords = transactions.filter(
    (t) =>
      !isValidDate(t.txn_date) ||
      !Number.isFinite(Number(t.amount)) ||
      Number(t.amount) <= 0 ||
      (t.type !== "income" && t.type !== "expense"),
  );
  const valid = transactions.filter((t) => !invalidRecords.includes(t));
  const sorted = [...valid].sort((a, b) => (a.txn_date! < b.txn_date! ? -1 : 1));

  const start = sorted.length ? sorted[0].txn_date! : null;
  const end = sorted.length ? sorted[sorted.length - 1].txn_date! : null;
  const months = start && end ? monthRange(monthKey(start), monthKey(end)) : [];

  const income = sorted.filter((t) => t.type === "income");
  const expenses = sorted.filter((t) => t.type === "expense");
  const totalInflow = sum(income.map((t) => Number(t.amount)));
  const totalOutflow = sum(expenses.map((t) => Number(t.amount)));

  const bucket = (list: Txn[]): MonthPoint[] =>
    months.map((m) => ({
      month: m,
      value: sum(list.filter((t) => monthKey(t.txn_date!) === m).map((t) => Number(t.amount))),
    }));

  // ---------- STEP 2: revenue ----------
  const revMonthly = bucket(income);
  const revValues = revMonthly.map((p) => p.value);
  const activeMonths = revMonthly.filter((p) => p.value > 0).length;
  const sortedRev = [...revMonthly].sort((a, b) => b.value - a.value);
  const revenue = {
    total: totalInflow,
    avgMonthly: months.length ? totalInflow / months.length : 0,
    monthly: revMonthly,
    highest: sortedRev[0] ?? null,
    lowest: sortedRev[sortedRev.length - 1] ?? null,
    consistency: consistencyScore(revValues),
    growthPct: halfGrowth(revValues),
    activeMonths,
  };

  // ---------- STEP 3: expenses ----------
  const expMonthly = bucket(expenses);
  const expValues = expMonthly.map((p) => p.value);
  const expAvg = mean(expValues);
  const spikes = expMonthly.filter((p) => expAvg > 0 && p.value > expAvg * 1.6);
  const expense = {
    total: totalOutflow,
    avgMonthly: expAvg,
    monthly: expMonthly,
    ratio: totalInflow ? Math.round((totalOutflow / totalInflow) * 100) : 0,
    growthPct: halfGrowth(expValues),
    spikes,
    volatility: 100 - consistencyScore(expValues),
  };

  // ---------- STEP 4: cash flow ----------
  const cfMonthly: MonthPoint[] = months.map((m, i) => ({
    month: m,
    value: revMonthly[i].value - expMonthly[i].value,
  }));
  const cfValues = cfMonthly.map((p) => p.value);
  const cashflow = {
    inflow: totalInflow,
    outflow: totalOutflow,
    net: totalInflow - totalOutflow,
    monthly: cfMonthly,
    positiveMonths: cfMonthly.filter((p) => p.value > 0).length,
    negativeMonths: cfMonthly.filter((p) => p.value < 0).length,
    stability: consistencyScore(cfValues.map((v) => Math.max(v, 0))),
    growthPct: halfGrowth(cfValues),
  };

  // ---------- STEP 5: transaction behaviour ----------
  const perMonth: MonthPoint[] = months.map((m) => ({
    month: m,
    value: sorted.filter((t) => monthKey(t.txn_date!) === m).length,
  }));
  let maxGapDays = 0;
  let gapCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i].txn_date!).getTime() - new Date(sorted[i - 1].txn_date!).getTime()) /
      86400000;
    if (diff > maxGapDays) maxGapDays = Math.round(diff);
    if (diff > 21) gapCount += 1;
  }
  const behaviour = {
    count: sorted.length,
    avgAmount: sorted.length ? (totalInflow + totalOutflow) / sorted.length : 0,
    perMonth,
    frequencyPerMonth: months.length ? Math.round(sorted.length / months.length) : 0,
    maxGapDays,
    gapCount,
    txnGrowthPct: halfGrowth(perMonth.map((p) => p.value)),
    inflowCount: income.length,
    outflowCount: expenses.length,
  };

  // ---------- STEP 6: data integrity / plausibility ----------
  const checks: CheckItem[] = [];
  const flagged = new Set<string>();

  const idCounts = new Map<string, number>();
  transactions.forEach((t) => idCounts.set(t.transaction_id, (idCounts.get(t.transaction_id) ?? 0) + 1));
  const dupIds = [...idCounts.entries()].filter(([, c]) => c > 1).map(([id]) => id);
  dupIds.forEach((id) => flagged.add(id));
  checks.push(
    dupIds.length
      ? {
          label: "Duplicate transaction IDs",
          status: "risk",
          detail: `${dupIds.length} transaction ID(s) appear more than once.`,
        }
      : { label: "No duplicate IDs", status: "good", detail: "Every transaction ID is unique." },
  );

  const fingerprint = new Map<string, Txn[]>();
  sorted.forEach((t) => {
    const key = `${t.txn_date}|${t.type}|${t.amount}|${t.payment_method ?? ""}|${t.category ?? ""}`;
    fingerprint.set(key, [...(fingerprint.get(key) ?? []), t]);
  });
  const dupRows = [...fingerprint.values()].filter((g) => g.length > 1);
  dupRows.flat().forEach((t) => flagged.add(t.transaction_id));
  checks.push(
    dupRows.length
      ? {
          label: "Repeated identical transactions",
          status: "warn",
          detail: `${dupRows.length} group(s) of identical same-day records. Potential data anomaly.`,
        }
      : {
          label: "No identical repeated records",
          status: "good",
          detail: "No same-day duplicate rows detected.",
        },
  );

  checks.push(
    invalidRecords.length
      ? {
          label: "Invalid or missing values",
          status: "warn",
          detail: `${invalidRecords.length} record(s) had an invalid date, amount or type and were excluded.`,
        }
      : { label: "Valid dates and values", status: "good", detail: "All records parsed cleanly." },
  );

  const emptyMonths = months.length - perMonth.filter((p) => p.value > 0).length;
  checks.push(
    emptyMonths > Math.max(1, months.length * 0.15)
      ? {
          label: "Timeline continuity",
          status: "warn",
          detail: `${emptyMonths} month(s) in the observed period contain no activity.`,
        }
      : {
          label: "Consistent timeline",
          status: "good",
          detail: "Activity is spread across the observed period.",
        },
  );

  const outside =
    months.length > coverageMonths
      ? months.length - coverageMonths
      : 0;
  checks.push(
    outside > 0
      ? {
          label: "Declared data period",
          status: "warn",
          detail: `Transactions span ${months.length} months versus a declared ${coverageMonths}-month period.`,
        }
      : {
          label: "Within declared period",
          status: "good",
          detail: `Transactions span ${months.length} of ${coverageMonths} declared months.`,
        },
  );

  const roundAmounts = sorted.filter((t) => Number(t.amount) % 1000 === 0);
  const roundPct = sorted.length ? Math.round((roundAmounts.length / sorted.length) * 100) : 0;
  if (roundPct > 45) roundAmounts.forEach((t) => flagged.add(t.transaction_id));
  checks.push(
    roundPct > 45
      ? {
          label: "Unusual repeated round amounts",
          status: "warn",
          detail: `${roundPct}% of amounts are exact round figures. Potential data anomaly.`,
        }
      : {
          label: "Natural amount distribution",
          status: "good",
          detail: `${roundPct}% of amounts are round figures — within a normal range.`,
        },
  );

  const uniqAmounts = new Set(sorted.map((t) => Number(t.amount))).size;
  const tooPerfect = sorted.length > 20 && uniqAmounts / sorted.length < 0.25;
  checks.push(
    tooPerfect
      ? {
          label: "Suspiciously uniform patterns",
          status: "warn",
          detail: "Amounts repeat far more than typical trading activity would suggest.",
        }
      : {
          label: "Plausible variation",
          status: "good",
          detail: "Transaction amounts vary in a realistic way.",
        },
  );

  const integrityIssues = checks.filter((c) => c.status !== "good");
  const hardIssues = checks.filter((c) => c.status === "risk").length;
  const integrityScore = clamp(100 - integrityIssues.length * 12 - hardIssues * 15);
  const integrity = {
    level: (integrityScore >= 80 ? "High" : integrityScore >= 55 ? "Medium" : "Low") as
      | "High"
      | "Medium"
      | "Low",
    score: integrityScore,
    checks,
    flaggedIds: [...flagged],
  };

  // ---------- STEP 7: seasonality ----------
  const byCalendarMonth = MONTH_NAMES.map((name, idx) => {
    const vals = revMonthly
      .filter((p) => Number(p.month.split("-")[1]) === idx + 1)
      .map((p) => p.value);
    return { name: name.slice(0, 3), value: Math.round(mean(vals)) };
  }).filter((p) => p.value > 0);
  const seasonAvg = mean(byCalendarMonth.map((p) => p.value));
  const highMonths = byCalendarMonth.filter((p) => p.value > seasonAvg * 1.25).map((p) => p.name);
  const lowMonths = byCalendarMonth.filter((p) => p.value < seasonAvg * 0.75).map((p) => p.name);
  const seasonality = {
    detected: highMonths.length > 0 && lowMonths.length > 0,
    highMonths,
    lowMonths,
    index: byCalendarMonth,
    note:
      highMonths.length && lowMonths.length
        ? `Revenue tends to increase during ${highMonths.join(", ")} and soften during ${lowMonths.join(", ")}.`
        : "No strong recurring seasonal pattern detected in the observed period.",
  };

  // ---------- STEP 8: payment mix ----------
  const methodTotals = new Map<string, number>();
  sorted.forEach((t) => {
    const key = (t.payment_method || "other").toLowerCase();
    const label =
      key.includes("upi")
        ? "UPI"
        : key.includes("bank")
          ? "Bank transfer"
          : key.includes("cash")
            ? "Cash"
            : "Other";
    methodTotals.set(label, (methodTotals.get(label) ?? 0) + Number(t.amount));
  });
  const methodSum = sum([...methodTotals.values()]) || 1;
  const paymentMix = ["UPI", "Bank transfer", "Cash", "Other"]
    .map((m) => ({
      method: m,
      amount: methodTotals.get(m) ?? 0,
      pct: Math.round(((methodTotals.get(m) ?? 0) / methodSum) * 100),
    }))
    .filter((m) => m.amount > 0);

  const paymentRegularity = months.length
    ? Math.round((perMonth.filter((p) => p.value >= Math.max(2, behaviour.frequencyPerMonth * 0.4)).length / months.length) * 100)
    : 0;

  // ---------- STEP 9: financial story consistency ----------
  const observed = revenue.avgMonthly;
  let storyStatus: StatusLevel = "good";
  let storyMessage =
    "No declared revenue was supplied, so only observed transaction activity was assessed.";
  let deviationPct: number | null = null;
  if (declaredMonthlyRevenue && declaredMonthlyRevenue > 0) {
    deviationPct = Math.round(((observed - declaredMonthlyRevenue) / declaredMonthlyRevenue) * 100);
    const abs = Math.abs(deviationPct);
    if (abs <= 25) {
      storyStatus = "good";
      storyMessage =
        "The declared revenue is broadly consistent with observed transaction activity.";
    } else if (abs <= 50) {
      storyStatus = "warn";
      storyMessage =
        "The declared revenue differs moderately from observed transaction inflow. Worth confirming with the borrower.";
    } else {
      storyStatus = "risk";
      storyMessage =
        "The declared revenue differs significantly from the observed transaction inflow. This is an internal consistency check, not proof of misreporting.";
    }
  } else {
    storyStatus = "warn";
  }
  const storyConsistency = {
    status: storyStatus,
    declared: declaredMonthlyRevenue,
    observed,
    deviationPct,
    message: storyMessage,
  };

  // ---------- STEP 10: cross-signal consistency ----------
  const rg = revenue.growthPct;
  const tg = behaviour.txnGrowthPct;
  const cg = cashflow.growthPct;
  const spread = Math.max(Math.abs(rg - tg), Math.abs(rg - cg));
  let crossStatus: StatusLevel = "good";
  let crossMessage = "Revenue, transaction activity and cash flow are moving broadly together.";
  if (spread > 40) {
    crossStatus = "risk";
    crossMessage =
      "Revenue growth differs sharply from the change observed in transaction activity and cash flow.";
  } else if (spread > 20) {
    crossStatus = "warn";
    crossMessage =
      "Revenue growth is somewhat out of step with transaction activity and cash-flow movement.";
  }
  const crossSignal = {
    status: crossStatus,
    revenueGrowth: rg,
    txnGrowth: tg,
    cashflowGrowth: cg,
    message: crossMessage,
  };

  // ---------- STEP 11: risk indicators ----------
  const risks: AnalysisResult["risks"] = [];
  if (revenue.consistency < 55)
    risks.push({
      label: "Revenue volatility",
      severity: "warn",
      detail: `Monthly revenue consistency scores ${revenue.consistency}/100.`,
    });
  if (spikes.length)
    risks.push({
      label: "Expense spike",
      severity: "warn",
      detail: `${spikes.length} month(s) with expenses well above the period average.`,
    });
  if (maxGapDays > 30)
    risks.push({
      label: "Long transaction gap",
      severity: "warn",
      detail: `Longest gap between transactions is ${maxGapDays} days.`,
    });
  if (cashflow.negativeMonths > months.length * 0.25)
    risks.push({
      label: "Negative cash-flow periods",
      severity: "risk",
      detail: `${cashflow.negativeMonths} of ${months.length} months closed negative.`,
    });
  if (revenue.growthPct < -5)
    risks.push({
      label: "Declining revenue",
      severity: "risk",
      detail: `Revenue fell ${Math.abs(revenue.growthPct)}% across the period.`,
    });
  if (expense.ratio > 85)
    risks.push({
      label: "High expense ratio",
      severity: "warn",
      detail: `Expenses consume ${expense.ratio}% of revenue.`,
    });
  if (integrity.level !== "High")
    risks.push({
      label: "Potential data anomaly",
      severity: integrity.level === "Low" ? "risk" : "warn",
      detail: "Data integrity checks raised one or more flags for manual review.",
    });
  if (storyStatus !== "good")
    risks.push({
      label: "Financial story inconsistency",
      severity: storyStatus,
      detail: storyMessage,
    });
  if (crossStatus !== "good")
    risks.push({ label: "Cross-signal inconsistency", severity: crossStatus, detail: crossMessage });
  if (paymentMix.find((m) => m.method === "Cash" && m.pct > 60))
    risks.push({
      label: "Unusual transaction concentration",
      severity: "warn",
      detail: "Most value moves through cash, which is harder to corroborate.",
    });

  // ---------- STEP 12: creditworthiness signal ----------
  const positives: Driver[] = [];
  const negatives: Driver[] = [];

  const pt = (weight: number, ratio01: number) => Math.round(weight * clamp(ratio01, 0, 1));

  const pRevCons = pt(SCORE_WEIGHTS.revenueConsistency, revenue.consistency / 100);
  positives.push({
    label: "Revenue consistency",
    points: pRevCons,
    detail: `Monthly revenue steadiness scores ${revenue.consistency}/100.`,
  });

  const pCfStab = pt(
    SCORE_WEIGHTS.cashflowStability,
    (cashflow.stability / 100) * (months.length ? cashflow.positiveMonths / months.length : 0) + 0.15,
  );
  positives.push({
    label: "Cash-flow stability",
    points: pCfStab,
    detail: `${cashflow.positiveMonths} of ${months.length} months closed with positive net cash flow.`,
  });

  const pPayReg = pt(SCORE_WEIGHTS.paymentRegularity, paymentRegularity / 100);
  positives.push({
    label: "Payment regularity",
    points: pPayReg,
    detail: `Regular payment activity in ${paymentRegularity}% of observed months.`,
  });

  const pGrowth = pt(SCORE_WEIGHTS.revenueGrowth, (revenue.growthPct + 10) / 40);
  positives.push({
    label: "Revenue growth",
    points: pGrowth,
    detail: `Revenue moved ${revenue.growthPct >= 0 ? "+" : ""}${revenue.growthPct}% across the period.`,
  });

  const pActivity = pt(
    SCORE_WEIGHTS.transactionActivity,
    behaviour.frequencyPerMonth / 25 + (months.length >= 12 ? 0.25 : 0),
  );
  positives.push({
    label: "Transaction activity",
    points: pActivity,
    detail: `About ${behaviour.frequencyPerMonth} transactions per month across ${months.length} months.`,
  });

  const pExpense = pt(SCORE_WEIGHTS.expenseBehaviour, (95 - expense.ratio) / 55);
  positives.push({
    label: "Expense behaviour",
    points: pExpense,
    detail: `Expenses run at ${expense.ratio}% of revenue.`,
  });

  const pIntegrity = pt(SCORE_WEIGHTS.dataIntegrity, integrity.score / 100);
  positives.push({
    label: "Data integrity",
    points: pIntegrity,
    detail: `Integrity checks rated ${integrity.level} (${integrity.score}/100).`,
  });

  const nExpVol = -Math.round(SCORE_PENALTIES.expenseVolatility * clamp(expense.volatility / 100, 0, 1));
  if (nExpVol < 0)
    negatives.push({
      label: "Expense volatility",
      points: nExpVol,
      detail: `Month-to-month expenses vary considerably (volatility ${Math.round(expense.volatility)}/100).`,
    });

  const nNegCf = -Math.round(
    SCORE_PENALTIES.negativeCashflow * (months.length ? cashflow.negativeMonths / months.length : 0),
  );
  if (nNegCf < 0)
    negatives.push({
      label: "Negative cash-flow months",
      points: nNegCf,
      detail: `${cashflow.negativeMonths} month(s) closed with a net outflow.`,
    });

  if (storyStatus !== "good")
    negatives.push({
      label: "Financial story inconsistency",
      points: -(storyStatus === "risk" ? SCORE_PENALTIES.storyInconsistency : 3),
      detail: storyMessage,
    });

  if (crossStatus !== "good")
    negatives.push({
      label: "Cross-signal inconsistency",
      points: -(crossStatus === "risk" ? SCORE_PENALTIES.crossSignalInconsistency : 3),
      detail: crossMessage,
    });

  if (integrity.level !== "High")
    negatives.push({
      label: "Potential data anomaly",
      points: -(integrity.level === "Low" ? SCORE_PENALTIES.dataAnomaly : 3),
      detail: "Integrity checks flagged patterns that merit manual review.",
    });

  const rawScore = sum(positives.map((p) => p.points)) + sum(negatives.map((n) => n.points));
  const value = clamp(Math.round(rawScore));
  const band =
    value >= 75 ? "Strong" : value >= 60 ? "Moderate" : value >= 45 ? "Cautious" : "Weak";

  const topPositives = [...positives].sort((a, b) => b.points - a.points).slice(0, 3);
  const scoreSummary = `The strongest positive contributors were ${topPositives
    .map((p) => p.label.toLowerCase())
    .join(", ")}.${
    negatives.length
      ? ` ${negatives[0].label} reduced the overall signal.`
      : " No material negative drivers were detected."
  }`;

  // ---------- STEP 14: business story ----------
  const trendWord =
    revenue.growthPct > 8 ? "grown" : revenue.growthPct < -8 ? "declined" : "held broadly steady";
  const cfWord =
    cashflow.positiveMonths >= months.length * 0.75
      ? "cash flow remains positive in most months"
      : cashflow.positiveMonths >= months.length * 0.5
        ? "cash flow is positive in just over half of the observed months"
        : "cash flow turns negative in a significant share of months";
  const storyText = `${
    seasonality.detected
      ? "Activity follows a clear seasonal rhythm"
      : "Business activity is broadly regular"
  } over ${months.length} observed months. Revenue has ${trendWord} (${
    revenue.growthPct >= 0 ? "+" : ""
  }${revenue.growthPct}%) and ${cfWord}. Payment activity is recorded in ${paymentRegularity}% of months${
    expense.ratio > 75 ? ", although the expense ratio is high and requires attention" : ""
  }${integrity.level !== "High" ? ". Data integrity checks raised items for manual review" : ""}.`;

  const story = {
    text: storyText,
    evidence: [
      {
        label: "Revenue trend",
        value: `${revenue.growthPct >= 0 ? "↗ +" : "↘ "}${revenue.growthPct}%`,
        note: "Second half versus first half of the observed period.",
      },
      {
        label: "Cash-flow stability",
        value: `${cashflow.positiveMonths}/${months.length}`,
        note: "Months closing with positive net cash flow.",
      },
      {
        label: "Payment regularity",
        value: `${paymentRegularity}%`,
        note: "Share of months with regular payment activity.",
      },
      {
        label: "Expense ratio",
        value: `${expense.ratio}%`,
        note: "Total expenses as a share of total revenue.",
      },
      {
        label: "Transaction activity",
        value: `${behaviour.count}`,
        note: `About ${behaviour.frequencyPerMonth} transactions per month.`,
      },
      {
        label: "Seasonality",
        value: seasonality.detected ? "Detected" : "Not detected",
        note: seasonality.note,
      },
    ],
  };

  return {
    generatedAt: new Date().toISOString(),
    processing: {
      total: transactions.length,
      valid: valid.length,
      invalid: invalidRecords.length,
      start,
      end,
      months,
      totalInflow,
      totalOutflow,
    },
    revenue,
    expense,
    cashflow,
    behaviour,
    integrity,
    seasonality,
    paymentMix,
    paymentRegularity,
    storyConsistency,
    crossSignal,
    risks,
    score: { value, band, positives, negatives, summary: scoreSummary },
    story,
  };
}
