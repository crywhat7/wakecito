# Actualizar el archivo db/schema.ts basado en la o las tablas que acabamos de aprobar.

Como mi Ingeniero Senior, procedé a actualizar el archivo db/schema.ts basado en la o las tablas que acabamos de aprobar.

Reglas de Ejecución:

- Fidelidad Total: Usá exactamente los nombres de columnas y tipos de datos definidos en el diccionario de db/db.md.
- Drizzle Syntax: Utilizá la sintaxis de pgTable de drizzle-orm/pg-core (Postgres/Supabase).
- Relaciones: Si la tabla incluye FK (Foreign Keys), configurá explícitamente las relaciones usando .references().
- Multi-tenant: No olvidés incluir la columna company_id vinculada a la tabla companies.
- Clean Code: Exportá cada tabla individualmente y asegurate de importar los tipos necesarios (uuid, text, timestamp, numeric, etc.).
- Inferencia de Tipos: Al final del archivo, generá los tipos de TypeScript usando InferSelectModel e InferInsertModel para esta nueva tabla.
- No borres el esquema existente. Agregá la nueva tabla manteniendo la organización del archivo.
- Mostrame el código final antes de aplicarlo.