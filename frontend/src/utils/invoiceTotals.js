/** Mirror backend billingService.buildAmounts totals (display-only; server recalculates on save). */
export function buildInvoiceTotals(items = [], discountInput = '', taxPercentInput = '') {
  const subtotal = (items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  );
  const discount = Number(discountInput || 0);
  const taxPercent = Number(taxPercentInput || 0);
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = (taxable * taxPercent) / 100;
  const totalAmount = taxable + taxAmount;
  return { subtotal, taxAmount, totalAmount };
}
