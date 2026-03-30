# DOCUMENTACIÓN DE BASE DE DATOS (SUPABASE)

## 1. Configuración de Conexión
- **ORM:** Drizzle ORM vinculado a Supabase (PostgreSQL).
- **Variables:** `DATABASE_URL` en `.env.local` (ver `.env.example` en la raíz).
- **Client:** `getDb()` en `@/db/index.ts` (postgres.js + esquema en `app/db/schema.ts`). Usar solo en servidor (API routes, server actions).

## 2. Diccionario de Datos (Tablas en Inglés)
Todas las tablas deben seguir este esquema estricto para evitar errores de llaves foráneas.

### Tabla: `users`
Usuarios de la aplicación (identidad global; el aislamiento por empresa es vía `memberships`).

- `id`: uuid (Primary Key).
- `email`: text (unique, not null).
- `password_hash`: text (not null).
- `name`: text (not null).
- `created_at`: timestamptz (not null, default now).
- `updated_at`: timestamptz (not null, default now).

### Tabla: `plans`
Planes de la aplicación (catálogo global).

- `id`: uuid (Primary Key).
- `name`: text (not null).
- `description`: text.
- `price`: numeric(12, 2) (not null, default 0).
- `currency`: text (not null, default `'HNL'` — Lempiras).
- `is_active`: boolean (not null, default true).
- `sort_order`: integer (not null, default 0).
- `created_at`: timestamptz (not null, default now).
- `updated_at`: timestamptz (not null, default now).

### Tabla: `features`
Funcionalidades disponibles en el sistema (catálogo global).

- `id`: uuid (Primary Key).
- `name`: text (not null).
- `description`: text.
- `sort_order`: integer (not null, default 0).
- `created_at`: timestamptz (not null, default now).
- `updated_at`: timestamptz (not null, default now).

### Tabla: `plan_features`
Relación N:M entre planes y funcionalidades (qué incluye cada plan). Sin `company_id`: definición global.

- `id`: uuid (Primary Key).
- `plan_id`: uuid (FK → `plans.id`, not null, on delete cascade).
- `feature_id`: uuid (FK → `features.id`, not null, on delete cascade).
- `sort_order`: integer (not null, default 0).
- Unique: (`plan_id`, `feature_id`).

### Tabla: `companies`
Empresas (tenant). Al registrarse solo, se crea una empresa con el nombre indicado y un plan (p. ej. gratuito vía `plan_id`).

- `id`: uuid (Primary Key).
- `name`: text (not null).
- `plan_id`: uuid (FK → `plans.id`, not null).
- `tax_id`: text (RTN Honduras).
- `auth_code`: text (CAI SAR).
- `range_start`: text.
- `range_end`: text.
- `expiration_date`: date.
- `invoice_next_number`: integer (not null, default 1) — siguiente correlativo para el número de factura legal.
- `created_at`: timestamptz (not null, default now).
- `updated_at`: timestamptz (not null, default now).

### Tabla: `memberships`
Usuarios por empresa: vínculo usuario ↔ empresa y rol.

- `id`: uuid (Primary Key).
- `user_id`: uuid (FK → `users.id`, not null, on delete cascade).
- `company_id`: uuid (FK → `companies.id`, not null, on delete cascade).
- `role`: text (not null) — valores: `'admin'`, `'editor'`.
- `created_at`: timestamptz (not null, default now).
- `updated_at`: timestamptz (not null, default now).
- Unique: (`user_id`, `company_id`).

### Tabla: `translations`
Textos de interfaz y etiquetas de columnas por idioma (similar a “DocType labels” en otros ERP).

- `id`: uuid (Primary Key).
- `locale`: text (not null, default `'es'`).
- `namespace`: text (not null) — ej. `'column'` (clave `tabla.columna`), `'table'` (clave nombre de tabla), `'ui'`.
- `key`: text (not null) — ej. `plans.name`, `clients`, `crud.save`.
- `value`: text (not null) — texto mostrado.
- `created_at`, `updated_at`: timestamptz (not null, default now).
- Unique: (`locale`, `namespace`, `key`).

### Tabla: `clients`
Clientes del negocio por empresa.

- `id`: uuid (Primary Key).
- `company_id`: uuid (FK → `companies.id`, not null, on delete cascade).
- `name`: text (not null).
- `rtn`, `email`, `phone`, `address`, `notes`: text (opcionales).
- `is_active`: boolean (not null, default true).
- `created_at`, `updated_at`: timestamptz (not null, default now).

### Tabla: `purchases`
Compras registradas por empresa.

- `id`: uuid (Primary Key).
- `company_id`: uuid (FK → `companies.id`, not null, on delete cascade).
- `reference`, `supplier_name`, `notes`: text (opcionales).
- `purchase_date`: date.
- `total_amount`: numeric(14, 2) (not null, default 0).
- `currency`: text (not null, default `'HNL'`).
- `created_at`, `updated_at`: timestamptz (not null, default now).

### Tabla: `units_of_measure`
Unidades de medida (catálogo global, sin `company_id`).

