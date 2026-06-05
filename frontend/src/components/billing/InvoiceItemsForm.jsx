const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function InvoiceItemsForm({ items = [], setItems, errors = {} }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Billing Items</p>
      <div className="mt-2 space-y-2">
        {items.map((item, idx) => (
          <div key={`item-${idx}`} className="grid gap-2 md:grid-cols-5">
            <input
              value={item.description}
              onChange={(e) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it)))}
              placeholder="Description *"
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100"
            />
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => {
                const raw = e.target.value;
                setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: raw } : it)));
              }}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100"
            />
            <input
              type="number"
              min={0}
              value={item.unitPrice}
              onChange={(e) => {
                const raw = e.target.value;
                setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unitPrice: raw } : it)));
              }}
              placeholder="Unit Price *"
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100"
            />
            <input value={money(Number(item.quantity || 0) * Number(item.unitPrice || 0))} readOnly className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-300" />
            <button
              type="button"
              disabled={items.length <= 1}
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
              className="rounded-lg border border-rose-300/30 px-3 py-2 text-xs text-rose-200 disabled:opacity-40"
            >
              × Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: '' }])} className="mt-2 rounded-lg border border-teal-300/25 px-3 py-1.5 text-xs text-teal-200">+ Add Item</button>
      {errors.items ? <p className="mt-1 text-[11px] text-rose-300">{errors.items}</p> : null}
    </div>
  );
}

export default InvoiceItemsForm;
