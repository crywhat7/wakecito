"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const CATEGORY_NONE = "__none__";
const UNIT_NONE = "__unit_none__";

type UnitRow = { id: string; code: string; name: string; sort_order: number };
type CategoryRow = { id: string; name: string; sort_order: number };

const CONDITIONS = [
  { value: "new" as const, title: "Producto nuevo", hint: "Stock estándar, listo para venta." },
  { value: "used" as const, title: "Usado", hint: "Segunda mano o reacondicionado." },
];

const INSURANCE = [
  {
    value: "required" as const,
    title: "Obligatorio",
    hint: "El comprador debe contratar seguro de envío.",
  },
  {
    value: "optional" as const,
    title: "Opcional",
    hint: "Puede activar o no el seguro.",
  },
  { value: "none" as const, title: "Sin seguro", hint: "No ofrecemos seguro en el envío." },
];

const CURRENCIES = ["HNL", "USD", "EUR"] as const;

const selectClass = cn(
  "flex h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm outline-none",
  "transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
  "disabled:pointer-events-none disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30",
);

function ChoiceCard<T extends string>({
  selected,
  onSelect,
  title,
  hint,
  name,
  value,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
  name: string;
  value: T;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-state={selected ? "checked" : "unchecked"}
      onClick={onSelect}
      className={cn(
        "flex flex-1 flex-col gap-0.5 rounded-lg border-2 p-2 text-left transition-colors",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-foreground bg-muted/30"
          : "border-transparent bg-muted/15 ring-1 ring-foreground/10",
        className,
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "grid size-4 shrink-0 place-content-center rounded-full border-2",
            selected ? "border-foreground bg-foreground" : "border-muted-foreground/40",
          )}
        >
          {selected ? <span className="size-2 rounded-full bg-background" /> : null}
        </span>
        <span className="text-xs font-medium leading-tight">{title}</span>
      </span>
      <span className="pl-6 text-[0.65rem] leading-snug text-muted-foreground">
        {hint}
      </span>
      <input type="hidden" name={name} value={value} readOnly aria-hidden />
    </button>
  );
}

type ProductCreateClientProps = {
  productId?: string;
};

