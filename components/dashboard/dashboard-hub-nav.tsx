"use client"

import Link from "next/link"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type HubModuleBase = {
  id: string
  label: string
  iconSrc: string
}

type HubModuleDropdown = HubModuleBase

type HubModuleLink = HubModuleBase & { href: string }

type HubModule = HubModuleDropdown | HubModuleLink

function isLinkModule(mod: HubModule): mod is HubModuleLink {
  return "href" in mod && typeof mod.href === "string"
}

const modules: HubModule[] = [
  {
    id: "clientes",
    label: "Clientes",
    iconSrc: "/dashboard-icons/clientes.svg",
    href: "/dashboard/clientes",
  },
  {
    id: "compras",
    label: "Compras",
    iconSrc: "/dashboard-icons/compras.svg",
    href: "/dashboard/compras",
  },
  {
    id: "inventarios",
    label: "Inventarios",
    iconSrc: "/dashboard-icons/inventario.svg",
  },
  {
    id: "configuracion",
    label: "Configuración",
    iconSrc: "/dashboard-icons/clientes.svg",
    href: "/dashboard/configuracion",
  },
  // {
  //   id: "crud",
  //   label: "Explorador CRUD",
  //   iconSrc: "/dashboard-icons/clientes.svg",
  //   href: "/dashboard/crud",
  // },
]

const actions = [
  { key: "ver", label: "Ver", suffix: "" as const },
  { key: "nuevo", label: "Nuevo", suffix: "nuevo" as const },
  { key: "historial", label: "Historial", suffix: "historial" as const },
] as const

function hrefFor(moduleId: string, suffix: "" | "nuevo" | "historial") {
  if (moduleId === "inventarios") {
    if (suffix === "") return "/dashboard/productos"
    if (suffix === "nuevo") return "/dashboard/productos/nuevo"
    return "/dashboard/productos"
  }
  const base = `/dashboard/${moduleId}`
  if (suffix === "") return base
  return `${base}/${suffix}`
}

const tileTriggerClass = cn(
  "group flex flex-col items-center gap-3 rounded-xl outline-none",
  "transition-transform hover:scale-[1.02] active:scale-[0.98]",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
)

const iconShellClass =
  "block size-23 overflow-hidden rounded-[1.75rem] shadow-md ring-1 ring-black/5 dark:ring-white/10"

export function DashboardHubNav({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        "flex flex-wrap items-start justify-center gap-10 py-2 pb-6 sm:gap-14",
        className,
      )}
      aria-label="Accesos del panel"
    >
      {modules.map((mod) => {
        if (isLinkModule(mod)) {
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={tileTriggerClass}
            >
              <span className={iconShellClass}>
                <img
                  src={mod.iconSrc}
                  alt=""
                  width={92}
                  height={92}
                  className="size-full object-cover"
                  draggable={false}
                />
              </span>
              <span className="text-center text-sm font-medium text-foreground">
                {mod.label}
              </span>
            </Link>
          )
        }

        return (
          <DropdownMenu key={mod.id}>
            <DropdownMenuTrigger asChild>
              <button type="button" className={tileTriggerClass}>
                <span className={iconShellClass}>
                  <img
                    src={mod.iconSrc}
                    alt=""
                    width={92}
                    height={92}
                    className="size-full object-cover"
                    draggable={false}
                  />
                </span>
                <span className="text-center text-sm font-medium text-foreground">
                  {mod.label}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" sideOffset={8} className="min-w-40">
              {actions.map(({ key, label, suffix }) => (
                <DropdownMenuItem key={key} asChild>
                  <Link href={hrefFor(mod.id, suffix)}>{label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
    </nav>
  )
}
