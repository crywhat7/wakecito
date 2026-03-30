"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  IconArrowLeft,
  IconBarcode,
  IconBuildingBank,
  IconCash,
  IconCreditCard,
  IconCrown,
  IconDots,
  IconMinus,
  IconPackage,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type PosProduct = {
  id: string;
  name: string;
  sku: string | null;
  price: string;
  currency: string;
  stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
};

type PosCategory = { id: string; name: string; sort_order: number };
type PosClient = { id: string; name: string };

type CartLine = {
  product: PosProduct;
  quantity: number;
};

function formatMoney(amount: number, currency: string) {
  const sym = currency === "HNL" || !currency ? "L" : currency;
  return `${sym} ${amount.toFixed(2)}`;
}

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monto fijo o porcentaje del subtotal (ej. `10%`, `12,5%`). */
function parseDiscountAmount(raw: string, subtotal: number): number {
  const sub = Math.max(0, Math.round(subtotal * 100) / 100);
  const t = raw.trim();
  if (!t) return 0;
  const pctMatch = t.match(/^(\d+(?:[.,]\d+)?)\s*%$/);
  if (pctMatch) {
    const pct = Number.parseFloat(pctMatch[1].replace(",", "."));
    if (Number.isNaN(pct) || pct < 0) return 0;
    const clamped = Math.min(pct, 100);
    return Math.round(sub * clamped) / 100;
  }
  const n = Number.parseFloat(t.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, sub);
}

const PAYMENT_METHODS = [
  {
    id: "cash" as const,
    label: "Efectivo",
    Icon: IconCash,
  },
  {
    id: "card" as const,
    label: "Tarjeta",
    Icon: IconCreditCard,
  },
  {
    id: "transfer" as const,
    label: "Transferencia",
    Icon: IconBuildingBank,
  },
  {
    id: "other" as const,
    label: "Otro",
    Icon: IconDots,
  },
];

