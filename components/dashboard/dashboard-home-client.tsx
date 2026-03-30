"use client";

import Link from "next/link";
import * as React from "react";
import {
  IconCash,
  IconCashBanknote,
  IconPackage,
  IconReceipt,
  IconTrendingUp,
} from "@tabler/icons-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Stats = {
  totalSales: number;
  totalExpenses: number;
  profit: number;
  expensesCount: number;
};

function formatMoney(amount: number | undefined | null, currency: string) {
  const safe = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;
  const sym = currency === "HNL" || !currency ? "L" : currency;
  return `${sym} ${safe.toFixed(2)}`;
}

function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return { from: fmt(from), to: fmt(to) };
}

const quickActions = [
  {
    label: "Nueva venta",
    href: "/dashboard/punto-de-venta",
    Icon: IconCash,
    className:
      "border-emerald-400/60 bg-emerald-500/15 text-emerald-900 hover:bg-emerald-500/25 dark:text-emerald-200",
  },
  {
    label: "Nuevo producto",
    href: "/dashboard/productos/nuevo",
    Icon: IconPackage,
    className:
      "border-sky-400/60 bg-sky-500/15 text-sky-900 hover:bg-sky-500/25 dark:text-sky-200",
  },
  {
    label: "Nuevo gasto",
    href: "/dashboard/gastos/nuevo",
    Icon: IconReceipt,
    className:
      "border-red-400/60 bg-red-500/15 text-red-900 hover:bg-red-500/25 dark:text-red-200",
  },
] as const;

export function DashboardHomeClient() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [currency, setCurrency] = React.useState("HNL");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const res = await fetch("/api/invoices?limit=1", { credentials: "include" });
        const json = (await res.json()) as
          | { success: true; data: { stats: Stats; rows: { currency: string }[] } }
          | { success: false; error: string };
        if (cancelled) return;
        if (!res.ok || !json.success) {
          throw new Error(!json.success ? json.error : "Error");
        }
        setStats(json.data.stats);
        setCurrency(json.data.rows[0]?.currency ?? "HNL");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar resumen");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const month = currentMonthRange();
  const gastosHref = `/dashboard/gastos?from=${month.from}&to=${month.to}`;

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando resumen...</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : stats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card size="sm" className="shadow-sm">
            <CardContent className="flex items-center gap-3 pt-1">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <IconTrendingUp className="size-5" stroke={1.5} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Ganancia total
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatMoney(stats.profit, currency)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Link href="/dashboard/historial-facturas" className="block">
            <Card size="sm" className="shadow-sm transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center gap-3 pt-1">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  <IconCash className="size-5" stroke={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                    Ventas totales
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatMoney(stats.totalSales, currency)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href={gastosHref} className="block">
            <Card size="sm" className="shadow-sm transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center gap-3 pt-1">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-500/12 text-red-700 dark:text-red-400">
                  <IconCashBanknote className="size-5" stroke={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                    Gastos totales
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-muted-foreground">
                    {formatMoney(stats.totalExpenses, currency)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {quickActions.map(({ href, label, Icon, className }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5",
              className,
            )}
          >
            <Icon className="size-5" stroke={1.8} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
