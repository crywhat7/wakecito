"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  buildFormSections,
  hideCompanyIdField,
  humanize,
  inputTypeForPg,
  type ColumnMeta,
  type MetaResponse,
} from "@/lib/crud/crud-form-shared"
import { cn } from "@/lib/utils"
import type { CrudTableKey } from "@/lib/crud/registry"

function useLongTextField(columnName: string): boolean {
  return /description|notes|address|comment|supplier|internal/i.test(columnName)
}

export function CrudCreateClient({
  table,
  backHref,
}: {
  table: CrudTableKey
  backHref: string
}) {
  const router = useRouter()
  const [meta, setMeta] = React.useState<MetaResponse | null>(null)
  const [loadErr, setLoadErr] = React.useState<string | null>(null)
  const [byColumn, setByColumn] = React.useState<Record<string, string>>({})
  const [byTableTitle, setByTableTitle] = React.useState<Record<string, string>>(
    {},
  )
  const [byUi, setByUi] = React.useState<Record<string, string>>({})
  const [formValues, setFormValues] = React.useState<Record<string, string>>({})
  const [fkCache, setFkCache] = React.useState<
    Record<string, { value: string; label: string }[]>
  >({})
  const fkRequestedRef = React.useRef<Set<string>>(new Set())
  const [formErr, setFormErr] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const pk = meta?.primaryKey[0] ?? "id"

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
    fkRequestedRef.current = new Set()
    setFkCache({})
    ;(async () => {
      setLoadErr(null)
      const res = await fetch(`/api/crud/${table}/meta`, {
        credentials: "include",
      })
      const json = (await res.json()) as
        | { success: true; data: MetaResponse }
        | { success: false; error: string }
      if (!json.success) {
        setLoadErr(json.error)
        setMeta(null)
        return
      }
      setMeta(json.data)
      const next: Record<string, string> = {}
      for (const c of json.data.columns) {
        const n = c.column_name
        if (json.data.policy.excludeColumns.includes(n)) continue
        if (json.data.policy.readOnlyColumns.includes(n)) continue
        if (hideCompanyIdField(table, n)) continue
        next[n] = ""
      }
      setFormValues(next)
    })()
  }, [table])

  const colLabel = React.useCallback(
    (column: string) => {
      return byColumn[`${table}.${column}`] ?? humanize(column)
    },
    [table, byColumn],
  )

  const ui = (k: string, fallback: string) => byUi[k] ?? fallback

  const loadFk = React.useCallback(
    async (column: string) => {
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
    },
    [table],
  )

  React.useEffect(() => {
    if (!meta) return
    for (const c of meta.columns) {
      if (c.foreign_table_name) {
        void loadFk(c.column_name)
      }
    }
  }, [meta, loadFk])

  function renderField(col: ColumnMeta): React.ReactNode {
    const n = col.column_name
    if (!meta) return null
    if (meta.policy.excludeColumns.includes(n)) return null
    if (meta.policy.readOnlyColumns.includes(n)) return null
    if (hideCompanyIdField(table, n)) return null

    if (col.foreign_table_name) {
      const opts = fkCache[n] ?? []
      return (
        <div key={n} className="grid gap-1.5">
          <Label htmlFor={`c-${n}`} className="text-xs font-medium">
            {colLabel(n)}
          </Label>
          <select
            id={`c-${n}`}
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
        <div
          key={n}
          className="flex items-center gap-2 rounded-lg bg-muted/25 px-2 py-2 md:col-span-2"
        >
          <input
            type="checkbox"
            id={`c-${n}`}
            className="size-4 rounded border-input"
            checked={formValues[n] === "true"}
            onChange={(e) =>
              setFormValues((v) => ({
                ...v,
                [n]: e.target.checked ? "true" : "false",
              }))
            }
          />
          <Label htmlFor={`c-${n}`} className="font-normal">
            {colLabel(n)}
          </Label>
        </div>
      )
    }

    if (it === "text" && useLongTextField(n)) {
      return (
        <div key={n} className="grid gap-1.5 md:col-span-2">
          <Label htmlFor={`c-${n}`} className="text-xs font-medium">
            {colLabel(n)}
          </Label>
          <textarea
            id={`c-${n}`}
            rows={4}
            className={cn(
              "min-h-22 w-full resize-y rounded-lg border border-input bg-input/25 px-3 py-2 text-sm",
              "outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
              "dark:bg-input/35",
            )}
            value={formValues[n] ?? ""}
            onChange={(e) =>
              setFormValues((v) => ({ ...v, [n]: e.target.value }))
            }
          />
        </div>
      )
    }

    return (
      <div key={n} className="grid gap-1.5">
        <Label htmlFor={`c-${n}`} className="text-xs font-medium">
          {colLabel(n)}
        </Label>
        <Input
          id={`c-${n}`}
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

  async function submit() {
    if (!meta) return
    setFormErr(null)
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(formValues)) {
        const col = meta.columns.find((c) => c.column_name === k)
        if (!col) continue
        if (meta.policy.readOnlyColumns.includes(k)) continue
        if (meta.policy.excludeColumns.includes(k)) continue
        if (hideCompanyIdField(table, k)) continue
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
      router.push(backHref)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (loadErr) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadErr}
      </p>
    )
  }

  if (meta?.policy.forbidInsert) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>No se permiten altas</CardTitle>
          <CardDescription>
            Esta tabla no admite creación de registros desde el panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href={backHref}>Volver</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const tableTitle = byTableTitle[table] ?? humanize(table)

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div>
        <Link
          href={backHref}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Volver al listado
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {ui("crud.new_record", "Nuevo registro")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{tableTitle}</p>
      </div>

      <div className="space-y-6">
        {meta
          ? buildFormSections(meta.columns, meta, table, "create", pk).map(
              (section) => (
                <div
                  key={section.title}
                  className="rounded-xl border border-border/70 bg-card p-5 shadow-sm ring-1 ring-black/4 dark:ring-white/6"
                >
                  <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {section.title}
                  </h2>
                  <Separator className="my-4 bg-border/70" />
                  <div className="grid gap-4 md:grid-cols-2 md:gap-x-8 md:gap-y-5">
                    {section.cols.map((col) => renderField(col))}
                  </div>
                </div>
              ),
            )
          : null}
      </div>

      {formErr ? (
        <p className="text-sm text-destructive" role="alert">
          {formErr}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-border/80 pt-6">
        <Button type="button" onClick={submit} disabled={saving || !meta}>
          {saving ? "Guardando…" : ui("crud.save", "Guardar")}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={backHref}>{ui("crud.cancel", "Cancelar")}</Link>
        </Button>
      </div>
    </div>
  )
}
