import { cn } from "@/lib/utils";
import type { MonthPoint } from "@/lib/types";
import { inr, monthShort } from "@/lib/format";

function labels(data: MonthPoint[]) {
  if (data.length <= 6) return data.map((d) => monthShort(d.month));
  const step = Math.ceil(data.length / 6);
  return data.map((d, i) => (i % step === 0 ? monthShort(d.month) : ""));
}

export function BarSeries({
  data,
  tone = "brand",
  money = true,
  height = "h-40",
}: {
  data: MonthPoint[];
  tone?: "brand" | "amber";
  money?: boolean;
  height?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const ticks = labels(data);
  if (!data.length) return <p className="text-[13px] text-ink-soft">No data yet.</p>;
  return (
    <div>
      <div className={cn("flex items-end gap-1.5", height)}>
        {data.map((d, i) => (
          <div
            key={d.month}
            title={`${monthShort(d.month)} · ${money ? inr(d.value) : d.value}`}
            className={cn(
              "cb-bar flex-1 rounded-md min-h-[2px]",
              tone === "brand" ? "bg-brand" : "bg-amber",
            )}
            style={{
              height: `${Math.max((d.value / max) * 100, 1.5)}%`,
              animationDelay: `${i * 0.025}s`,
              opacity: 0.45 + (d.value / max) * 0.55,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 font-mono text-[9px] text-ink-soft">
        {ticks.map((t, i) => (
          <span key={i} className="flex-1 text-center truncate">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NetFlowSeries({ data }: { data: MonthPoint[] }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const ticks = labels(data);
  if (!data.length) return <p className="text-[13px] text-ink-soft">No data yet.</p>;
  return (
    <div>
      <div className="flex items-stretch gap-1.5 h-40">
        {data.map((d, i) => (
          <div
            key={d.month}
            title={`${monthShort(d.month)} · ${inr(d.value)}`}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 flex items-end">
              <div
                className="cb-bar w-full rounded-t-md bg-brand"
                style={{
                  height: d.value > 0 ? `${(d.value / max) * 100}%` : "0%",
                  animationDelay: `${i * 0.025}s`,
                }}
              />
            </div>
            <div className="h-px bg-ink/15" />
            <div className="flex-1">
              <div
                className="w-full rounded-b-md bg-coral"
                style={{ height: d.value < 0 ? `${(Math.abs(d.value) / max) * 100}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 font-mono text-[9px] text-ink-soft">
        {ticks.map((t, i) => (
          <span key={i} className="flex-1 text-center truncate">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

const MIX_COLORS: Record<string, string> = {
  UPI: "var(--brand)",
  "Bank transfer": "var(--brand-deep)",
  Cash: "var(--amber)",
  Other: "var(--coral)",
};

export function Donut({ segments }: { segments: { method: string; pct: number }[] }) {
  let acc = 0;
  const stops = segments
    .map((s) => {
      const from = acc;
      acc += s.pct;
      return `${MIX_COLORS[s.method] ?? "var(--coral)"} ${from}% ${acc}%`;
    })
    .join(", ");
  return (
    <div className="flex items-center gap-5">
      <div
        className="size-28 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(${stops || "var(--muted) 0 100%"})`,
          WebkitMask: "radial-gradient(farthest-side, transparent 61%, #000 62%)",
          mask: "radial-gradient(farthest-side, transparent 61%, #000 62%)",
        }}
      />
      <ul className="space-y-2 text-[13px] flex-1">
        {segments.map((s) => (
          <li key={s.method} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ background: MIX_COLORS[s.method] ?? "var(--coral)" }}
            />
            {s.method}
            <span className="ml-auto font-mono font-bold">{s.pct}%</span>
          </li>
        ))}
        {!segments.length ? <li className="text-ink-soft">No payment data yet.</li> : null}
      </ul>
    </div>
  );
}

export function SeasonBars({ data }: { data: { name: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (!data.length) return <p className="text-[13px] text-ink-soft">Not enough data.</p>;
  return (
    <div>
      <div className="flex items-end gap-1.5 h-32">
        {data.map((d, i) => (
          <div
            key={d.name}
            title={`${d.name} · ${inr(d.value)}`}
            className={cn(
              "cb-bar flex-1 rounded-md",
              d.value > max * 0.85 ? "bg-brand" : d.value < max * 0.55 ? "bg-amber" : "bg-brand/55",
            )}
            style={{ height: `${(d.value / max) * 100}%`, animationDelay: `${i * 0.03}s` }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 font-mono text-[9px] text-ink-soft">
        {data.map((d) => (
          <span key={d.name} className="flex-1 text-center">
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DriverBar({
  label,
  points,
  max,
}: {
  label: string;
  points: number;
  max: number;
}) {
  const positive = points >= 0;
  return (
    <li className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-[13px] font-medium">{label}</span>
      <span className="flex-1 h-2 rounded-full bg-ink/5 overflow-hidden">
        <span
          className={cn("block h-full rounded-full", positive ? "bg-brand" : "bg-coral")}
          style={{ width: `${Math.min((Math.abs(points) / max) * 100, 100)}%` }}
        />
      </span>
      <span
        className={cn(
          "font-mono text-[12px] font-bold w-8 text-right",
          positive ? "text-brand-deep" : "text-coral",
        )}
      >
        {positive ? "+" : ""}
        {points}
      </span>
    </li>
  );
}
