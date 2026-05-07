import { formatDate, formatDateTime } from '../../utils/dateHelpers.js';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const statusClass = {
  Paid: 'bg-emerald-500/15 text-emerald-200',
  Unpaid: 'bg-rose-500/15 text-rose-200',
  Partial: 'bg-amber-500/15 text-amber-200',
};

function InvoiceTable({ invoices, loading, tableLoading, pagination, filters, setFilters, onRefresh, onView, onDownload, onRecordPayment, onEdit, showEdit = true }) {
  const showingStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const showingEnd = Math.min((pagination.page || 1) * (pagination.limit || 10), pagination.total || 0);
  return (
    <article className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="font-display text-xl text-white">Invoices</h2>
        <button type="button" onClick={onRefresh} className="rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900">Refresh</button>
      </div>
      <div className="relative overflow-x-auto">
        {tableLoading && !loading ? <div className="absolute inset-0 z-10 bg-slate-950/40" /> : null}
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading invoices...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No invoices found.</td></tr>
            ) : (
              invoices.map((invoice, index) => {
                const due = Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0);
                return (
                  <tr key={invoice._id} className={`${index % 2 ? 'bg-white/5' : ''} border-b border-slate-800/60`}>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onView(invoice)} className="font-mono text-teal-300 hover:underline">{invoice.invoiceNumber}</button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white">{invoice.patientId?.name || '--'}</p>
                      <p className="text-[11px] text-slate-400">{invoice.patientId?.patientId || '--'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white">Dr. {invoice.doctorId?.name || '--'}</p>
                      <p className="text-[11px] text-slate-400">{invoice.doctorSpecialization || '--'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white">{formatDate(invoice.createdAt)}</p>
                      <p className="text-[11px] text-slate-400">{formatDateTime(invoice.createdAt).split(',')[1]?.trim() || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{money(invoice.totalAmount)}</p>
                      {due <= 0 ? <p className="text-[11px] text-emerald-300">Paid: {money(invoice.paidAmount)}</p> : <p className="text-[11px] text-amber-300">Due: {money(due)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass[invoice.paymentStatus] || statusClass.Unpaid}`}>{invoice.paymentStatus}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => onView(invoice)} className="mr-1 rounded-md border border-sky-300/25 bg-sky-400/10 px-2 py-1 text-[11px] text-sky-100">View</button>
                      <button type="button" onClick={() => onDownload(invoice)} className="mr-1 rounded-md border border-slate-500/30 px-2 py-1 text-[11px] text-slate-200">Download PDF</button>
                      {['Unpaid', 'Partial'].includes(invoice.paymentStatus) ? <button type="button" onClick={() => onRecordPayment(invoice)} className="mr-1 rounded-md border border-teal-300/25 bg-teal-400/10 px-2 py-1 text-[11px] text-teal-100">Record Payment</button> : null}
                      {showEdit && invoice.paymentStatus === 'Unpaid' ? <button type="button" onClick={() => onEdit(invoice)} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-100">Edit</button> : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-3 text-xs text-slate-300 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <p>Showing {showingStart}-{showingEnd} of {pagination.total || 0} invoices</p>
          <label className="flex items-center gap-2">
            <span className="text-slate-400">Rows per page:</span>
            <select value={filters.limit} onChange={(event) => setFilters((prev) => ({ ...prev, page: 1, limit: Number(event.target.value) }))} className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={filters.page <= 1} onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))} className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40">← Prev</button>
          <span className="rounded-md bg-teal-400/20 px-3 py-1.5 text-teal-100 ring-1 ring-teal-300/30">{pagination.page || 1}</span>
          <button type="button" disabled={filters.page >= (pagination.pages || 1)} onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(pagination.pages || 1, prev.page + 1) }))} className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40">Next →</button>
        </div>
      </div>
    </article>
  );
}

export default InvoiceTable;
