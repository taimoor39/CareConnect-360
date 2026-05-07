import { formatDate, formatDateTime } from '../../utils/dateHelpers.js';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const statusClass = {
  Paid: 'bg-emerald-500/15 text-emerald-200',
  Unpaid: 'bg-rose-500/15 text-rose-200',
  Partial: 'bg-amber-500/15 text-amber-200',
};

function InvoiceDetailDrawer({ open, invoice, onClose, onDownload, onRecordPayment, onEdit, showEdit = true }) {
  if (!open) return null;
  const due = Number(invoice?.totalAmount || 0) - Number(invoice?.paidAmount || 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-800 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-mono text-lg text-teal-300">{invoice?.invoiceNumber || 'Invoice'}</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800">&times;</button>
        </div>
        {invoice ? (
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[invoice.paymentStatus] || statusClass.Unpaid}`}>{invoice.paymentStatus}</span>
              <span className="text-slate-400">Generated on: {formatDateTime(invoice.createdAt)}</span>
            </div>
            <section className="rounded-lg border border-slate-700 p-3">
              <p className="font-semibold text-white">CareConnect 360</p>
              <p className="text-xs text-slate-400">Healthcare CRM System</p>
            </section>
            <section className="rounded-lg border border-slate-700 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Bill To</p>
              <p className="mt-1 text-slate-200">{invoice.patientId?.name || '--'}</p>
              <p className="text-xs text-slate-400">Code: {invoice.patientId?.patientId || '--'}</p>
              <p className="text-xs text-slate-400">Phone: {invoice.patientId?.phone || '--'} | Email: {invoice.patientId?.email || '--'}</p>
            </section>
            <section className="rounded-lg border border-slate-700 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Service By</p>
              <p className="mt-1 text-slate-200">Dr. {invoice.doctorId?.name || '--'} - {invoice.doctorSpecialization || '--'}</p>
              <p className="text-xs text-slate-400">Appointment: {invoice.appointmentId?.date ? formatDate(invoice.appointmentId.date) : '--'} at {invoice.appointmentId?.timeSlot || '--'}</p>
            </section>
            <section className="rounded-lg border border-slate-700 p-3">
              <table className="min-w-full text-xs">
                <thead className="text-slate-400">
                  <tr><th className="py-1 text-left">#</th><th className="py-1 text-left">Description</th><th className="py-1 text-left">Qty</th><th className="py-1 text-left">Unit</th><th className="py-1 text-left">Total</th></tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((item, idx) => (
                    <tr key={`item-${idx}`} className={idx % 2 ? 'bg-white/5' : ''}>
                      <td className="py-1">{idx + 1}</td>
                      <td className="py-1">{item.description}</td>
                      <td className="py-1">{item.quantity}</td>
                      <td className="py-1">{money(item.unitPrice)}</td>
                      <td className="py-1">{money(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="ml-auto w-full max-w-xs text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><span>{money(invoice.subtotal)}</span></div>
              {invoice.discount > 0 ? <div className="mt-1 flex justify-between"><span>Discount:</span><span>{money(invoice.discount)}</span></div> : null}
              {invoice.taxAmount > 0 ? <div className="mt-1 flex justify-between"><span>Tax:</span><span>{money(invoice.taxAmount)}</span></div> : null}
              <div className="mt-2 border-t border-slate-700 pt-2 text-base font-semibold text-teal-300">TOTAL: {money(invoice.totalAmount)}</div>
              <div className="mt-1 flex justify-between text-emerald-300"><span>Paid:</span><span>{money(invoice.paidAmount)}</span></div>
              {due > 0 ? <div className="mt-1 flex justify-between text-amber-300"><span>Due:</span><span>{money(due)}</span></div> : null}
            </section>
            <section className="rounded-lg border border-slate-700 p-3 text-xs text-slate-300">
              <p>Method: {invoice.paymentMethod || '--'}</p>
              <p>Status: {invoice.paymentStatus}</p>
              <p>Paid on: {invoice.paidAt ? formatDate(invoice.paidAt) : '--'}</p>
            </section>
          </div>
        ) : <p className="mt-6 text-slate-400">Loading invoice...</p>}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-700 pt-3">
          <button type="button" onClick={() => onDownload(invoice)} className="rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900">Download PDF</button>
          {invoice && ['Unpaid', 'Partial'].includes(invoice.paymentStatus) ? <button type="button" onClick={() => onRecordPayment(invoice)} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100">Record Payment</button> : null}
          {showEdit && invoice?.paymentStatus === 'Unpaid' ? <button type="button" onClick={() => onEdit(invoice)} className="rounded-md border border-slate-500/30 px-3 py-1.5 text-xs text-slate-200">Edit Invoice</button> : null}
        </div>
      </aside>
    </div>
  );
}

export default InvoiceDetailDrawer;
