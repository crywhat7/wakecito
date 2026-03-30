/**
 * Número de factura legal (Honduras): primeros 10 caracteres del rango desde
 * + "-" + correlativo de 8 dígitos.
 */
export function buildLegalInvoiceNumber(
  rangeStart: string | null | undefined,
  sequence: number,
): string {
  const prefix = (rangeStart ?? "").trim().slice(0, 10);
  const n = Math.floor(Number(sequence));
  if (!Number.isFinite(n) || n < 1 || n > 99_999_999) {
    throw new Error("INVALID_SEQUENCE");
  }
  const suffix = String(n).padStart(8, "0");
  return `${prefix}-${suffix}`;
}

export function validateRangeStartForInvoice(rangeStart: string | null | undefined): boolean {
  return Boolean((rangeStart ?? "").trim());
}
