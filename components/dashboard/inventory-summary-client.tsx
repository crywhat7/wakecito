"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconCategory,
  IconCoin,
  IconPackage,
  IconPackageOff,
  IconReceipt,
  IconSearch,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  price: string;
  currency: string;
  category_id: string | null;
  category_name: string | null;
  unit_code: string | null;
  unit_name: string | null;
  image_url: string | null;
};

type Stats = {
  total_products: number;
  categories_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  inventory_value: string;
  sold_amount_year: string;
  year: number;
  low_stock_threshold: number;
};

function formatMoney(amount: string, currency: string) {
  const n = Number.parseFloat(amount);
  const safe = Number.isNaN(n) ? 0 : n;
  const sym = currency === "HNL" || !currency ? "L" : currency;
  return `${sym} ${safe.toFixed(2)}`;
}

function StatCard({
  label,
  value,
  icon,
  iconShellClassName,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconShellClassName?: string;
}) {
  return (
    <Card
      className={cn(
        "shadow-sm",
      )}
      size="sm"
    >
      <CardContent className="flex items-center gap-3 pt-1">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            iconShellClassName,
          )}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight sm:text-xl">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InventorySummaryClient() {
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [pagination, setPagination] = React.useState({
    page: 1,
    page_size: 50,
    total: 0,
  });
  const page = pagination.page;
  const pageSize = pagination.page_size;

  const [search, setSearch] = React.useState("");
  const [searchDebounced, setSearchDebounced] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("all");
  const [year, setYear] = React.useState(() =>
    String(new Date().getFullYear()),
  );

  const [draftStock, setDraftStock] = React.useState<Record<string, string>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setErr(null);
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (searchDebounced) params.set("q", searchDebounced);
      if (categoryId !== "all") params.set("category_id", categoryId);
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      const y = Number.parseInt(year, 10);
      if (!Number.isNaN(y)) params.set("year", String(y));

      const res = await fetch(`/api/inventory/summary?${params.toString()}`, {
        credentials: "include",
      });
      const json = (await res.json()) as
        | {
            success: true;
            data: {
              stats: Stats;
              categories: Category[];
              products: ProductRow[];
              pagination: { page: number; page_size: number; total: number };
            };
          }
        | { success: false; error: string };

      if (!res.ok || !json.success) {
        throw new Error(!json.success ? json.error : "Error");
      }

      setStats(json.data.stats);
      setCategories(json.data.categories);
      setProducts(json.data.products);
      setPagination((prev) => ({
        ...prev,
        total: json.data.pagination.total,
      }));
      setDraftStock({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [searchDebounced, categoryId, page, pageSize, year]);

  React.useLayoutEffect(() => {
    setPagination((p) => (p.page === 1 ? p : { ...p, page: 1 }));
  }, [searchDebounced, categoryId, year]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.total / pagination.page_size),
  );

  async function saveStock(product: ProductRow) {
    const raw = draftStock[product.id] ?? String(product.stock_quantity);
    const next = Number.parseInt(raw, 10);
    if (Number.isNaN(next) || next < 0) {
      toast.error("Stock inválido");
      setDraftStock((d) => {
        const n = { ...d };
        delete n[product.id];
        return n;
      });
      return;
    }
    if (next === product.stock_quantity) {
      setDraftStock((d) => {
        const n = { ...d };
        delete n[product.id];
        return n;
      });
      return;
    }

    setSavingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}/stock`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_quantity: next }),
      });
      const json = (await res.json()) as
        | { success: true; data: { product: { stock_quantity: number } } }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        throw new Error(!json.success ? json.error : "Error");
      }
      toast.success("Stock actualizado");
      setDraftStock((d) => {
        const n = { ...d };
        delete n[product.id];
        return n;
      });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSavingId(null);
    }
  }

  if (initialLoading && !stats) {
    return (
      <p className="text-sm text-muted-foreground">Cargando resumen…</p>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Label htmlFor="inv-year" className="text-xs text-muted-foreground">
            Ventas del año (total facturado)
          </Label>
          <Input
            id="inv-year"
            className="h-9 w-28"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Año para total vendido"
          />
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Productos"
            value={stats.total_products.toLocaleString("es-HN")}
            iconShellClassName="bg-amber-500/15 text-amber-800 dark:text-amber-300"
            icon={
              <IconPackage className="size-5 stroke-[1.5] text-amber-800 dark:text-amber-300" />
            }
          />
          <StatCard
            label="Categorías"
            value={stats.categories_count.toLocaleString("es-HN")}
            iconShellClassName="bg-pink-500/15 text-pink-700 dark:text-pink-200"
            icon={
              <IconCategory className="size-5 stroke-[1.5] text-pink-700 dark:text-pink-300" />
            }
          />
          <StatCard
            label={`Stock bajo (≤${stats.low_stock_threshold})`}
            value={stats.low_stock_count.toLocaleString("es-HN")}
            iconShellClassName="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            icon={
              <IconAlertTriangle className="size-5 stroke-[1.5] text-emerald-800 dark:text-emerald-300" />
            }
          />
          <StatCard
            label="Agotados"
            value={stats.out_of_stock_count.toLocaleString("es-HN")}
            iconShellClassName="bg-orange-500/15 text-orange-700 dark:text-orange-300"
            icon={
              <IconPackageOff className="size-5 stroke-[1.5] text-orange-800 dark:text-orange-300" />
            }
          />
          <StatCard
            label="Valor inventario"
            value={formatMoney(stats.inventory_value, "HNL")}
            iconShellClassName="bg-sky-500/15 text-sky-700 dark:text-sky-300"
            icon={
              <IconCoin className="size-5 stroke-[1.5] text-sky-800 dark:text-sky-300" />
            }
          />
          <StatCard
            label={`Vendido ${stats.year}`}
            value={formatMoney(stats.sold_amount_year, "HNL")}
            iconShellClassName="bg-green-600/15 text-green-700 dark:text-green-300"
            icon={
              <IconReceipt className="size-5 stroke-[1.5] text-green-800 dark:text-green-300" />
            }
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <IconSearch
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            stroke={1.5}
          />
          <Input
            className="h-9 rounded-md border-border/80 bg-background pl-9 pr-3"
            placeholder="Buscar por nombre o SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar productos"
          />
        </div>
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
        >
          <SelectTrigger
            className="h-10 min-w-44"
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

      <div className="overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/80 bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 font-medium">Categoría</th>
              <th className="px-3 py-2 font-medium">Stock</th>
              <th className="px-3 py-2 font-medium">Precio</th>
              <th className="px-3 py-2 font-medium w-28">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const displayStock =
                draftStock[p.id] ?? String(p.stock_quantity);
              const unit = p.unit_code ?? p.unit_name ?? "u.";
              return (
                <tr
                  key={p.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                >
                  <td className="px-3 py-2 align-middle">
                    <div className="flex gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted/50">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <IconPackage
                              className="size-6 text-muted-foreground/50"
                              stroke={1}
                            />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{p.name}</p>
                        {p.sku ? (
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {p.sku}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle text-muted-foreground">
                    {p.category_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        disabled={savingId === p.id}
                        className="h-9 w-22 text-base font-semibold tabular-nums"
                        value={displayStock}
                        onChange={(e) =>
                          setDraftStock((d) => ({
                            ...d,
                            [p.id]: e.target.value,
                          }))
                        }
                        onBlur={() => void saveStock(p)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        aria-label={`Stock de ${p.name}`}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {unit}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle tabular-nums font-medium">
                    {formatMoney(p.price, p.currency)}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/productos/editar/${p.id}`}>
                        Editar
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {products.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay productos con este criterio.
        </p>
      ) : null}

      {pagination.total > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando{" "}
            {(pagination.page - 1) * pagination.page_size + 1}–
            {Math.min(
              pagination.page * pagination.page_size,
              pagination.total,
            )}{" "}
            de {pagination.total}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || refreshing}
              onClick={() =>
                setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
              }
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {pagination.page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page >= totalPages || refreshing}
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
