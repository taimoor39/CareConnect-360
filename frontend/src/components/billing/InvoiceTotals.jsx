const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function InvoiceTotals({ totals, discount, setDiscount, taxPercent, setTaxPercent, error }) {
  return (
    <div className="rounded-lg border border-slate-700 p-3 text-xs">
      <div className="flex justify-between"><span>Subtotal:</span><span>{money(totals.subtotal)}</span></div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span>Discount:</span>
        <input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span>Tax (%):</span>
        <input type="number" min={0} max={100} value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right" />
      </div>
      <div className="mt-2 flex justify-between text-slate-300">
        <span>Tax amount:</span>
        <span>{money(totals.taxAmount)}</span>
      </div>
      <div className="mt-3 border-t border-slate-700 pt-2 text-base font-semibold text-teal-300">TOTAL: {money(totals.totalAmount)}</div>
      {error ? <p className="mt-1 text-[11px] text-rose-300">{error}</p> : null}
    </div>
  );
}

export default InvoiceTotals;
