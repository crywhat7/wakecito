import { ProductCreateClient } from "@/components/dashboard/product-create-client";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductCreateClient productId={id} />;
}
