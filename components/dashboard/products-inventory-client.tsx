"use client";

import * as React from "react";
import Link from "next/link";
import { IconPackage, IconSearch } from "@tabler/icons-react";

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
type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: string;
  currency: string;
  stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
};

function formatMoney(amount: number, currency: string) {
  const sym = currency === "HNL" || !currency ? "L" : currency;
  return `${sym} ${amount.toFixed(2)}`;
}

export function ProductsInventoryClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("all");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const res = await fetch("/api/pos/bootstrap", { credentials: "include" });
        const json = (await res.json()) as
          | {
              success: true;
              data: {
                categories: Category[];
                products: Product[];
              };
            }
          | { success: false; error: string };
        if (!res.ok || !json.success) {
          throw new Error(!json.success ? json.error : "Error");
        }
        if (!cancelled) {
          setCategories(json.data.categories);
          setProducts(json.data.products);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Error al cargar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const catById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) {
      m.set(c.id, c.name);
    }
    return m;
  }, [categories]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId !== "all" && p.category_id !== categoryId) return false;
      if (!q) return true;
      const name = p.name.toLowerCase();
      const sku = (p.sku ?? "").toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [products, search, categoryId]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando inventario…</p>
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
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
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
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryId} onValueChange={setCategoryId}>
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p) => {
          const price = Number.parseFloat(p.price);
          const catName = p.category_id ? catById.get(p.category_id) : null;
          return (
            <Link
              key={p.id}
              href={`/dashboard/productos/editar/${p.id}`}
              className="block rounded-lg text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card
                size="sm"
                className="h-full overflow-hidden border-border/80 shadow-sm ring-1 ring-foreground/5 transition-colors hover:bg-muted/25"
              >
                <CardContent className="flex flex-col gap-3 p-0">
                  <div className="relative flex aspect-4/3 items-center justify-center bg-muted/50">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <IconPackage
                        className="size-16 text-muted-foreground/60"
                        stroke={1}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 px-4 pb-3 pt-0">
                    <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">
                      {p.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Precio</p>
                        <p className="font-semibold tabular-nums">
                          {formatMoney(
                            Number.isNaN(price) ? 0 : price,
                            p.currency,
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Stock</p>
                        <p className="font-semibold tabular-nums">
                          {p.stock_quantity}
                        </p>
                      </div>
                    </div>
                    {catName ? (
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                          {catName}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay productos con este criterio.
        </p>
      ) : null}
    </div>
  );
}
