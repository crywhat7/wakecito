"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { IconCash, IconCreditCard } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

const EXPENSE_CAT_NONE = "__exp_cat_none__";
const PRODUCT_NONE = "__product_none__";

type Category = { id: string; name: string; sort_order: number };
type Product = {
  id: string;
  name: string;
  sku: string | null;
  cost_price: string | null;
};

const selectClass = cn(
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-1 text-sm outline-none",
  "transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
  "disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
);

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDecimalInput(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/** Suma de (cantidad × costo unitario) por línea con producto elegido. */
function sumLinesAmount(
  lines: { product_id: string; quantity: string; unit_cost: string }[],
): number {
  let sum = 0;
  for (const line of lines) {
    if (!line.product_id) continue;
    const q = Number.parseInt(line.quantity, 10);
    const unit = parseDecimalInput(line.unit_cost);
    if (!Number.isFinite(q) || q <= 0 || unit == null || unit < 0) continue;
    sum += q * unit;
  }
  return sum;
}

export function ExpenseCreateClient() {
  const router = useRouter();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [addingCat, setAddingCat] = React.useState(false);

  const [categoryId, setCategoryId] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState(todayISODate);
  const [totalAmount, setTotalAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("HNL");
  const [paymentType, setPaymentType] = React.useState<"cash" | "credit">(
    "cash",
  );
  const [expectedPaymentDate, setExpectedPaymentDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [payeeName, setPayeeName] = React.useState("");
  const [reference, setReference] = React.useState("");

  const [lines, setLines] = React.useState<
    { product_id: string; quantity: string; unit_cost: string }[]
  >([]);

  const sumFromLines = React.useMemo(() => sumLinesAmount(lines), [lines]);

  React.useEffect(() => {
    if (lines.length === 0) return;
    setTotalAmount(sumFromLines.toFixed(2));
  }, [lines.length, sumFromLines]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const [cRes, pRes] = await Promise.all([
          fetch("/api/expense-categories", { credentials: "include" }),
          fetch("/api/pos/bootstrap", { credentials: "include" }),
        ]);
        const cJson = (await cRes.json()) as
          | { success: true; data: { categories: Category[] } }
          | { success: false; error: string };
        const pJson = (await pRes.json()) as
          | { success: true; data: { products: Product[] } }
          | { success: false; error: string };
        if (!cRes.ok || !cJson.success) {
          throw new Error(!cJson.success ? cJson.error : "Categorías");
        }
        if (!pRes.ok || !pJson.success) {
          throw new Error(!pJson.success ? pJson.error : "Productos");
        }
        if (!cancelled) {
          setCategories(cJson.data.categories);
          setProducts(pJson.data.products);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "No se pudieron cargar los datos",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddCategory() {
    const n = newCategoryName.trim();
    if (!n) return;
    setAddingCat(true);
    try {
      const res = await fetch("/api/expense-categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      const json = (await res.json()) as
        | { success: true; data: { category: { id: string; name: string } } }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        throw new Error(!json.success ? json.error : "Error");
      }
      setCategories((prev) => [
        ...prev,
        {
          id: json.data.category.id,
          name: json.data.category.name,
          sort_order: prev.length,
        },
      ]);
      setCategoryId(json.data.category.id);
      setNewCategoryName("");
      toast.success("Categoría creada");
    } catch {
      toast.error("No se pudo crear la categoría");
    } finally {
      setAddingCat(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        category_id: categoryId,
        expense_date: expenseDate,
        total_amount: totalAmount.trim() || "0",
        currency,
        payment_type: paymentType,
        description: description.trim() || null,
        payee_name: payeeName.trim() || null,
        reference: reference.trim() || null,
        lines: lines
          .filter((l) => l.product_id && l.quantity.trim())
          .map((l) => ({
            product_id: l.product_id,
            quantity: Number.parseInt(l.quantity, 10) || 0,
            unit_cost: l.unit_cost.trim() || null,
          })),
      };
      if (paymentType === "credit") {
        body.expected_payment_date = expectedPaymentDate;
      } else {
        body.expected_payment_date = null;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | { success: true; data: { expense: { id: string } } }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        throw new Error(!json.success ? json.error : "Error");
      }
      toast.success("Gasto registrado");
      router.push("/dashboard/gastos");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div>
        <Link
          href="/dashboard/gastos"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Gastos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Nuevo gasto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contado o crédito. Si incluís productos, el stock sube en inventario.
        </p>
      </div>

      {loadError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="ecat">Categoría</Label>
          <Select
            value={categoryId ? categoryId : EXPENSE_CAT_NONE}
            onValueChange={(v) =>
              setCategoryId(v === EXPENSE_CAT_NONE ? "" : v)
            }
          >
            <SelectTrigger id="ecat" className="w-full" size="sm">
              <SelectValue placeholder="Elegí…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EXPENSE_CAT_NONE}>Elegí…</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Nueva categoría de gasto"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={addingCat || !newCategoryName.trim()}
              onClick={() => void handleAddCategory()}
            >
              Agregar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edate">Fecha del gasto</Label>
            <Input
              id="edate"
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eamt">Monto total</Label>
            {lines.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Se actualiza con la suma de cantidad × costo unitario de cada
                línea de producto.
              </p>
            ) : null}
            <div className="flex gap-2">
              <Input
                id="eamt"
                inputMode="decimal"
                required
                className={cn(
                  "min-w-0 flex-1",
                  lines.length > 0 && "bg-muted/40",
                )}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                readOnly={lines.length > 0}
                title={
                  lines.length > 0
                    ? "Calculado desde las líneas de producto"
                    : undefined
                }
              />
              <Select
                value={currency}
                onValueChange={setCurrency}
              >
                <SelectTrigger
                  className="w-24 shrink-0"
                  size="sm"
                  aria-label="Moneda"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HNL">HNL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Forma de pago</legend>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Forma de pago del gasto"
          >
            <Toggle
              type="button"
              variant="outline"
              size="sm"
              pressed={paymentType === "cash"}
              onPressedChange={(on) => {
                if (on) setPaymentType("cash");
                else setPaymentType("credit");
              }}
              aria-label="Contado"
              className="data-[state=on]:border-foreground data-[state=on]:bg-muted"
            >
              <IconCash
                className="size-3.5 stroke-[1.5] group-data-[state=on]/toggle:text-foreground"
                aria-hidden
              />
              Contado
            </Toggle>
            <Toggle
              type="button"
              variant="outline"
              size="sm"
              pressed={paymentType === "credit"}
              onPressedChange={(on) => {
                if (on) setPaymentType("credit");
                else setPaymentType("cash");
              }}
              aria-label="Crédito"
              className="data-[state=on]:border-foreground data-[state=on]:bg-muted"
            >
              <IconCreditCard
                className="size-3.5 stroke-[1.5] group-data-[state=on]/toggle:text-foreground"
                aria-hidden
              />
              Crédito
            </Toggle>
          </div>
          {paymentType === "credit" ? (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="edue">Fecha de pago estimada</Label>
              <Input
                id="edue"
                type="date"
                required
                value={expectedPaymentDate}
                onChange={(e) => setExpectedPaymentDate(e.target.value)}
              />
            </div>
          ) : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="epayee">Proveedor / beneficiario (opcional)</Label>
            <Input
              id="epayee"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eref">Referencia (opcional)</Label>
            <Input
              id="eref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edesc">Descripción (opcional)</Label>
          <textarea
            id="edesc"
            rows={2}
            className={cn(selectClass, "min-h-[72px] resize-y py-2")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-3 rounded-lg border border-border/80 bg-muted/10 p-4">
          <p className="text-sm font-medium">Productos (entrada a inventario)</p>
          <p className="text-xs text-muted-foreground">
            Opcional. Por cada línea se suma la cantidad al stock; podés indicar
            costo unitario para actualizar el costo del producto.
          </p>
          {lines.map((line, i) => (
            <div
              key={i}
              className="grid gap-2 border-b border-border/40 pb-3 last:border-0 last:pb-0 sm:grid-cols-12"
            >
              <div className="sm:col-span-5">
                <Label className="text-xs">Producto</Label>
                <Select
                  value={line.product_id ? line.product_id : PRODUCT_NONE}
                  onValueChange={(v) => {
                    const pid = v === PRODUCT_NONE ? "" : v;
                    const prod = products.find((p) => p.id === pid);
                    const unitCost =
                      prod?.cost_price != null && prod.cost_price !== ""
                        ? prod.cost_price
                        : "";
                    const next = [...lines];
                    next[i] = {
                      ...next[i],
                      product_id: pid,
                      unit_cost: unitCost,
                    };
                    setLines(next);
                  }}
                >
                  <SelectTrigger className="mt-1 w-full" size="sm">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PRODUCT_NONE}>—</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3">
                <Label className="text-xs">Cantidad</Label>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...next[i], quantity: e.target.value };
                    setLines(next);
                  }}
                />
              </div>
              <div className="sm:col-span-3">
                <Label className="text-xs">Costo unit. (opc.)</Label>
                <Input
                  className="mt-1"
                  inputMode="decimal"
                  value={line.unit_cost}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...next[i], unit_cost: e.target.value };
                    setLines(next);
                  }}
                />
              </div>
              <div className="flex items-end sm:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setLines((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  Quitar
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                { product_id: "", quantity: "1", unit_cost: "" },
              ])
            }
          >
            + Línea de producto
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={submitting || !!loadError || !categoryId}>
            {submitting ? "Guardando…" : "Registrar gasto"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/gastos">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
