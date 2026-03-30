import { CrudCreateClient } from "@/components/dashboard/crud-create-client";

export default function ClientesNuevoPage() {
  return <CrudCreateClient table="clients" backHref="/dashboard/clientes" />;
}
