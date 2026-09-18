import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useParams,
  useNavigate,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

const GLOBAL_NAV = [
  { to: "/home", icon: "🏠", label: "Home" },
  { to: "/businesses", icon: "🏢", label: "My Businesses" },
] as const;

const BUSINESS_NAV = [
  { to: "/b/$id/overview", icon: "📊", label: "Dashboard" },
  { to: "/b/$id/financial", icon: "💰", label: "Financial Analysis" },
  { to: "/b/$id/behaviour", icon: "📈", label: "Transaction Behaviour" },
  { to: "/b/$id/trust", icon: "🛡", label: "Trust & Consistency" },
  { to: "/b/$id/score", icon: "💡", label: "Score Explanation" },
  { to: "/b/$id/story", icon: "📝", label: "Business Story" },
  { to: "/b/$id/transactions", icon: "📋", label: "Transaction History" },
  { to: "/b/$id/update", icon: "🔄", label: "Update Data" },
] as const;

function Shell() {
  const { user } = Route.useRouteContext();
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const business = useBusiness(id ?? "");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkClass =
    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium text-ink-soft transition hover:bg-ink/5 hover:text-ink";
  const activeClass = "bg-brand/12 text-brand-deep hover:bg-brand/15 hover:text-brand-deep";

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-4">
      <Link to="/home" className="mb-4 flex items-center gap-2.5" onClick={() => setOpen(false)}>
        <div className="grid size-9 place-items-center rounded-xl bg-brand">
          <span className="font-display text-lg font-bold leading-none text-card">C</span>
        </div>
        <div className="leading-none">
          <p className="font-display text-[16px] font-bold tracking-tight">CreditBridge</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-soft">
            Lender console
          </p>
        </div>
      </Link>

      {GLOBAL_NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className={linkClass}
          activeProps={{ className: cn(linkClass, activeClass) }}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}

      {id ? (
        <>
          <p className="mt-5 px-3 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft">
            {business.data?.name ?? "Business"}
          </p>
          <div className="mt-1 space-y-1">
            {BUSINESS_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                params={{ id }}
                onClick={() => setOpen(false)}
                className={linkClass}
                activeProps={{ className: cn(linkClass, activeClass) }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <p className="mt-auto px-3 pt-6 text-[11px] leading-relaxed text-ink-soft">
        Decision-support prototype. Synthetic data only — no automated approval or rejection.
      </p>
    </nav>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-ink/8 bg-card lg:block">
          {sidebar}
        </aside>

        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-64 bg-card">{sidebar}</div>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink/8 bg-paper/90 px-5 backdrop-blur">
            <button
              className="rounded-xl border border-ink/15 px-3 py-1.5 text-[13px] lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-bold tracking-tight">
                {business.data?.name ?? "CreditBridge"}
              </p>
              <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft">
                {business.data?.business_type ?? "Alternative-data credit assessment"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden max-w-[180px] truncate text-[12.5px] text-ink-soft sm:block">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="rounded-full border border-ink/15 px-4 py-1.5 text-[12.5px] font-semibold transition hover:bg-ink hover:text-card"
              >
                Logout
              </button>
            </div>
          </header>

          <main className="px-5 py-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
