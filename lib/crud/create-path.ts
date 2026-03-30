import type { CrudTableKey } from "@/lib/crud/registry"

/** Ruta canónica del alta (wizard dedicado o formulario especial). */
export function crudCreateCanonicalPath(table: CrudTableKey): string {
  if (table === "clients") return "/dashboard/clientes/nuevo"
  if (table === "purchases") return "/dashboard/compras/nuevo"
  if (table === "products") return "/dashboard/productos/nuevo"
  return `/dashboard/crud/nuevo/${table}`
}

/** URL bajo /dashboard/crud/nuevo/[table] (solo tablas sin página propia). */
export function crudNuevoDynamicPath(table: CrudTableKey): string {
  return `/dashboard/crud/nuevo/${table}`
}
