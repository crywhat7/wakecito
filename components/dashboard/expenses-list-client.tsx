"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconCash,
  IconCashBanknote,
  IconReceipt,
  IconSearch,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const FILTER_CATEGORY_ALL = "all";

type Category = { id: string; name: string; sort_order: number };

type ExpenseRow = {
  id: string;
  expense_date: string;
  total_amount: string;
  currency: string;
  payment_type: string;
  expected_payment_date: string | null;
  description: string | null;
  reference: string | null;
  payee_name: string | null;
  category_id: string;
  category_name: string;
};

type Stats = {
  total_count: number;
  total_amount: string;
  total_cash: string;
  total_credit: string;
  count_cash: number;
  count_credit: number;
};

function formatMoney(amount: string, currency: string) {
  const n = Number.parseFloat(amount);
  const safe = Number.isNaN(n) ? 0 : n;
  const sym = currency === "HNL" || !currency ? "L" : currency;
  return `${sym} ${safe.toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateDMY(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function StatCard({
  label,
  value,
  sub,
  icon,
  iconShellClassName,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconShellClassName?: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-border/80 shadow-sm ring-1 ring-foreground/5",
        className,
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm",
              iconShellClassName,
            )}
            aria-hidden
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight sm:text-xl">
              {value}
            </p>
            {sub ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpensesListClient() {
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [rows, setRows] = React.useState<ExpenseRow[]>([]);
  const [pagination, setPagination] = React.useState({
    page: 1,
    page_size: 15,
    total: 0,
  });
  const page = pagination.page;
  const pageSize = pagination.page_size;

  const [search, setSearch] = React.useState("");
  const [searchDebounced, setSearchDebounced] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>(FILTER_CATEGORY_ALL);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/expense-categories", {
          credentials: "include",
        });
        const json = (await res.json()) as
          | { success: true; data: { categories: Category[] } }
          | { success: false; error: string };
        if (!cancelled && res.ok && json.success) {
          setCategories(json.data.categories);
        }
      } catch {
        /* filtros opcionales */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  React.useLayoutEffect(() => {
    setPagination((p) => (p.page === 1 ? p : { ...p, page: 1 }));
  }, [searchDebounced, categoryId]);

  const load = React.useCallback(async () => {
    setErr(null);
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (searchDebounced) params.set("q", searchDebounced);
      if (categoryId !== FILTER_CATEGORY_ALL) {
        params.set("category_id", categoryId);
      }

      const expRes = await fetch(`/api/expenses?${params.toString()}`, {
        credentials: "include",
      });

      const expJson = (await expRes.json()) as
        | {
            success: true;
            data: {
              stats: Stats;
              expenses: ExpenseRow[];
              pagination: { page: number; page_size: number; total: number };
            };
          }
        | { success: false; error: string };

      if (!expRes.ok || !expJson.success) {
        throw new Error(!expJson.success ? expJson.error : "Error");
      }

      setStats(expJson.data.stats);
      setRows(expJson.data.expenses);
      setPagination((prev) => ({
        ...prev,
        total: expJson.data.pagination.total,
      }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, searchDebounced, categoryId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pageSize));

  if (initialLoading && !stats) {
    return (
      <p className="text-sm text-muted-foreground">Cargando gastos…</p>
    );
  }

  if (err) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {err}
      </p>
    );
  }

  return (
    <div
      className={cn("space-y-6", refreshing && "opacity-70 transition-opacity")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <IconSearch
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            stroke={1.5}
          />
          <Input
            className="h-9 rounded-md border-border/80 bg-background pl-9 pr-3"
            placeholder="Buscar por categoría, descripción, proveedor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar gastos"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger
              className="h-9 min-w-44"
              size="sm"
              aria-label="Filtrar por categoría"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_CATEGORY_ALL}>
                Todas las categorías
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total registrado"
            value={formatMoney(stats.total_amount, "HNL")}
            sub={`${stats.total_count} movimiento${stats.total_count === 1 ? "" : "s"}`}
            className="bg-slate-500/10"
            icon={<IconReceipt className="size-5 stroke-[1.5] text-slate-800 dark:text-slate-300" />}
            iconShellClassName="bg-slate-500/25 ring-1 ring-slate-600/25 dark:bg-slate-500/20 dark:ring-slate-400/30"
          />
          <StatCard
            label="Contado"
            value={formatMoney(stats.total_cash, "HNL")}
            sub={`${stats.count_cash} gasto${stats.count_cash === 1 ? "" : "s"}`}
            className="bg-sky-500/10"
            icon={<IconCash className="size-5 stroke-[1.5] text-sky-800 dark:text-sky-300" />}
            iconShellClassName="bg-sky-500/25 ring-1 ring-sky-600/25 dark:bg-sky-500/20 dark:ring-sky-400/30"
          />
          <StatCard
            label="Crédito"
            value={formatMoney(stats.total_credit, "HNL")}
            sub={`${stats.count_credit} gasto${stats.count_credit === 1 ? "" : "s"}`}
            className="bg-violet-500/10"
            icon={<IconCashBanknote className="size-5 stroke-[1.5] text-violet-800 dark:text-violet-300" />}
            iconShellClassName="bg-violet-500/25 ring-1 ring-violet-600/25 dark:bg-violet-500/20 dark:ring-violet-400/30"
          />
          <StatCard
            label="En la vista"
            value={String(pagination.total)}
            sub="Filas con el criterio actual"
            className="bg-muted/40"
            icon={<IconSearch className="size-5 stroke-[1.5] text-muted-foreground" />}
            iconShellClassName="bg-muted/60 ring-1 ring-foreground/10"
          />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay gastos con este criterio.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard/gastos/nuevo">Registrar primer gasto</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Fecha</th>
                <th className="px-3 py-2.5 font-medium">Categoría</th>
                <th className="px-3 py-2.5 font-medium">Concepto</th>
                <th className="px-3 py-2.5 font-medium">Monto</th>
                <th className="px-3 py-2.5 font-medium">Pago</th>
                <th className="px-3 py-2.5 font-medium">Vencimiento</th>
                <th className="px-3 py-2.5 font-medium">Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                >
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatDateDMY(r.expense_date)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-md border border-border/80 bg-muted/30 px-2 py-0.5 text-xs font-medium">
                      {r.category_name}
                    </span>
                  </td>
                  <td className="max-w-[220px] px-3 py-2.5">
                    <p className="line-clamp-2 text-foreground">
                      {r.description?.trim() || "—"}
                    </p>
                    {r.reference ? (
                      <p className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">
                        Ref. {r.reference}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 font-semibold tabular-nums">
                    {formatMoney(r.total_amount, r.currency)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                        r.payment_type === "credit"
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-300"
                          : "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
                      )}
                    >
                      {r.payment_type === "credit" ? "Crédito" : "Contado"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                    {r.payment_type === "credit" && r.expected_payment_date
                      ? formatDateDMY(r.expected_payment_date)
                      : "—"}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2.5 text-muted-foreground">
                    {r.payee_name?.trim() || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.total > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando{" "}
            {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, pagination.total)} de{" "}
            {pagination.total}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || refreshing}
              onClick={() =>
                setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
              }
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || refreshing}
              onClick={() =>
                setPagination((p) => ({
                  ...p,
                  page: Math.min(totalPages, p.page + 1),
                }))
              }
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
