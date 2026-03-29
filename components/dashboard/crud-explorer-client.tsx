"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconLayoutCards, IconTable } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { isCrudTableKey, type CrudTableKey } from "@/lib/crud/registry"

type TableInfo = { key: string; label: string }

type ColumnMeta = {
  column_name: string
  data_type: string
  is_nullable: "YES" | "NO"
  column_default: string | null
  foreign_table_name: string | null
  foreign_column_name: string | null
}

type MetaResponse = {
  columns: ColumnMeta[]
  primaryKey: string[]
  foreignKeys: unknown[]
  policy: {
    forbidInsert: boolean
    forbidDelete: boolean
    excludeColumns: string[]
    readOnlyColumns: string[]
  }
}

export type CrudExplorerClientProps = {
  /** explorer: selector de tabla (pantalla /dashboard/crud). doctype: tabla fija. */
  variant?: "explorer" | "doctype"
  /** Nombre PostgreSQL de la tabla (debe estar en lista blanca CRUD). */
  fixedTable?: CrudTableKey
}

function humanize(snake: string): string {
  return snake
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "object" && v !== null && "toString" in v) {
    return String(v)
  }
  return String(v)
}

function inputTypeForPg(dataType: string): string {
  const t = dataType.toLowerCase()
  if (t.includes("date") && !t.includes("timestamp")) return "date"
  if (t.includes("timestamp")) return "datetime-local"
  if (t === "boolean") return "checkbox"
  if (t.includes("int") || t === "numeric" || t === "real" || t === "double")
    return "number"
  return "text"
}

function hideCompanyIdField(tbl: string, col: string): boolean {
  return (
    col === "company_id" &&
    (tbl === "memberships" || tbl === "clients" || tbl === "purchases")
  )
}

