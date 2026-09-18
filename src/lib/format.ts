export function inr(value: number, compact = false) {
  const n = Math.round(value);
  if (compact) {
    if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

export function pct(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value)}%`;
}

export function shortDate(d: string | null) {
  if (!d) return "—";
  const date = new Date(d + (d.length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function monthShort(key: string) {
  const [y, m] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(m) - 1] ?? m} ${y.slice(2)}`;
}
