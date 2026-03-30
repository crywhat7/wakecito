"use client";

import * as React from "react";
import {
  IconCash,
  IconCashBanknote,
  IconReceipt,
  IconTrendingUp,
} from "@tabler/icons-react";

import { InvoiceDetailSheet } from "@/components/dashboard/invoice-detail-sheet";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type InvoiceRow = {
  id: string;
  concept: string;
  total_amount: string;
  currency: string;
  status: string;
  payment_method: string | null;
  created_at: string;
  voided_at: string | null;
};

type Stats = {
  balance: number;
  totalSales: number;
  totalExpenses: number;
};

function formatMoney(amount: number, currency: string) {
  const sym = currency === "HNL" || !currency ? "L" : currency;
  return `${sym} ${amount.toFixed(2)}`;
}

function formatInvoiceWhen(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("es-HN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("es-HN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} | ${timePart}`;
}

function paymentLabel(
  method: string | null,
  status: string,
): string {
  if (status === "credit") return "A crédito";
  const m: Record<string, string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    other: "Otro",
  };
  return method ? (m[method] ?? method) : "—";
}

export function InvoiceHistoryClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [rows, setRows] = React.useState<InvoiceRow[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const loadList = React.useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) {
      setErr(null);
      setLoading(true);
    }
    try {
      const res = await fetch("/api/invoices?limit=80", {
        credentials: "include",
      });
      const json = (await res.json()) as
        | {
            success: true;
            data: { stats: Stats; rows: InvoiceRow[] };
          }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        throw new Error(!json.success ? json.error : "Error");
      }
      setStats(json.data.stats);
      setRows(json.data.rows);
    } catch (e) {
      if (!silent) {
        setErr(e instanceof Error ? e.message : "Error al cargar");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadList();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando historial…</p>
    );
  }
  if (err) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {err}
      </p>
    );
  }

  const currency = rows[0]?.currency ?? "HNL";

  function openDetail(id: string) {
    setSelectedId(id);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-6">
      {stats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card size="sm" className="shadow-sm">
            <CardContent className="flex items-center gap-3 pt-1">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <IconTrendingUp className="size-5" stroke={1.5} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Balance
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatMoney(stats.balance, currency)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card size="sm" className="shadow-sm">
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
          <Card size="sm" className="shadow-sm">
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
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-sm font-semibold">Ingresos</h2>
        <div className="overflow-x-auto rounded-lg border border-border/80 bg-muted/20">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="w-10 px-3 py-2.5" aria-hidden />
                <th className="px-3 py-2.5">Concepto</th>
                <th className="px-3 py-2.5 text-right">Valor</th>
                <th className="px-3 py-2.5">Medio de pago</th>
                <th className="px-3 py-2.5">Fecha y hora</th>
                <th className="px-3 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No hay ventas registradas aún.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "border-b border-border/50 bg-background last:border-0",
                      "cursor-pointer transition-colors hover:bg-muted/50",
                      r.voided_at && "opacity-70",
                    )}
                    onClick={() => openDetail(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetail(r.id);
                      }
                    }}
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <IconReceipt
                        className="size-4 text-emerald-600 dark:text-emerald-500"
                        stroke={1.5}
                      />
                    </td>
                    <td className="max-w-[220px] px-3 py-2.5 align-middle font-medium">
                      <span className="line-clamp-2">{r.concept}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right align-middle tabular-nums">
                      {formatMoney(
                        Number.parseFloat(r.total_amount),
                        r.currency,
                      )}
                    </td>
                    <td className="max-w-[140px] px-3 py-2.5 align-middle text-muted-foreground">
                      <span className="line-clamp-1">
                        {paymentLabel(r.payment_method, r.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 align-middle text-muted-foreground">
                      {formatInvoiceWhen(r.created_at)}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      {r.voided_at ? (
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground line-through">
                          Anulada
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                            r.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                              : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
                          )}
                        >
                          {r.status === "paid" ? "Pagada" : "A crédito"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceDetailSheet
        invoiceId={selectedId}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelectedId(null);
        }}
        onInvoiceChanged={() => void loadList({ silent: true })}
      />
    </div>
  );
}
