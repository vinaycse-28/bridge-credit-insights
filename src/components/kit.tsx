import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { StatusLevel } from "@/lib/types";

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-3xl bg-card border border-ink/8 p-6", className)}>
      {children}
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: string | undefined;
  tone?: "brand" | "coral" | "amber" | undefined;
}) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <p
        className={cn(
          "font-display font-bold text-2xl mt-1",
          tone === "brand" && "text-brand-deep",
          tone === "coral" && "text-coral",
          tone === "amber" && "text-amber",
        )}
      >
        {value}
      </p>
      {note ? <p className="text-[12px] text-ink-soft mt-1">{note}</p> : null}
    </div>
  );
}

const toneMap: Record<StatusLevel, string> = {
  good: "bg-brand/12 text-brand-deep border-brand/25",
  warn: "bg-amber/15 text-amber border-amber/30",
  risk: "bg-coral/12 text-coral border-coral/30",
};

export function StatusPill({
  status,
  children,
}: {
  status: StatusLevel;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold",
        toneMap[status],
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "good" ? "bg-brand" : status === "warn" ? "bg-amber" : "bg-coral",
        )}
      />
      {children}
    </span>
  );
}

export function CheckRow({
  status,
  label,
  detail,
}: {
  status: StatusLevel;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex gap-3 py-2.5 border-b border-ink/8 last:border-0">
      <span
        className={cn(
          "font-mono text-sm leading-6",
          status === "good" ? "text-brand" : status === "warn" ? "text-amber" : "text-coral",
        )}
      >
        {status === "good" ? "✓" : status === "warn" ? "⚠" : "●"}
      </span>
      <div>
        <p className="text-[13.5px] font-semibold">{label}</p>
        <p className="text-[12.5px] text-ink-soft leading-relaxed">{detail}</p>
      </div>
    </li>
  );
}

export function Btn({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "dark" | "soft";
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition disabled:opacity-50 disabled:pointer-events-none",
        variant === "primary" && "bg-brand text-card hover:bg-brand-deep",
        variant === "dark" && "bg-ink text-card hover:bg-ink/90",
        variant === "soft" && "bg-brand/10 text-brand-deep hover:bg-brand/20",
        variant === "ghost" && "border border-ink/15 text-ink hover:bg-ink hover:text-card",
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[11.5px] text-ink-soft mt-1">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "mt-1.5 w-full rounded-2xl border border-ink/12 bg-card px-4 py-2.5 text-[14px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