- `id`: uuid (PK).
- `code`: text (unique, not null) — ej. `PCS`, `KG`.
- `name`: text (not null).
- `sort_order`: integer (default 0).
- `is_active`: boolean (default true).
- `created_at`, `updated_at`: timestamptz.

### Tabla: `product_categories`
Categorías de producto por empresa.

- `id`: uuid (PK).
- `company_id`: uuid (FK → `companies`, cascade).
- `name`: text (not null).
- `slug`: text (opcional).
- `sort_order`, `is_active`, `created_at`, `updated_at`.

### Tabla: `products`
Artículo de inventario por empresa.

- `id`: uuid (PK).
- `company_id`: uuid (FK → `companies`, cascade).
- `sku`, `barcode`: text (opcionales; `sku` único por empresa cuando no es null).
- `name`: text (not null).
- `category_id`: uuid (FK → `product_categories`, on delete set null).
- `unit_id`: uuid (FK → `units_of_measure`, on delete set null).
- `description`, `internal_notes`: text.
- `price`: numeric(14,2) (default 0); `cost_price`, `tax_rate` opcionales.
- `currency`: text (default `HNL`).
- `stock_quantity`: integer (default 0).
- `show_in_web_catalog`: boolean (default true).
- `has_variants`: boolean (default false).
- `variant_type_label`: text (ej. Color) si hay variantes.
- `product_condition`: text — `new` | `pre_order` | `post_exhibit` | `used`.
- `shipping_insurance`: text — `required` | `optional` | `none`.
- `is_active`: boolean (default true).
- `created_at`, `updated_at`: timestamptz.
- Unique: (`company_id`, `sku`).

### Tabla: `product_images`
Hasta tres URLs de imagen por producto (`sort_order` 1–3).

- `id`: uuid (PK).
- `product_id`: uuid (FK → `products`, cascade).
- `url`: text (not null).
- `sort_order`: integer (not null).
- `alt_text`: text.
- `created_at`: timestamptz.
- Unique: (`product_id`, `sort_order`).

### Tabla: `product_variant_values`
Valores de variante por producto (nombre libre: Rojo, M, etc.).

- `id`: uuid (PK).
- `product_id`: uuid (FK → `products`, cascade).
- `name`: text (not null).
- `sort_order`: integer (default 0).
- `created_at`: timestamptz.
- Unique: (`product_id`, `name`).

### Tabla: `invoices`
Factura / venta POS por empresa.

- `id`: uuid (PK).
- `company_id`: uuid (FK → `companies`, cascade).
- `client_id`: uuid (FK → `clients`, on delete set null) — `NULL` = consumidor final.
- `sale_date`: date (not null).
- `status`: text (not null, default `paid`) — `paid` | `credit`.
- `currency`: text (default `HNL`).
- `subtotal_amount`, `discount_amount`, `tax_amount`, `total_amount`: numeric(14,2).
- `payment_method`: text — `cash` | `card` | `transfer` | `other` (ventas a crédito pueden dejarlo null según reglas de negocio).
- `installments`: integer (opcional; legado / reservado).
- `credit_due_date`: date (opcional) — fecha tentativa de cobro en ventas `credit`.
- `invoice_number`: text (opcional; correlativo SAR o interno).
- `notes`: text.
- `created_by_user_id`: uuid (FK → `users`, on delete set null).
- `created_at`, `updated_at`: timestamptz.
- `voided_at`: timestamptz (opcional) — si existe, la factura está anulada (no suma en totales; se puede revertir stock).
- Índice sugerido: (`company_id`, `sale_date` DESC).

### Tabla: `invoice_lines`
Detalle de líneas de factura; guarda snapshot de nombre/SKU/precio al momento de la venta.

- `id`: uuid (PK).
- `invoice_id`: uuid (FK → `invoices`, cascade).
- `line_number`: integer (not null).
- `product_id`: uuid (FK → `products`, on delete set null).
- `product_name`: text (not null).
- `sku`: text.
- `quantity`: numeric(14,4) (not null).
- `unit_price`: numeric(14,4) (not null).
- `line_total`: numeric(14,2) (not null).
- `created_at`: timestamptz.
- Unique: (`invoice_id`, `line_number`).

## 3. Reglas de Integridad & Multi-tenant
- **Multi-tenant manual:** Las consultas de datos por empresa deben filtrar por `company_id` de sesión cuando aplique. `memberships` y `companies` son el núcleo del aislamiento; el usuario autenticado no debe poder elegir `company_id` arbitrario desde el cliente.
- **Catálogo global:** `plans`, `features`, `plan_features` y `units_of_measure` no llevan `company_id`; el vínculo del tenant al plan es `companies.plan_id`.
- **FK:** Toda fila en `memberships` exige `user_id` y `company_id` válidos. Toda `companies` exige un `plan_id` válido.
- **RLS (Row Level Security):** Si se activan políticas en Supabase, deben alinearse con el acceso solo a datos del `company_id` autorizado en sesión.
- **Nomenclatura:** `snake_case` en columnas; modelos en TypeScript en `PascalCase`.
