/**
 * Tipos y utilidades compartidas entre el explorador CRUD y el alta en página completa.
 */

export type ColumnMeta = {
  column_name: string
  data_type: string
  is_nullable: "YES" | "NO"
  column_default: string | null
  foreign_table_name: string | null
  foreign_column_name: string | null
}

export type MetaResponse = {
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

export type FormSection = { title: string; cols: ColumnMeta[] }

export function humanize(snake: string): string {
  return snake
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function inputTypeForPg(dataType: string): string {
  const t = dataType.toLowerCase()
  if (t.includes("date") && !t.includes("timestamp")) return "date"
  if (t.includes("timestamp")) return "datetime-local"
  if (t === "boolean") return "checkbox"
  if (t.includes("int") || t === "numeric" || t === "real" || t === "double")
    return "number"
  return "text"
}

export function hideCompanyIdField(tbl: string, col: string): boolean {
  return (
    col === "company_id" &&
    (tbl === "memberships" ||
      tbl === "clients" ||
      tbl === "purchases" ||
      tbl === "product_categories" ||
      tbl === "products")
  )
}

export function hideFromListView(tbl: string, col: string, pk: string): boolean {
  if (col === pk) return true
  if (col === "company_id" && hideCompanyIdField(tbl, col)) return true
  return false
}

export function buildFormSections(
  columns: ColumnMeta[],
  meta: MetaResponse,
  tbl: string,
  formMode: "create" | "edit",
  primaryKey: string,
): FormSection[] {
  const visible = columns.filter((col) => {
    const n = col.column_name
    if (meta.policy.excludeColumns.includes(n)) return false
    if (formMode === "create") {
      if (meta.policy.readOnlyColumns.includes(n)) return false
      if (hideCompanyIdField(tbl, n)) return false
    }
    if (formMode === "edit" && n === primaryKey) return false
    return true
  })

  const fks = visible.filter((c) => c.foreign_table_name)
  const flags = visible.filter(
    (c) => inputTypeForPg(c.data_type) === "checkbox",
  )
  const dates = visible.filter((c) => {
    const t = inputTypeForPg(c.data_type)
    return t === "date" || t === "datetime-local"
  })
  const nums = visible.filter((c) => {
    const t = inputTypeForPg(c.data_type)
    return t === "number" && !c.foreign_table_name
  })
  const rest = visible.filter(
    (c) =>
      !fks.includes(c) &&
      !flags.includes(c) &&
      !dates.includes(c) &&
      !nums.includes(c),
  )

  const sections: FormSection[] = []
  if (rest.length) sections.push({ title: "Datos principales", cols: rest })
  if (fks.length) sections.push({ title: "Relaciones", cols: fks })
  if (nums.length) sections.push({ title: "Importes y cantidades", cols: nums })
  if (dates.length) sections.push({ title: "Fechas", cols: dates })
  if (flags.length) sections.push({ title: "Opciones", cols: flags })
  return sections
}
