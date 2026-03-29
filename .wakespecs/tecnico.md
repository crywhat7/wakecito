# ESPECIFICACIONES TÉCNICAS: WAKECITO CORE

## 1. Stack Tecnológico
- **Framework:** Next.js.
- **Base de Datos:** PostgreSQL (en Supabase).
- **ORM:** Drizzle ORM vinculado a Supabase.
- **Auth:** Sistema propio (Custom Auth) mediante Cookies httpOnly y JWT.

## 2. Arquitectura Multi-tenant (Regla de Oro)
5. El archivo de base de datos en `app/db/db.md` es la ley para la base de datos.
Para garantizar el aislamiento de datos entre empresas:
- **Filtro Obligatorio:** Todas las consultas SQL (`SELECT`, `UPDATE`, `DELETE`) DEBEN incluir la cláusula `WHERE id_empresa = session.id_empresa`.
- **Sesión:** El `id_empresa` activo debe obtenerse de la sesión del usuario autenticado, nunca del lado del cliente (frontend) de forma editable.
- **Relaciones:** Todas las tablas de negocio (ventas, productos, gastos, deudas) deben tener una columna `id_empresa` de tipo UUID.

## 3. Lógica de Negocio - Honduras (SAR)
El sistema debe estar preparado para la facturación legal:
- **Moneda:** Usar el prefijo `L` para Lempiras. Formato: `L 1,250.00`.
- **Impuestos:** ISV estándar del 15% por defecto. Posibilidad de configurar 18% para casos especiales.
- **Facturación:** Las facturas deben incluir:
    - CAI (Código de Autorización de Impresión).
    - Rango Autorizado (Desde - Hasta).
    - Fecha Límite de Emisión.
- **Correlativo:** El sistema debe autoincrementar el número de factura dentro del rango autorizado por la empresa.

## 4. Estructura de Datos Mínima (Schema en Inglés)
Cursor debe seguir estrictamente esta convención de nombres en inglés para las tablas y columnas de la base de datos:
- `users`: id (UUID), email, password_hash, name, created_at (timestamp).
- `companies`: id (UUID), name, tax_id (RTN), auth_code (CAI), range_start, range_end, expiration_date (timestamp).
- `memberships`: user_id (FK), company_id (FK), role (admin/editor).
- `sales`: id (UUID), company_id (FK), total_amount, tax_amount (ISV), sar_correlative, created_at (timestamp).
- `products`: id (UUID), company_id (FK), name, sale_price, stock (integer).

## 5. Instrucciones para Cursor
1. **Seguridad de Tipos:** Generar tipos de TypeScript automáticos mediante Supabase para evitar discrepancias.
2. **Manejo de Errores:** Implementar bloques `try/catch` en las funciones de la base de datos y devolver mensajes amigables para el usuario.

## 6. PROTOCOLO DE COMUNICACIÓN (API ONLY)
- **Prohibido:** No utilizar `use server` ni Server Actions.
- **Arquitectura:** Toda interacción con la DB debe ser vía `fetch` desde el cliente hacia `app/api/[route]/route.ts`.
- **Estructura de Respuesta:** - Éxito: `{ success: true, data: [...] }`
    - Error: `{ success: false, error: "Mensaje amigable" }` con el código HTTP correcto (401, 403, 500).
- **Validación:** El backend (API) debe re-validar los datos con Zod, incluso si el frontend ya lo hizo.