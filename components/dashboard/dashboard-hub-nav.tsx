"use client"

import Link from "next/link"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/** Una entrada del menú bajo un icono (extensible por módulo). */
export type HubMenuOption = {
  key: string
  label: string
  href: string
}

type HubModuleMenu = {
  id: string
  label: string
  iconSrc: string
  kind: "menu"
  options: HubMenuOption[]
}

type HubModuleLink = {
  id: string
  label: string
  iconSrc: string
  kind: "link"
  href: string
}

type HubModule = HubModuleMenu | HubModuleLink

const modules: HubModule[] = [
  {
    id: "clientes",
    label: "Clientes",
    iconSrc: "/dashboard-icons/clientes.svg",
    kind: "menu",
    options: [{ key: "ver", label: "Ver", href: "/dashboard/clientes" }],
  },
  {
    id: "compras",
    label: "Compras",
    iconSrc: "/dashboard-icons/compras.svg",
    kind: "menu",
    options: [{ key: "ver", label: "Ver", href: "/dashboard/compras" }],
  },
  {
    id: "inventarios",
    label: "Inventarios",
    iconSrc: "/dashboard-icons/inventario.svg",
    kind: "menu",
    options: [{ key: "ver", label: "Ver", href: "/dashboard/productos" }],
  },
  {
    id: "configuracion",
    label: "Configuración",
    iconSrc: "/dashboard-icons/clientes.svg",
    kind: "link",
    href: "/dashboard/configuracion",
  },
]

const tileTriggerClass = cn(
  "group flex flex-col items-center gap-3 rounded-xl outline-none",
  "transition-transform hover:scale-[1.02] active:scale-[0.98]",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
)

const iconShellClass =
  "block size-23 overflow-hidden rounded-[1.75rem] shadow-md ring-1 ring-black/5 dark:ring-white/10"

function HubIconTile({ mod }: { mod: HubModule }) {
  return (
    <>
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
    </>
  )
}

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
        if (mod.kind === "link") {
          return (
            <Link key={mod.id} href={mod.href} className={tileTriggerClass}>
              <HubIconTile mod={mod} />
            </Link>
          )
        }

        return (
          <DropdownMenu key={mod.id}>
            <DropdownMenuTrigger
              type="button"
              className={tileTriggerClass}
              aria-label={`${mod.label}, abrir opciones`}
            >
              <HubIconTile mod={mod} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" sideOffset={8} className="min-w-40">
              {mod.options.map((opt) => (
                <DropdownMenuItem key={opt.key} asChild>
                  <Link href={opt.href}>{opt.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
    </nav>
  )
}
