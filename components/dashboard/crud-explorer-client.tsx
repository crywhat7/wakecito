"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconLayoutCards, IconTable, IconX } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  buildFormSections,
  hideCompanyIdField,
  hideFromListView,
  humanize,
  inputTypeForPg,
  type ColumnMeta,
  type MetaResponse,
} from "@/lib/crud/crud-form-shared"
import { crudCreateCanonicalPath } from "@/lib/crud/create-path"
import { cn } from "@/lib/utils"
import { isCrudTableKey, type CrudTableKey } from "@/lib/crud/registry"

type TableInfo = { key: string; label: string }

export type CrudExplorerClientProps = {
  /** explorer: selector de tabla (pantalla /dashboard/crud). doctype: tabla fija. */
  variant?: "explorer" | "doctype"
  /** Nombre PostgreSQL de la tabla (debe estar en lista blanca CRUD). */
  fixedTable?: CrudTableKey
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "object" && v !== null && "toString" in v) {
    return String(v)
  }
  return String(v)
}

function formatEnumColumn(column: string, v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v)
  if (column === "product_condition") {
    const m: Record<string, string> = {
      new: "Nuevo",
      pre_order: "Preorden",
      post_exhibit: "Post exhibición",
      used: "Usado",
    }
    return m[s] ?? s
  }
  if (column === "shipping_insurance") {
    const m: Record<string, string> = {
      required: "Obligatorio",
      optional: "Opcional",
      none: "Sin seguro",
    }
    return m[s] ?? s
  }
  return null
}

function cardHeading(row: Record<string, unknown>, pk: string): {
  title: string
  subtitle?: string
  badges: string[]
} {
  const pick = (keys: string[]) => {
    for (const k of keys) {
      const v = row[k]
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        return String(v)
      }
    }
    return null
  }
  const title =
    pick(["name", "sku", "reference", "supplier_name", "email", "title"]) ??
    "Registro"
  const extra = pick(["phone", "rtn", "purchase_date", "total_amount"])
  const parts: string[] = []
  const sku = row.sku
  if (sku !== null && sku !== undefined && String(sku).trim() !== "")
    parts.push(String(sku))
  const price = row.price
  if (price !== null && price !== undefined && String(price).trim() !== "") {
    const cur = row.currency != null ? String(row.currency) : ""
    parts.push(`${price} ${cur}`.trim())
  }
  const st = row.stock_quantity
  if (st !== null && st !== undefined && String(st) !== "")
    parts.push(`Stock ${st}`)
  const merged = [extra, parts.length ? parts.join(" · ") : null]
    .filter(Boolean)
    .join(" · ")
  const badges: string[] = []
  if (row.is_active === true) badges.push("Activo")
  if (row.is_active === false) badges.push("Inactivo")
  if (row.show_in_web_catalog === true) badges.push("En catálogo web")
  if (row.show_in_web_catalog === false) badges.push("Fuera del catálogo")
  return { title, subtitle: merged || undefined, badges }
}

