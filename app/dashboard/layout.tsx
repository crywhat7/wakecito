import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { companies, plans } from "@/app/db/schema";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDb } from "@/db";
import { getSessionFromCookies } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  let planName: string | undefined;
  try {
    const db = getDb();
    const rows = await db
      .select({ planName: plans.name })
      .from(companies)
      .leftJoin(plans, eq(companies.plan_id, plans.id))
      .where(eq(companies.id, session.company.id))
      .limit(1);
    planName = rows[0]?.planName ?? undefined;
  } catch {
    planName = undefined;
  }

  return (
    <DashboardShell session={session} planName={planName}>
      {children}
    </DashboardShell>
  );
}