export function PosClient() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<PosCategory[]>([]);
  const [products, setProducts] = React.useState<PosProduct[]>([]);
  const [clients, setClients] = React.useState<PosClient[]>([]);

  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("all");
  const [cart, setCart] = React.useState<Map<string, CartLine>>(new Map());

  /** Mismo panel lateral: carrito o paso de pago. */
  const [sidePanel, setSidePanel] = React.useState<"cart" | "payment">("cart");
  const [saleDate, setSaleDate] = React.useState(todayISODate);
  const [status, setStatus] = React.useState<"paid" | "credit">("paid");
  const [clientId, setClientId] = React.useState("");
  const [discountStr, setDiscountStr] = React.useState("0");
  const [paymentMethod, setPaymentMethod] = React.useState<
    "cash" | "card" | "transfer" | "other"
  >("cash");
  const [creditDueDate, setCreditDueDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [submitErr, setSubmitErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadErr(null);
      try {
        const res = await fetch("/api/pos/bootstrap", { credentials: "include" });
        const json = (await res.json()) as
          | {
              success: true;
              data: {
                categories: PosCategory[];
                products: PosProduct[];
                clients: PosClient[];
              };
            }
          | { success: false; error: string };
        if (!res.ok || !json.success) {
          throw new Error(!json.success ? json.error : "Error");
        }
        if (!cancelled) {
          setCategories(json.data.categories);
          setProducts(json.data.products);
          setClients(json.data.clients);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "Error al cargar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const cartLines = React.useMemo(() => [...cart.values()], [cart]);
  const totalItems = cartLines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = cartLines.reduce(
    (s, l) => s + Number.parseFloat(l.product.price) * l.quantity,
    0,
  );
  const discount = Number.parseFloat(discountStr.replace(",", ".")) || 0;
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

  function addProduct(p: PosProduct) {
    if (p.stock_quantity <= 0) return;
    setCart((prev) => {
      const next = new Map(prev);
      const cur = next.get(p.id);
      const qty = (cur?.quantity ?? 0) + 1;
      if (qty > p.stock_quantity) return prev;
      next.set(p.id, { product: p, quantity: qty });
      return next;
    });
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(productId);
      if (!line) return prev;
      if (qty < 1) {
        next.delete(productId);
        return next;
      }
      const max = line.product.stock_quantity;
      next.set(productId, {
        ...line,
        quantity: Math.min(qty, max),
      });
      return next;
    });
  }

  function removeLine(productId: string) {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }

  function clearCart() {
    setCart(new Map());
  }

  function nuevaVentaLibre() {
    clearCart();
    setSidePanel("cart");
    setDiscountStr("0");
    setClientId("");
    setSaleDate(todayISODate());
    setStatus("paid");
    setPaymentMethod("cash");
    setCreditDueDate("");
  }

  async function submitSale() {
    if (cartLines.length === 0) return;
    setSubmitErr(null);
    setSaving(true);
    try {
      const lines = cartLines.map((l) => ({
        product_id: l.product.id,
        quantity: l.quantity,
      }));
      const discountAmount = parseDiscountAmount(discountStr, subtotal);
      const body = {
        sale_date: saleDate,
        status,
        client_id: clientId || null,
        discount_amount: discountAmount.toFixed(2),
        payment_method: status === "paid" ? paymentMethod : null,
        credit_due_date:
          status === "credit" && creditDueDate ? creditDueDate : null,
        lines,
      };
      const res = await fetch("/api/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | { success: true; data: { invoice: { id: string } } }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        throw new Error(!json.success ? json.error : "Error");
      }
      nuevaVentaLibre();
      router.refresh();
      alert(`Venta registrada. Factura: ${json.data.invoice.id.slice(0, 8)}…`);
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando productos…</p>
    );
  }
  if (loadErr) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadErr}
      </p>
    );
  }

  return (
    <div className="flex min-h-[min(100vh-8rem,900px)] flex-col gap-0 lg:flex-row lg:items-stretch">
      <div className="flex min-w-0 flex-1 flex-col gap-4 border-b pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Nueva venta</h1>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <IconCrown className="size-3.5 text-amber-500" stroke={1.5} />
              Abrir caja
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={nuevaVentaLibre}
            >
              Nueva venta libre
            </Button>
            <Button type="button" variant="outline" size="sm" disabled>
              Nuevo gasto
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <IconSearch
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              stroke={1.5}
            />
            <Input
              placeholder="Buscar productos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9"
              aria-label="Buscar productos"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryId("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              categoryId === "all"
                ? "border-amber-400 bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                : "border-border bg-background hover:bg-muted/50",
            )}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                categoryId === c.id
                  ? "border-amber-400 bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                  : "border-border bg-background hover:bg-muted/50",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <Link
            href="/dashboard/productos/nuevo"
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/25 bg-muted/20 p-4 text-center transition-colors hover:bg-muted/40",
              "min-h-44",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full border-2 border-foreground/30">
              <IconPlus className="size-6" stroke={1.5} />
            </span>
            <span className="text-sm font-medium">Crear producto</span>
          </Link>

          {filtered.map((p) => {
            const price = Number.parseFloat(p.price);
            const disabled = p.stock_quantity <= 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => addProduct(p)}
                className={cn(
                  "flex min-h-44 flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-[transform,box-shadow] hover:shadow-md",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <div className="relative aspect-square w-full bg-muted/40">
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
                        className="size-12 text-muted-foreground/50"
                        stroke={1.25}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2.5">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatMoney(Number.isNaN(price) ? 0 : price, p.currency)}
                  </p>
                  <p className="line-clamp-2 text-xs leading-snug font-medium">
                    {p.name}
                  </p>
                  <span className="mt-auto inline-flex w-fit rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-800 dark:text-emerald-200">
                    {p.stock_quantity} disponibles
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="flex max-h-[calc(100vh-6rem)] w-full flex-col border-t bg-background lg:max-h-none lg:w-88 lg:shrink-0 lg:border-t-0 lg:border-l">
        {sidePanel === "cart" ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <span className="text-sm font-semibold">Productos</span>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Vaciar canasta
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {cartLines.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="rounded-2xl bg-muted/50 p-6 text-muted-foreground">
                    <IconBarcode
                      className="mx-auto size-14 opacity-60"
                      stroke={1}
                    />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Agregá productos rápidamente usando tu lector de código de
                    barras. Si no está en tu inventario, lo buscaremos en nuestra
                    base de datos.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {cartLines.map((line) => {
                    const unit = Number.parseFloat(line.product.price);
                    const lineSub = unit * line.quantity;
                    return (
                      <li
                        key={line.product.id}
                        className="border-b border-border/60 pb-4 last:border-0"
                      >
                        <div className="flex gap-2">
                          <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                            {line.product.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={line.product.image_url}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <IconPackage
                                  className="size-5 text-muted-foreground"
                                  stroke={1.25}
                                />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium leading-tight">
                                {line.product.name}
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="shrink-0 text-destructive hover:bg-destructive/10"
                                onClick={() => removeLine(line.product.id)}
                                aria-label="Quitar"
                              >
                                <IconTrash className="size-4" stroke={1.5} />
                              </Button>
                            </div>
                            <div className="mt-2 flex gap-2">
                              <div className="flex h-8 flex-1 items-stretch overflow-hidden rounded-md border border-input">
                                <button
                                  type="button"
                                  className="px-2 hover:bg-muted"
                                  onClick={() =>
                                    setQty(line.product.id, line.quantity - 1)
                                  }
                                >
                                  <IconMinus className="size-3.5" />
                                </button>
                                <span className="flex flex-1 items-center justify-center text-xs font-medium tabular-nums">
                                  {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="px-2 hover:bg-muted"
                                  onClick={() =>
                                    setQty(line.product.id, line.quantity + 1)
                                  }
                                >
                                  <IconPlus className="size-3.5" />
                                </button>
                              </div>
                              <div className="flex h-8 min-w-22 items-center justify-center rounded-md border border-input px-2 text-xs font-medium tabular-nums">
                                {formatMoney(unit, line.product.currency)}
                              </div>
                            </div>
                            <p className="mt-2 text-[0.7rem] text-muted-foreground">
                              Precio por {line.quantity}{" "}
                              {line.quantity === 1 ? "unidad" : "unidades"}:{" "}
                              {formatMoney(lineSub, line.product.currency)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-auto border-t bg-muted/30 p-3">
              <Button
                type="button"
                className="h-11 w-full justify-between gap-2 bg-foreground text-background hover:bg-foreground/90"
                disabled={cartLines.length === 0}
                onClick={() => {
                  setSubmitErr(null);
                  setSidePanel("payment");
                }}
              >
                <span className="flex size-7 items-center justify-center rounded bg-background/20 text-xs font-semibold">
                  {totalItems}
                </span>
                <span className="flex-1 text-center font-medium">Continuar</span>
                <span className="flex items-center gap-1 text-sm tabular-nums">
                  {formatMoney(
                    cartLines.length ? subtotal : 0,
                    cartLines[0]?.product.currency ?? "HNL",
                  )}{" "}
                  ›
                </span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b px-3 py-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={() => setSidePanel("cart")}
                aria-label="Volver al carrito"
              >
                <IconArrowLeft className="size-4" stroke={1.5} />
              </Button>
              <span className="text-sm font-semibold">Pago</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-1">
                  <button
                    type="button"
                    onClick={() => setStatus("paid")}
                    className={cn(
                      "rounded-md py-2 text-xs font-medium",
                      status === "paid"
                        ? "bg-emerald-600 text-white"
                        : "bg-transparent text-muted-foreground",
                    )}
                  >
                    Pagada
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("credit");
                      setCreditDueDate((d) => d || addDaysISO(saleDate, 7));
                    }}
                    className={cn(
                      "rounded-md py-2 text-xs font-medium",
                      status === "credit"
                        ? "bg-emerald-600 text-white"
                        : "bg-transparent text-muted-foreground",
                    )}
                  >
                    A crédito
                  </button>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="sale-date">
                    Fecha de la venta{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sale-date"
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="pos-client">Cliente</Label>
                  <select
                    id="pos-client"
                    className={cn(
                      "flex h-9 w-full rounded-md border border-input bg-input/20 px-2 text-sm outline-none",
                      "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30",
                    )}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    <option value="">Consumidor final</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="discount">
                    Descuento ({cartLines[0]?.product.currency ?? "HNL"})
                  </Label>
                  <Input
                    id="discount"
                    inputMode="decimal"
                    value={discountStr}
                    onChange={(e) => setDiscountStr(e.target.value)}
                    onBlur={() => {
                      const amt = parseDiscountAmount(discountStr, subtotal);
                      setDiscountStr(amt.toFixed(2));
                    }}
                    placeholder="0 o 10%"
                  />
                  <p className="text-[0.7rem] text-muted-foreground">
                    Podés escribir un monto o un porcentaje del subtotal (ej.{" "}
                    <span className="tabular-nums">10%</span>); al salir del
                    campo se convierte al valor en lempiras.
                  </p>
                </div>

                {status === "credit" ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="credit-due">
                      Fecha tentativa de pago{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="credit-due"
                      type="date"
                      min={saleDate}
                      value={creditDueDate}
                      onChange={(e) => setCreditDueDate(e.target.value)}
                    />
                  </div>
                ) : null}

                {status === "paid" ? (
                  <>
                    <div className="grid gap-2">
                      <Label>Método de pago *</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {PAYMENT_METHODS.map((m) => {
                          const PMIcon = m.Icon;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setPaymentMethod(m.id)}
                              className={cn(
                                "flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-2 py-4 text-center text-xs font-medium transition-colors",
                                paymentMethod === m.id
                                  ? "border-emerald-600 bg-emerald-500/10 text-foreground"
                                  : "border-border hover:bg-muted/40",
                              )}
                            >
                              <PMIcon
                                className="size-7 shrink-0 opacity-90"
                                stroke={1.35}
                              />
                              <span className="leading-tight">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : null}

                {submitErr ? (
                  <p className="text-xs text-destructive">{submitErr}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-auto border-t bg-muted/20 p-3">
              <div className="mb-3 flex flex-col gap-2 px-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {formatMoney(
                      subtotal,
                      cartLines[0]?.product.currency ?? "HNL",
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatMoney(
                      total,
                      cartLines[0]?.product.currency ?? "HNL",
                    )}
                  </span>
                </div>
                <Separator />
              </div>
              <Button
                type="button"
                className="h-12 w-full justify-between gap-2 bg-wakecito-mint font-semibold text-wakecito-charcoal shadow-sm hover:bg-wakecito-mint/85"
                disabled={saving || cartLines.length === 0}
                onClick={submitSale}
              >
                <span className="flex size-7 items-center justify-center rounded bg-wakecito-charcoal/15 text-xs font-semibold text-wakecito-charcoal">
                  {totalItems}
                </span>
                <span className="flex-1 text-center font-medium">
                  {saving ? "Guardando…" : "Crear venta"}
                </span>
                <span className="text-sm tabular-nums">
                  {formatMoney(
                    total,
                    cartLines[0]?.product.currency ?? "HNL",
                  )}{" "}
                  ›
                </span>
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
