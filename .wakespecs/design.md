# SISTEMA DE DISEÑO: WAKECITO (SHADCN NATIVO)

## 1. Verdad Única de Estilo
- **Configuración Maestro:** Todas las decisiones de estilo (colores, bordes, espaciados) deben extraerse de `globals.css` y `components.json`.
- **Prohibición:** No definir colores hexadecimales directos en los componentes. Usar exclusivamente variables de Tailwind (ej: `text-primary`, `bg-background`, `border-input`).

## 2. Aplicación de Estilos (CSS Variables)
Cursor debe respetar las variables definidas en `:root` y `.dark` dentro de `globals.css`:
- **Fondos:** Usar `bg-background` para el layout y `bg-card` para contenedores de información.
- **Acciones:** Los botones y elementos activos deben usar `bg-primary` y `text-primary-foreground`.
- **Bordes:** Respetar la variable `--radius` configurada en `components.json` para todos los componentes de Shadcn.

## 3. Layout & Estructura (Basado en Referencia Shadcn)
- **Grid:** Las tarjetas de métricas superiores deben usar un grid responsivo (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) con `gap-4`.

## 4. Componentes Shadcn Nativo
Para cada Feature, usar los componentes instalados en `@/components/ui/`:
- **Visualización:** `Card`, `Table`, `Badge`.
- **Formularios:** `Form`, `Input`, `Select`, `Button`.
- **Navegación:** `Sidebar` (si está instalado) o un nav personalizado con `Lucide-react`.
En caso de que no esté instalado el componente, instalar el componente, haciendo uso de la información necesaria de shadcn en `.cursorrules` en el modulo de shadcn.

## 5. Instrucciones Críticas para Cursor
1. No modifiques `globals.css` a menos que yo lo pida explícitamente.
2. Si un componente se ve "desalineado", ajustá el layout con clases de utilidad de Tailwind (`flex`, `grid`, `items-center`) pero mantené los estilos de Shadcn intactos.
3. Asegurate de que el soporte para **Dark Mode** sea automático al usar las clases de Shadcn.