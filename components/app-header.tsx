"use client"

import * as React from "react"

import { NavUser } from "@/components/nav-user"
import { cn } from "@/lib/utils"

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
  company: { name: string; logoSrc?: string; planName?: string }
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
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold tracking-tight">
            {company.name}
          </span>
          {company.planName ? (
            <span className="block truncate text-xs text-muted-foreground">
              {company.planName}
            </span>
          ) : null}
        </span>
      </a>

      <div className="flex flex-1 items-center justify-end">
        <NavUser user={userWithAvatar} role={displayRole(role)} />
      </div>
    </header>
  )
}
