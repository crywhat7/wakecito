-- Fecha tentativa de pago para ventas a crédito.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS credit_due_date date;
