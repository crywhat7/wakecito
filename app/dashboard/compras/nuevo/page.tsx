import { CrudCreateClient } from "@/components/dashboard/crud-create-client";

export default function ComprasNuevoPage() {
  return <CrudCreateClient table="purchases" backHref="/dashboard/compras" />;
}