export function CrudExplorerClient({
  variant = "explorer",
  fixedTable,
}: CrudExplorerClientProps = {}) {
  const router = useRouter()
  const isDoctype = variant === "doctype" && Boolean(fixedTable)

  const [tables, setTables] = React.useState<TableInfo[]>([])
  const [tablesErr, setTablesErr] = React.useState<string | null>(null)
  const [table, setTable] = React.useState(
    isDoctype && fixedTable ? fixedTable : "",
  )
  const [meta, setMeta] = React.useState<MetaResponse | null>(null)
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const pageSize = 15
  const [loading, setLoading] = React.useState(false)
  const [metaErr, setMetaErr] = React.useState<string | null>(null)

  const [listView, setListView] = React.useState<"table" | "cards">("cards")

  const [byColumn, setByColumn] = React.useState<Record<string, string>>({})
  const [byTableTitle, setByTableTitle] = React.useState<Record<string, string>>(
    {},
  )
  const [byUi, setByUi] = React.useState<Record<string, string>>({})

  const [formPanelOpen, setFormPanelOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formValues, setFormValues] = React.useState<Record<string, string>>({})
  const [fkCache, setFkCache] = React.useState<
    Record<string, { value: string; label: string }[]>
  >({})
  const fkRequestedRef = React.useRef<Set<string>>(new Set())
  const [formErr, setFormErr] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!isDoctype || !fixedTable) return
    setTable(fixedTable)
    setPage(1)
  }, [isDoctype, fixedTable])

  React.useEffect(() => {
    ;(async () => {
      const res = await fetch("/api/i18n/translations?locale=es", {
        credentials: "include",
      })
      const json = (await res.json()) as
        | {
            success: true
            data: {
              byColumn: Record<string, string>
              byTableTitle: Record<string, string>
              byUi: Record<string, string>
            }
          }
        | { success: false }
      if (json.success) {
        setByColumn(json.data.byColumn)
        setByTableTitle(json.data.byTableTitle ?? {})
        setByUi(json.data.byUi)
      }
    })()
  }, [])

  React.useEffect(() => {
    if (isDoctype) return
    ;(async () => {
      const res = await fetch("/api/crud/tables", { credentials: "include" })
      const json = (await res.json()) as
        | { success: true; data: { tables: TableInfo[] } }
        | { success: false; error: string }
      if (!json.success) {
        setTablesErr(json.error)
        return
      }
      setTables(json.data.tables)
      if (json.data.tables.length > 0) {
        setTable((t) => t || json.data.tables[0].key)
      }
    })()
  }, [isDoctype])

  const colLabel = React.useCallback(
    (column: string) => {
      if (!table) return humanize(column)
      return byColumn[`${table}.${column}`] ?? humanize(column)
    },
    [table, byColumn],
  )

  const pk = meta?.primaryKey[0] ?? "id"

  const orderedDisplayCols = React.useMemo(() => {
    if (!meta || !table) return []
    const primary = meta.primaryKey[0] ?? "id"
    return meta.columns
      .map((c) => c.column_name)
      .filter((c) => !hideFromListView(table, c, primary))
  }, [meta, table])

  const displayCell = React.useCallback(
    (col: string, value: unknown) => {
      if (typeof value === "boolean") {
        return value ? "Sí" : "No"
      }
      const enumVal = formatEnumColumn(col, value)
      if (enumVal !== null) return enumVal
      const colMeta = meta?.columns.find((c) => c.column_name === col)
      if (
        colMeta?.foreign_table_name &&
        value !== null &&
        value !== undefined &&
        String(value) !== ""
      ) {
        const opts = fkCache[col]
        if (opts === undefined) return "…"
        const id = String(value)
        const hit = opts.find((o) => o.value === id)
        return hit?.label ?? "—"
      }
      return formatCell(value)
    },
    [meta, fkCache],
  )

  const renderFormField = (col: ColumnMeta): React.ReactNode => {
    if (!meta || !table) return null
    const n = col.column_name
    if (meta.policy.readOnlyColumns.includes(n) && n !== pk) {
      return (
        <div key={n} className="grid gap-1.5">
          <Label className="text-xs font-medium">
            {colLabel(n)}
            <span className="ml-1 font-normal text-muted-foreground">
              ({ui("crud.readonly", "solo lectura")})
            </span>
          </Label>
          <Input
            value={formValues[n] ?? ""}
            readOnly
            disabled
            className="bg-muted/40"
          />
        </div>
      )
    }

    if (col.foreign_table_name) {
      const opts = fkCache[n] ?? []
      return (
        <div key={n} className="grid gap-1.5">
          <Label htmlFor={`f-${n}`} className="text-xs font-medium">
            {colLabel(n)}
          </Label>
          <select
            id={`f-${n}`}
            className={cn(
              "min-h-9 w-full rounded-lg border border-input bg-input/25 px-3 py-2 text-sm",
              "outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
              "dark:bg-input/35",
            )}
            value={formValues[n] ?? ""}
            onChange={(e) =>
              setFormValues((v) => ({ ...v, [n]: e.target.value }))
            }
          >
            <option value="">Seleccionar…</option>
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    const it = inputTypeForPg(col.data_type)
    if (it === "checkbox") {
      return (
        <div key={n} className="flex items-center gap-2 rounded-lg bg-muted/25 px-2 py-2">
          <input
            type="checkbox"
            id={`f-${n}`}
            className="size-4 rounded border-input"
            checked={formValues[n] === "true"}
            onChange={(e) =>
              setFormValues((v) => ({
                ...v,
                [n]: e.target.checked ? "true" : "false",
              }))
            }
          />
          <Label htmlFor={`f-${n}`} className="font-normal">
            {colLabel(n)}
          </Label>
        </div>
      )
    }

    return (
      <div key={n} className="grid gap-1.5">
        <Label htmlFor={`f-${n}`} className="text-xs font-medium">
          {colLabel(n)}
        </Label>
        <Input
          id={`f-${n}`}
          type={it === "number" ? "number" : it}
          className="min-h-9 rounded-lg border-input bg-input/25 dark:bg-input/35"
          value={formValues[n] ?? ""}
          onChange={(e) =>
            setFormValues((v) => ({ ...v, [n]: e.target.value }))
          }
        />
      </div>
    )
  }

  const refetch = React.useCallback(async () => {
    if (!table) return
    setLoading(true)
    setMetaErr(null)
    try {
      const [mRes, rRes] = await Promise.all([
        fetch(`/api/crud/${table}/meta`, { credentials: "include" }),
        fetch(
          `/api/crud/${table}?page=${page}&pageSize=${pageSize}`,
          { credentials: "include" },
        ),
      ])
      const mJson = (await mRes.json()) as
        | { success: true; data: MetaResponse }
        | { success: false; error: string }
      const rJson = (await rRes.json()) as
        | {
            success: true
            data: {
              rows: Record<string, unknown>[]
              total: number
              page: number
            }
          }
        | { success: false; error: string }
      if (!mJson.success) {
        setMetaErr(mJson.error)
        setMeta(null)
        setRows([])
        return
      }
      if (!rJson.success) {
        setMetaErr(rJson.error)
        setMeta(mJson.data)
        setRows([])
        return
      }
      setMeta(mJson.data)
      setRows(rJson.data.rows)
      setTotal(rJson.data.total)
    } finally {
      setLoading(false)
    }
  }, [table, page, pageSize])

  React.useEffect(() => {
    void refetch()
  }, [refetch])

  React.useEffect(() => {
    fkRequestedRef.current = new Set()
    setFkCache({})
  }, [table])

  const loadFk = React.useCallback(async (column: string) => {
    if (!table) return
    if (fkRequestedRef.current.has(column)) return
    fkRequestedRef.current.add(column)
    const res = await fetch(
      `/api/crud/${table}/fk-options?column=${encodeURIComponent(column)}`,
      { credentials: "include" },
    )
    const json = (await res.json()) as
      | { success: true; data: { options: { value: string; label: string }[] } }
      | { success: false }
    if (json.success) {
      setFkCache((prev) => ({ ...prev, [column]: json.data.options }))
    }
  }, [table])

  React.useEffect(() => {
    if (!table || !meta) return
    for (const c of meta.columns) {
      if (c.foreign_table_name) {
        void loadFk(c.column_name)
      }
    }
  }, [table, meta, loadFk])

  function goToCreate() {
    if (!table || !meta || meta.policy.forbidInsert) return
    if (!isCrudTableKey(table)) return
    router.push(crudCreateCanonicalPath(table))
  }

  function openEdit(row: Record<string, unknown>) {
    if (!meta) return
    const id = String(row[pk] ?? "")
    setEditingId(id)
    setFormErr(null)
    const next: Record<string, string> = {}
    for (const c of meta.columns) {
      const n = c.column_name
      if (meta.policy.excludeColumns.includes(n)) continue
      const raw = row[n]
      if (raw === null || raw === undefined) {
        next[n] = ""
      } else if (typeof raw === "boolean") {
        next[n] = raw ? "true" : "false"
      } else {
        let s = String(raw)
        if (inputTypeForPg(c.data_type) === "datetime-local" && s.includes("T")) {
          s = s.slice(0, 16)
        }
        if (inputTypeForPg(c.data_type) === "date" && s.length >= 10) {
          s = s.slice(0, 10)
        }
        next[n] = s
      }
    }
    setFormValues(next)
    setFormPanelOpen(true)
    for (const c of meta.columns) {
      if (c.foreign_table_name) {
        void loadFk(c.column_name)
      }
    }
  }

  async function submitForm() {
    if (!table || !meta) return
    setFormErr(null)
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(formValues)) {
        const col = meta.columns.find((c) => c.column_name === k)
        if (!col) continue
        if (meta.policy.readOnlyColumns.includes(k)) continue
        if (k === pk) continue
        if (v === "") {
          payload[k] = null
        } else if (col.data_type === "boolean") {
          payload[k] = v === "true" || v === "on"
        } else if (
          col.data_type.includes("int") ||
          col.data_type === "numeric" ||
          col.data_type === "real" ||
          col.data_type === "double precision"
        ) {
          payload[k] = Number(v)
        } else {
          payload[k] = v
        }
      }

      if (editingId) {
        const res = await fetch(`/api/crud/${table}/${editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json = (await res.json()) as
          | { success: true }
          | { success: false; error: string }
        if (!json.success) {
          setFormErr(json.error)
          return
        }
      }
      setFormPanelOpen(false)
      router.refresh()
      await refetch()
    } finally {
      setSaving(false)
    }
  }

  async function removeRow(id: string) {
    if (!table) return
    if (meta?.policy.forbidDelete) return
    if (!confirm("¿Eliminar este registro?")) return
    const res = await fetch(`/api/crud/${table}/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
    const json = (await res.json()) as
      | { success: true }
      | { success: false; error: string }
    if (!json.success) {
      alert(json.error)
      return
    }
    router.refresh()
    await refetch()
  }

  if (!isDoctype && tablesErr) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {tablesErr}
      </p>
    )
  }

  if (isDoctype && fixedTable && !isCrudTableKey(fixedTable)) {
    return (
      <p className="text-sm text-destructive">
        Tabla no configurada en el explorador CRUD.
      </p>
    )
  }

  const ui = (k: string, fallback: string) => byUi[k] ?? fallback

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {!isDoctype ? (
          <div className="grid gap-1.5">
            <Label htmlFor="crud-table">Tabla PostgreSQL</Label>
            <select
              id="crud-table"
              className={cn(
                "h-7 min-w-56 rounded-md border border-input bg-input/20 px-2 text-sm",
                "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
              )}
              value={table}
              onChange={(e) => {
                setPage(1)
                setTable(e.target.value)
              }}
            >
              {tables.map((t) => (
                <option key={t.key} value={t.key}>
                  {byTableTitle[t.key] ?? t.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={listView === "table" ? "secondary" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setListView("table")}
          >
            <IconTable className="size-4" stroke={1.5} />
            {ui("crud.view_table", "Tabla")}
          </Button>
          <Button
            type="button"
            variant={listView === "cards" ? "secondary" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setListView("cards")}
          >
            <IconLayoutCards className="size-4" stroke={1.5} />
            {ui("crud.view_cards", "Tarjetas")}
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!meta || meta.policy.forbidInsert}
          onClick={goToCreate}
        >
          {ui("crud.new_record", "Nuevo registro")}
        </Button>
      </div>

      <div
        className={cn(
          "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6",
          formPanelOpen && "lg:items-stretch",
        )}
      >
        <div className="min-w-0 flex-1 space-y-4">
      {metaErr ? (
        <p className="text-sm text-destructive">{metaErr}</p>
      ) : null}

      {listView === "table" ? (
        <Card>
          <CardHeader className="border-b border-border/80 py-3">
            <CardTitle className="text-sm">
              {ui("crud.rows", "Filas")}{" "}
              {loading ? "(cargando…)" : `(${total} total)`}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {orderedDisplayCols.map((col) => (
                    <th key={col} className="px-3 py-2 font-medium">
                      {colLabel(col)}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rid = String(row[pk] ?? "")
                  return (
                    <tr
                      key={rid}
                      className="border-b border-border/60 hover:bg-muted/20"
                    >
                      {orderedDisplayCols.map((col) => (
                        <td
                          key={col}
                          className="max-w-48 truncate px-3 py-1.5"
                        >
                          {displayCell(col, row[col])}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="mr-1"
                          onClick={() => openEdit(row)}
                        >
                          {ui("crud.edit", "Editar")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-destructive"
                          disabled={meta?.policy.forbidDelete}
                          onClick={() => removeRow(rid)}
                        >
                          {ui("crud.delete", "Eliminar")}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && !loading ? (
              <p className="p-4 text-sm text-muted-foreground">Sin filas.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const rid = String(row[pk] ?? "")
            const { title, subtitle, badges } = cardHeading(row, pk)
            return (
              <Card
                key={rid}
                className="overflow-hidden border-border/80 shadow-sm ring-1 ring-black/4 transition-[box-shadow,transform] hover:shadow-md dark:ring-white/6"
              >
                <CardHeader className="space-y-2 border-b border-border/60 bg-linear-to-br from-primary/6 via-muted/50 to-muted/30 py-4">
                  <CardTitle className="text-base font-semibold leading-snug tracking-tight">
                    {title}
                  </CardTitle>
                  {subtitle ? (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  ) : null}
                  {badges.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {badges.map((b) => (
                        <span
                          key={b}
                          className="rounded-full bg-background/80 px-2 py-0.5 text-[0.65rem] font-medium text-foreground ring-1 ring-border/80"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {orderedDisplayCols.map((col) => (
                      <div
                        key={col}
                        className="rounded-lg bg-muted/35 px-3 py-2 ring-1 ring-border/50"
                      >
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          {colLabel(col)}
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm font-medium leading-snug text-foreground">
                          {displayCell(col, row[col])}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Separator className="bg-border/60" />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => openEdit(row)}
                    >
                      {ui("crud.edit", "Editar")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={meta?.policy.forbidDelete}
                      onClick={() => removeRow(rid)}
                    >
                      {ui("crud.delete", "Eliminar")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {rows.length === 0 && !loading ? (
            <p className="col-span-full text-sm text-muted-foreground">
              Sin filas.
            </p>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          Página {page} · {pageSize} por página
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page * pageSize >= total || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </div>
        </div>

        {formPanelOpen ? (
          <aside
            className={cn(
              "w-full shrink-0 overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-md ring-1 ring-black/4 dark:ring-white/6",
              "lg:sticky lg:top-4 lg:max-h-[min(100vh-6rem,56rem)] lg:w-[min(100%,34rem)] lg:overflow-y-auto",
            )}
            aria-label={ui("crud.edit_record", "Editar registro")}
          >
            <div className="sticky top-0 z-1 flex items-start justify-between gap-2 border-b border-border/70 bg-linear-to-r from-primary/7 via-muted/40 to-muted/25 px-4 py-3.5">
              <div>
                <h2 className="font-heading text-sm font-semibold leading-tight">
                  {ui("crud.edit_record", "Editar registro")}
                </h2>
                {table ? (
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                    {byTableTitle[table] ?? humanize(table)}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={() => setFormPanelOpen(false)}
                aria-label="Cerrar formulario"
              >
                <IconX className="size-4" stroke={1.5} />
              </Button>
            </div>
            <div className="space-y-5 p-4 pb-6">
              {meta
                ? buildFormSections(
                    meta.columns,
                    meta,
                    table,
                    "edit",
                    pk,
                  ).map((section) => (
                    <div
                      key={section.title}
                      className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-4 shadow-sm"
                    >
                      <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {section.title}
                      </h3>
                      <div className="grid gap-3.5">
                        {section.cols.map((col) => renderFormField(col))}
                      </div>
                    </div>
                  ))
                : null}
              {formErr ? (
                <p className="text-xs text-destructive">{formErr}</p>
              ) : null}
              <Separator className="bg-border/70" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={submitForm} disabled={saving}>
                  {saving ? "Guardando…" : ui("crud.save", "Guardar")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormPanelOpen(false)}
                >
                  {ui("crud.cancel", "Cancelar")}
                </Button>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
