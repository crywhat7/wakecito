"use client";

import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import type { PublicSession } from "@/lib/auth/session";
import { Separator } from "../ui/separator";

export function DashboardShell({
  session,
  children,
}: {
  session: PublicSession;
  children: ReactNode;
}) {
  return (
    <main>
      <AppHeader
        user={{
          name: session.user.name,
          email: session.user.email,
          avatar: "",
        }}
        company={{ name: session.company.name }}
        role={session.role}
      />
      <div className="p-4 mx-auto max-w-[1360px] w-full">
        {children}
      </div>
    </main>
  );
}
