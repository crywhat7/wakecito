import { jsonOk } from "@/lib/api/response";
import { requireCrudAdmin } from "@/lib/crud/api-guard";
import { CRUD_TABLE_KEYS } from "@/lib/crud/registry";

const LABELS: Record<string, string> = {
  companies: "Empresas (tenant)",
  memberships: "Membresías",
  users: "Usuarios (mi empresa)",
  plans: "Planes",
  features: "Funcionalidades",
  plan_features: "Plan ↔ funcionalidad",
  clients: "Clientes",
  purchases: "Compras",
};

export async function GET() {
  const gate = await requireCrudAdmin();
  if (gate.error) {
    return gate.error;
  }
  return jsonOk({
    tables: CRUD_TABLE_KEYS.map((key) => ({
      key,
      label: LABELS[key] ?? key,
    })),
  });
}
