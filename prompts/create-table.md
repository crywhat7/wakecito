Actúa como mi Ingeniero de Base de Datos. Necesito diseñar una nueva tabla para:
"Usuarios" estos serán los usuarios de la aplicación.
"Empresas" cuando un usuario se registre, si este se registró totalmente solo, entonces se creará una empresa para el usuario, con el nombre que el usuario indique y el plan gratuito.
"Planes" estos serán los planes de la aplicación, tendrán los campos del nombre, descripción, precio.
"Funcionalidades" están serán las funcionalidades que tendrá cada plan, tendrán los campos del nombre, descripción.
"Funcionalidades por plan" están serán las funcionalidades que tendrá cada plan, tendrán los campos del nombre, descripción.
"Usuarios por empresa" están serán los usuarios que tendrá cada empresa, tendrán los campos del usuario, la empresa, el rol.

siguiendo las reglas de diseño y técnicas especificadas en .wakespecs/tecnico.md y app/db/db.md y el diccionario actual en app/db/db.md.

Instrucciones Obligatorias:
- Propón el esquema de la tabla (nombres en inglés, tipos de datos de Postgres).
- Asegurate de incluir el company_id para el multi-tenant manual.
- NO escribas el archivo schema.ts todavía.
- Presentame la propuesta en un bloque de código markdown para mi revisión.
- Una vez que yo te dé el 'Aprobado', procederemos a actualizar la documentación en app/db/db.md y luego a crear el archivo físico.