function cardHeading(
  row: Record<string, unknown>,
  pk: string,
): { title: string; subtitle?: string } {
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
    pick(["name", "reference", "supplier_name", "email", "title"]) ??
    `ID ${String(row[pk] ?? "").slice(0, 8)}…`
  const subtitle = pick(["phone", "rtn", "purchase_date", "total_amount"])
  return { title, subtitle: subtitle ?? undefined }
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

  const [listView, setListView] = React.useState<"table" | "cards">("table")

  const [byColumn, setByColumn] = React.useState<Record<string, string>>({})
  const [byUi, setByUi] = React.useState<Record<string, string>>({})

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetMode, setSheetMode] = React.useState<"create" | "edit">("create")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formValues, setFormValues] = React.useState<Record<string, string>>({})
  const [fkCache, setFkCache] = React.useState<
    Record<string, { value: string; label: string }[]>
  >({})
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
              byUi: Record<string, string>
            }
          }
        | { success: false }
      if (json.success) {
        setByColumn(json.data.byColumn)
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
    setFkCache({})
  }, [table])

  const pk = meta?.primaryKey[0] ?? "id"

  const loadFk = React.useCallback(
    async (column: string) => {
      if (!table || column in fkCache) return
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
    },
    [table, fkCache],
  )

  function openCreate() {
    if (!meta) return
    setSheetMode("create")
    setEditingId(null)
    setFormErr(null)
    const next: Record<string, string> = {}
    for (const c of meta.columns) {
      const n = c.column_name
      if (meta.policy.excludeColumns.includes(n)) continue
      if (meta.policy.readOnlyColumns.includes(n)) continue
      if (hideCompanyIdField(table, n)) continue
      next[n] = ""
    }
    setFormValues(next)
    setSheetOpen(true)
    for (const c of meta.columns) {
      if (c.foreign_table_name) {
        void loadFk(c.column_name)
      }
    }
  }

  function openEdit(row: Record<string, unknown>) {
    if (!meta) return
    setSheetMode("edit")
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
    setSheetOpen(true)
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
        if (sheetMode === "create") {
          if (meta.policy.readOnlyColumns.includes(k)) continue
          if (meta.policy.excludeColumns.includes(k)) continue
          if (hideCompanyIdField(table, k)) continue
        }
        if (sheetMode === "edit") {
          if (meta.policy.readOnlyColumns.includes(k)) continue
          if (k === pk) continue
        }
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

      if (sheetMode === "create") {
        const res = await fetch(`/api/crud/${table}`, {
          method: "POST",
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
      } else if (editingId) {
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
      setSheetOpen(false)
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

  const columnKeys =
    rows.length > 0
      ? Object.keys(rows[0])
      : (meta?.columns.map((c) => c.column_name) ?? [])

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
                  {t.label} ({t.key})
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
          onClick={openCreate}
        >
          {ui("crud.new_record", "Nuevo registro")}
        </Button>
      </div>

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
                  {columnKeys.map((col) => (
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
                      {columnKeys.map((col) => (
                        <td
                          key={col}
                          className="max-w-48 truncate px-3 py-1.5"
                        >
                          {formatCell(row[col])}
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const rid = String(row[pk] ?? "")
            const { title, subtitle } = cardHeading(row, pk)
            return (
              <Card key={rid} className="overflow-hidden">
                <CardHeader className="border-b border-border/60 py-3">
                  <CardTitle className="text-sm leading-tight">{title}</CardTitle>
                  {subtitle ? (
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-1.5 py-3 text-xs">
                  {columnKeys
                    .filter((c) => c !== pk)
                    .slice(0, 6)
                    .map((col) => (
                      <div
                        key={col}
                        className="flex justify-between gap-2 border-b border-border/40 py-1 last:border-0"
                      >
                        <span className="shrink-0 text-muted-foreground">
                          {colLabel(col)}
                        </span>
                        <span className="truncate text-right font-medium">
                          {formatCell(row[col])}
                        </span>
                      </div>
                    ))}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === "create"
                ? ui("crud.new_record", "Nuevo registro")
                : ui("crud.edit_record", "Editar registro")}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-4 px-4 pb-8">
            {meta?.columns.map((col) => {
              const n = col.column_name
              if (meta.policy.excludeColumns.includes(n)) return null
              if (sheetMode === "create") {
                if (meta.policy.readOnlyColumns.includes(n)) return null
                if (hideCompanyIdField(table, n)) return null
              }
              if (sheetMode === "edit" && n === pk) {
                return (
                  <div key={n} className="grid gap-1.5">
                    <Label>
                      {colLabel(n)} ({ui("crud.readonly", "solo lectura")})
                    </Label>
                    <Input value={formValues[n] ?? ""} readOnly disabled />
                  </div>
                )
              }
              if (
                sheetMode === "edit" &&
                meta.policy.readOnlyColumns.includes(n)
              ) {
                return (
                  <div key={n} className="grid gap-1.5">
                    <Label>
                      {colLabel(n)} ({ui("crud.readonly", "solo lectura")})
                    </Label>
                    <Input value={formValues[n] ?? ""} readOnly disabled />
                  </div>
                )
              }

              if (col.foreign_table_name) {
                const opts = fkCache[n] ?? []
                return (
                  <div key={n} className="grid gap-1.5">
                    <Label htmlFor={`f-${n}`}>
                      {colLabel(n)}
                      <span className="ml-1 font-normal text-muted-foreground">
                        → {col.foreign_table_name}
                      </span>
                    </Label>
                    <select
                      id={`f-${n}`}
                      className={cn(
                        "h-7 w-full rounded-md border border-input bg-input/20 px-2 text-sm",
                      )}
                      value={formValues[n] ?? ""}
                      onChange={(e) =>
                        setFormValues((v) => ({ ...v, [n]: e.target.value }))
                      }
                    >
                      <option value="">—</option>
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
                  <div key={n} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`f-${n}`}
                      checked={formValues[n] === "true"}
                      onChange={(e) =>
                        setFormValues((v) => ({
                          ...v,
                          [n]: e.target.checked ? "true" : "false",
                        }))
                      }
                    />
                    <Label htmlFor={`f-${n}`}>{colLabel(n)}</Label>
                  </div>
                )
              }

              return (
                <div key={n} className="grid gap-1.5">
                  <Label htmlFor={`f-${n}`}>{colLabel(n)}</Label>
                  <Input
                    id={`f-${n}`}
                    type={it === "number" ? "number" : it}
                    value={formValues[n] ?? ""}
                    onChange={(e) =>
                      setFormValues((v) => ({ ...v, [n]: e.target.value }))
                    }
                  />
                </div>
              )
            })}
            {formErr ? (
              <p className="text-xs text-destructive">{formErr}</p>
            ) : null}
            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={submitForm} disabled={saving}>
                {saving ? "Guardando…" : ui("crud.save", "Guardar")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
              >
                {ui("crud.cancel", "Cancelar")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
