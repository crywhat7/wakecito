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

## 3. Reglas de Integridad & Multi-tenant
- **Multi-tenant manual:** Las consultas de datos por empresa deben filtrar por `company_id` de sesión cuando aplique. `memberships` y `companies` son el núcleo del aislamiento; el usuario autenticado no debe poder elegir `company_id` arbitrario desde el cliente.
- **Catálogo global:** `plans`, `features` y `plan_features` no llevan `company_id`; el vínculo del tenant al plan es `companies.plan_id`.
- **FK:** Toda fila en `memberships` exige `user_id` y `company_id` válidos. Toda `companies` exige un `plan_id` válido.
- **RLS (Row Level Security):** Si se activan políticas en Supabase, deben alinearse con el acceso solo a datos del `company_id` autorizado en sesión.
- **Nomenclatura:** `snake_case` en columnas; modelos en TypeScript en `PascalCase`.