export function ProductCreateClient({ productId }: ProductCreateClientProps = {}) {
  const router = useRouter();
  const isEdit = Boolean(productId);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [productLoading, setProductLoading] = useState(!!productId);

  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [price, setPrice] = useState("0.00");
  const [currency, setCurrency] = useState<string>("HNL");
  const [stock, setStock] = useState("0");
  const [showInCatalog, setShowInCatalog] = useState(true);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantTypeLabel, setVariantTypeLabel] = useState("");
  const [variantLines, setVariantLines] = useState<string[]>([""]);
  const [condition, setCondition] =
    useState<(typeof CONDITIONS)[number]["value"]>("new");
  const [insurance, setInsurance] =
    useState<(typeof INSURANCE)[number]["value"]>("optional");
  const [description, setDescription] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [img1, setImg1] = useState("");
  const [img2, setImg2] = useState("");
  const [img3, setImg3] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const loadRefs = useCallback(async () => {
    setLoadError(null);
    try {
      const [uRes, cRes] = await Promise.all([
        fetch("/api/units-of-measure", { credentials: "include" }),
        fetch("/api/product-categories", { credentials: "include" }),
      ]);
      const uJson = (await uRes.json()) as
        | { success: true; data: { units: UnitRow[] } }
        | { success: false; error: string };
      const cJson = (await cRes.json()) as
        | { success: true; data: { categories: CategoryRow[] } }
        | { success: false; error: string };
      if (!uRes.ok || !uJson.success) {
        throw new Error(!uJson.success ? uJson.error : "Unidades");
      }
      if (!cRes.ok || !cJson.success) {
        throw new Error(!cJson.success ? cJson.error : "Categorías");
      }
      setUnits(uJson.data.units);
      setCategories(cJson.data.categories);
      setUnitId((prev) => {
        if (prev) return prev;
        const list = uJson.data.units;
        if (!list.length) return "";
        const pcs = list.find((x) => x.code.toUpperCase() === "PCS");
        return (pcs ?? list[0]).id;
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudieron cargar los datos");
    }
  }, []);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    (async () => {
      setProductLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/products/${productId}`, {
          credentials: "include",
        });
        const json = (await res.json()) as
          | {
              success: true;
              data: {
                product: {
                  sku: string | null;
                  barcode: string | null;
                  name: string;
                  category_id: string | null;
                  unit_id: string | null;
                  description: string | null;
                  price: string;
                  cost_price: string | null;
                  currency: string;
                  tax_rate: string | null;
                  stock_quantity: number;
                  show_in_web_catalog: boolean;
                  has_variants: boolean;
                  variant_type_label: string | null;
                  product_condition: string;
                  shipping_insurance: string;
                  internal_notes: string | null;
                  images: string[];
                  variant_names: string[];
                };
              };
            }
          | { success: false; error: string };
        if (!res.ok || !json.success) {
          throw new Error(!json.success ? json.error : "Error");
        }
        if (cancelled) return;
        const p = json.data.product;
        setSku(p.sku ?? "");
        setBarcode(p.barcode ?? "");
        setName(p.name);
        setCategoryId(p.category_id ?? "");
        if (p.unit_id) setUnitId(p.unit_id);
        setPrice(p.price || "0.00");
        setCurrency(p.currency || "HNL");
        setStock(String(p.stock_quantity ?? 0));
        setShowInCatalog(p.show_in_web_catalog);
        setHasVariants(p.has_variants);
        setVariantTypeLabel(p.variant_type_label ?? "");
        setVariantLines(
          p.has_variants && p.variant_names.length > 0
            ? p.variant_names
            : [""],
        );
        const cond = CONDITIONS.find((c) => c.value === p.product_condition);
        setCondition((cond?.value ?? "new") as (typeof CONDITIONS)[number]["value"]);
        const ins = INSURANCE.find((i) => i.value === p.shipping_insurance);
        setInsurance(
          (ins?.value ?? "optional") as (typeof INSURANCE)[number]["value"],
        );
        setDescription(p.description ?? "");
        setInternalNotes(p.internal_notes ?? "");
        setCostPrice(p.cost_price ?? "");
        setTaxRate(p.tax_rate ?? "");
        const imgs = p.images ?? [];
        setImg1(imgs[0] ?? "");
        setImg2(imgs[1] ?? "");
        setImg3(imgs[2] ?? "");
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "No se pudo cargar el producto",
          );
        }
      } finally {
        if (!cancelled) setProductLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const imagesPayload = useMemo(
    () => [img1, img2, img3].map((s) => s.trim()).filter(Boolean),
    [img1, img2, img3],
  );

  async function handleAddCategory() {
    const n = newCategoryName.trim();
    if (!n) return;
    setAddingCategory(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/product-categories", {
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
    } catch {
      setSubmitError("No se pudo crear la categoría");
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    const variantNames = hasVariants
      ? variantLines.map((l) => l.trim()).filter(Boolean)
      : [];
    const body = {
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      name: name.trim(),
      category_id: categoryId || null,
      unit_id: unitId || null,
      description: description.trim() || null,
      price: price.trim() || "0",
      cost_price: costPrice.trim() || null,
      currency,
      tax_rate: taxRate.trim() || null,
      stock_quantity: Number.parseInt(stock, 10) || 0,
      show_in_web_catalog: showInCatalog,
      has_variants: hasVariants,
      variant_type_label: hasVariants ? variantTypeLabel.trim() || null : null,
      variant_names: hasVariants ? variantNames : undefined,
      product_condition: condition,
      shipping_insurance: insurance,
      internal_notes: internalNotes.trim() || null,
      images: [img1.trim(), img2.trim(), img3.trim()].filter(Boolean),
    };
    try {
      const url = isEdit ? `/api/products/${productId}` : "/api/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | {
            success: true;
            data: { product: { id: string; name: string } };
          }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        throw new Error(!json.success ? json.error : "Error");
      }
      const q = isEdit ? "actualizado" : "creado";
      router.push(
        `/dashboard/productos?${q}=${encodeURIComponent(json.data.product.id)}`,
      );
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/productos"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Inventario / productos
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {isEdit ? "Editar producto" : "Nuevo producto"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit
              ? "Modificá datos, precio, stock y catálogo web."
              : "Carga rápida: código, precio, stock, catálogo web y variantes opcionales."}
          </p>
        </div>
      </div>

      {productLoading ? (
        <p className="text-sm text-muted-foreground">Cargando producto…</p>
      ) : null}
      {loadError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}
      {submitError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className={cn(
          "grid gap-4 lg:grid-cols-3 lg:items-start lg:gap-6",
          productLoading && "pointer-events-none opacity-60",
        )}
      >
        <div className="min-w-0 space-y-4">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Código</h2>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU / código interno</Label>
              <Input
                id="sku"
                name="sku"
                placeholder="ISBN, UPC, SKU interno…"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="barcode">Código de barras</Label>
              <Input
                id="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                autoComplete="off"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Información</h2>
            <div className="space-y-1.5">
              <Label htmlFor="pname">
                Nombre del producto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pname"
                required
                placeholder="ej. Marca — tipo — presentación"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={categoryId ? categoryId : CATEGORY_NONE}
                onValueChange={(v) =>
                  setCategoryId(v === CATEGORY_NONE ? "" : v)
                }
              >
                <SelectTrigger id="category" className="w-full" size="sm">
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATEGORY_NONE}>Sin categoría</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Nueva categoría"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  disabled={addingCategory || !newCategoryName.trim()}
                  onClick={() => void handleAddCategory()}
                >
                  Agregar
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ID del producto</Label>
              <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-2 py-1.5 font-mono text-xs text-muted-foreground break-all">
                {isEdit && productId
                  ? productId
                  : "Se genera al guardar (UUID)."}
              </p>
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Gestión</h2>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">
                  Precio <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="price"
                    inputMode="decimal"
                    className="min-w-0 flex-1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger
                      className="w-24 shrink-0"
                      size="sm"
                      aria-label="Moneda"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  inputMode="numeric"
                  className="w-full"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="unit">Unidad</Label>
                <Select
                  value={unitId ? unitId : UNIT_NONE}
                  onValueChange={(v) =>
                    setUnitId(v === UNIT_NONE ? "" : v)
                  }
                >
                  <SelectTrigger id="unit" className="w-full" size="sm" aria-label="Unidad">
                    <SelectValue placeholder="Unidad…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNIT_NONE}>Unidad…</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cost">Costo</Label>
                <Input
                  id="cost"
                  inputMode="decimal"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax">ISV %</Label>
                <Input
                  id="tax"
                  inputMode="decimal"
                  placeholder="15"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Detalle y catálogo</h2>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Condición</Label>
              <div
                className="grid gap-1.5 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Condición del producto"
              >
                {CONDITIONS.map((opt) => (
                  <ChoiceCard
                    key={opt.value}
                    name="product_condition"
                    value={opt.value}
                    title={opt.title}
                    hint={opt.hint}
                    selected={condition === opt.value}
                    onSelect={() => setCondition(opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="catalog"
                checked={showInCatalog}
                onCheckedChange={(v) => setShowInCatalog(v === true)}
              />
              <Label htmlFor="catalog" className="cursor-pointer font-normal">
                Mostrar en catálogo web
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Descripción</Label>
              <textarea
                id="desc"
                rows={3}
                className={cn(
                  selectClass,
                  "min-h-[72px] resize-y py-2 text-sm leading-relaxed",
                )}
                placeholder="Detalles para fichas y facturación…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Imágenes (máx. 3 URLs)</Label>
              <p className="text-xs text-muted-foreground">
                Pegá enlaces públicos; la subida de archivos se puede agregar después.
              </p>
              <div className="grid gap-2">
                <Input
                  placeholder="URL imagen 1"
                  value={img1}
                  onChange={(e) => setImg1(e.target.value)}
                />
                <Input
                  placeholder="URL imagen 2"
                  value={img2}
                  onChange={(e) => setImg2(e.target.value)}
                />
                <Input
                  placeholder="URL imagen 3"
                  value={img3}
                  onChange={(e) => setImg3(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Activas: {imagesPayload.length}/3
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="variants"
                checked={hasVariants}
                onCheckedChange={(v) => {
                  const on = v === true;
                  setHasVariants(on);
                  if (on && variantLines.length === 0) setVariantLines([""]);
                }}
              />
              <Label htmlFor="variants" className="cursor-pointer font-normal">
                Este producto tiene variantes (color, talla, etc.)
              </Label>
            </div>
            {hasVariants ? (
              <div className="space-y-2 rounded-lg border border-border/80 bg-muted/10 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vlabel">Tipo de variante</Label>
                  <Input
                    id="vlabel"
                    placeholder="ej. Color, Talla, Material"
                    value={variantTypeLabel}
                    onChange={(e) => setVariantTypeLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valores (uno por línea o fila)</Label>
                  {variantLines.map((line, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="ej. Rojo"
                        value={line}
                        onChange={(e) => {
                          const next = [...variantLines];
                          next[i] = e.target.value;
                          setVariantLines(next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          setVariantLines((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        Quitar
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVariantLines((prev) => [...prev, ""])}
                  >
                    + Agregar valor
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <div className="col-span-full flex flex-wrap gap-3 border-t border-border/60 pt-4">
          <Button
            type="submit"
            disabled={submitting || !!loadError || productLoading}
          >
            {submitting
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Crear producto"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/productos">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
