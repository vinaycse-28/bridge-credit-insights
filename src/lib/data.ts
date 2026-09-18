import { supabase } from "@/integrations/supabase/client";
import { analyze } from "./analysis";
import type { AnalysisResult, BusinessProfile, Txn } from "./types";

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listBusinesses(): Promise<BusinessProfile[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BusinessProfile[];
}

export async function getBusiness(id: string): Promise<BusinessProfile> {
  const { data, error } = await supabase.from("businesses").select("*").eq("id", id).single();
  if (error) throw error;
  return data as unknown as BusinessProfile;
}

export async function getTransactions(businessId: string): Promise<Txn[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId)
    .order("txn_date", { ascending: true })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as unknown as Txn[];
}

export async function getLatestAnalysis(
  businessId: string,
): Promise<{ score: number; result: AnalysisResult; created_at: string } | null> {
  const { data, error } = await supabase
    .from("analyses")
    .select("score, result, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(2);
  if (error) throw error;
  if (!data?.length) return null;
  return data[0] as unknown as { score: number; result: AnalysisResult; created_at: string };
}

export async function getAnalysisHistory(businessId: string) {
  const { data, error } = await supabase
    .from("analyses")
    .select("score, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function insertTransactions(businessId: string, rows: Txn[]) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in");
  const existing = await getTransactions(businessId);
  const seen = new Set(
    existing.map((t) => `${t.transaction_id}|${t.txn_date}|${t.amount}|${t.type}`),
  );
  const fresh: Txn[] = [];
  let duplicates = 0;
  rows.forEach((r) => {
    const key = `${r.transaction_id}|${r.txn_date}|${r.amount}|${r.type}`;
    if (seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);
    fresh.push(r);
  });

  const payload = fresh.map((r) => ({
    business_id: businessId,
    user_id: userId,
    transaction_id: r.transaction_id,
    txn_date: r.txn_date,
    raw_date: r.raw_date ?? r.txn_date,
    type: r.type,
    amount: r.amount,
    payment_method: r.payment_method,
    category: r.category,
    description: r.description,
  }));

  for (let i = 0; i < payload.length; i += 300) {
    const { error } = await supabase.from("transactions").insert(payload.slice(i, i + 300));
    if (error) throw error;
  }
  return { inserted: payload.length, duplicates };
}

export async function runAnalysis(businessId: string) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in");
  const [business, transactions] = await Promise.all([
    getBusiness(businessId),
    getTransactions(businessId),
  ]);
  const result = analyze({
    transactions,
    declaredMonthlyRevenue: business.declared_monthly_revenue,
    coverageMonths: business.coverage_months,
  });
  const { error } = await supabase.from("analyses").insert({
    business_id: businessId,
    user_id: userId,
    score: result.score.value,
    result: result as never,
  });
  if (error) throw error;
  await supabase
    .from("businesses")
    .update({ last_analyzed_at: new Date().toISOString() })
    .eq("id", businessId);
  return result;
}
