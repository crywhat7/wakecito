"use client"

import * as React from "react"
import Link from "next/link"
import { IconBuildingStore, IconCash, IconPackage, IconReceipt } from "@tabler/icons-react"

import { NavUser } from "@/components/nav-user"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const quickActions = [
  // {
  //   label: "Abrir POS",
  //   icon: IconBuildingStore,
  //   href: "/dashboard/punto-de-venta",
  // },
  {
    label: "Nueva Venta",
    icon: IconCash,
    href: "/dashboard/punto-de-venta",
  },
  {
    label: "Nuevo Producto",
    icon: IconPackage,
    href: "/dashboard/productos/nuevo",
  },
  {
    label: "Nuevo Gasto",
    icon: IconReceipt,
    href: "#",
  },
] as const

function displayRole(role: string | undefined) {
  if (!role?.trim()) return undefined
  return role
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

export function AppHeader({
  user,
  company,
  role,
  className,
  ...props
}: React.ComponentProps<"header"> & {
  user: { name: string; email: string; avatar?: string }
  company: { name: string; logoSrc?: string }
  role?: string
}) {
  const userWithAvatar = {
    ...user,
    avatar: user.avatar ?? "",
  }
  const logoSrc = company.logoSrc ?? "/wake-isotipo.svg"

  return (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 lg:px-6",
        className,
      )}
      {...props}
    >
      <a className="flex min-w-0 flex-1 items-center justify-start gap-3" href="/dashboard">
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/60 shadow-sm">
          <img
            src={logoSrc}
            alt=""
            className="size-6 object-contain"
            aria-hidden
            width={24}
            height={24}
          />
        </div>
        <span className="truncate text-base font-semibold tracking-tight">
          {company.name}
        </span>
      </a>

      <nav
        className="hidden flex-none items-center justify-center gap-2 sm:flex"
        aria-label="Acciones rápidas"
      >
        {quickActions.map(({ label, icon: Icon, href }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            className="gap-2 font-normal"
            asChild
          >
            <Link href={href}>
              <Icon className="size-4 shrink-0 opacity-70" stroke={1.5} />
              {label}
            </Link>
          </Button>
        ))}
      </nav>

      <div className="flex flex-1 items-center justify-end">
        <NavUser user={userWithAvatar} role={displayRole(role)} />
      </div>
    </header>
  )
}
