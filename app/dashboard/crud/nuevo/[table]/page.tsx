import { notFound, redirect } from "next/navigation";

import { CrudCreateClient } from "@/components/dashboard/crud-create-client";
import {
  crudCreateCanonicalPath,
  crudNuevoDynamicPath,
} from "@/lib/crud/create-path";
import { isCrudTableKey } from "@/lib/crud/registry";

export default async function CrudNuevoTablePage({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  const { table } = await params;
  if (!isCrudTableKey(table)) {
    notFound();
  }
  const canonical = crudCreateCanonicalPath(table);
  const here = crudNuevoDynamicPath(table);
  if (canonical !== here) {
    redirect(canonical);
  }

  return <CrudCreateClient table={table} backHref="/dashboard/crud" />;
}
