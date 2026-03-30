-- Facturas POS: cabecera + líneas (snapshot de producto).
-- Ejecutar en Supabase SQL Editor si las tablas aún no existen.

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients (id) ON DELETE SET NULL,
  sale_date date NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  currency text NOT NULL DEFAULT 'HNL',
  subtotal_amount numeric(14, 2) NOT NULL DEFAULT 0,
  discount_amount numeric(14, 2) NOT NULL DEFAULT 0,
  tax_amount numeric(14, 2) NOT NULL DEFAULT 0,
  total_amount numeric(14, 2) NOT NULL DEFAULT 0,
  payment_method text,
  installments integer,
  invoice_number text,
  notes text,
  created_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_company_id_sale_date_idx
  ON invoices (company_id, sale_date DESC);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  product_id uuid REFERENCES products (id) ON DELETE SET NULL,
  product_name text NOT NULL,
  sku text,
  quantity numeric(14, 4) NOT NULL,
  unit_price numeric(14, 4) NOT NULL,
  line_total numeric(14, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_lines_invoice_line_unique UNIQUE (invoice_id, line_number)
);

CREATE INDEX IF NOT EXISTS invoice_lines_invoice_id_idx
  ON invoice_lines (invoice_id);

CREATE INDEX IF NOT EXISTS invoice_lines_product_id_idx
  ON invoice_lines (product_id);
