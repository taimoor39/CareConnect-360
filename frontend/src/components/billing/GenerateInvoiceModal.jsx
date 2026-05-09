import { formatDate } from '../../utils/dateHelpers.js';
import DateDropdown from '../ui/DateDropdown.jsx';
import DateFieldCard from '../ui/DateFieldCard.jsx';
import InvoiceItemsForm from './InvoiceItemsForm.jsx';
import InvoiceTotals from './InvoiceTotals.jsx';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function GenerateInvoiceModal({
  open,
  onClose,
  mode = 'create',
  completedData,
  completedFilters,
  setCompletedFilters,
  selectedAppointment,
  setSelectedAppointment,
  invoiceForm,
  setInvoiceForm,
  errors,
  saving,
  onSubmit,
}) {
  if (!open) return null;

  const step = mode === 'edit' ? 2 : (selectedAppointment ? 2 : 1);
  const totals = invoiceForm.totals || { subtotal: 0, taxAmount: 0, totalAmount: 0 };

  return (
    <div className="care-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="care-modal-panel care-modal-panel--2xl" onClick={(e) => e.stopPropagation()}>
        <header className="care-modal-header">
          <h2 className="care-modal-title">{mode === 'edit' ? `Edit invoice — ${invoiceForm.invoiceNumber || ''}` : 'Generate invoice'}</h2>
          <button type="button" className="care-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="care-modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {step === 1 ? (
            <div>
              <p className="text-sm font-medium text-slate-200">Select completed appointment</p>
              <p className="mt-0.5 text-xs text-slate-500">Search and set the appointment date window (from → to).</p>
              <div className="mt-3 space-y-3">
                <input
                  value={completedFilters.search}
                  onChange={(e) => setCompletedFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                  placeholder="Patient name, code, or date…"
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none transition focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <DateFieldCard label="From" hint="Earliest appointment in range" accent="teal">
                    <DateDropdown
                      value={completedFilters.from}
                      onChange={(iso) => setCompletedFilters((prev) => ({ ...prev, from: iso, page: 1 }))}
                      yearFrom={2020}
                      yearTo={2030}
                      monthFormat="short"
                      placeholder={['Day', 'Mo', 'Year']}
                    />
                  </DateFieldCard>
                  <DateFieldCard label="To" hint="Latest appointment in range" accent="sky">
                    <DateDropdown
                      value={completedFilters.to}
                      onChange={(iso) => setCompletedFilters((prev) => ({ ...prev, to: iso, page: 1 }))}
                      yearFrom={2020}
                      yearTo={2030}
                      monthFormat="short"
                      placeholder={['Day', 'Mo', 'Year']}
                    />
                  </DateFieldCard>
                </div>
              </div>
              <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-700/70">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
                    <tr>
                      <th className="px-3 py-2">Patient</th>
                      <th className="px-3 py-2">Doctor</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(completedData.appointments || []).map((appt) => (
                      <tr key={appt._id} className="border-b border-slate-800/60">
                        <td className="px-3 py-2">{appt.patientId?.name || '--'}</td>
                        <td className="px-3 py-2">Dr. {appt.doctorId?.name || '--'}</td>
                        <td className="px-3 py-2">{formatDate(appt.date)}</td>
                        <td className="px-3 py-2">{appt.timeSlot || '--'}</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => setSelectedAppointment(appt)} className="rounded-md bg-teal-500 px-2.5 py-1 text-[11px] font-semibold text-slate-900">Select</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(completedData.appointments || []).length === 0 ? <p className="px-3 py-4 text-center text-slate-400">No completed appointments without invoices</p> : null}
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" disabled={!selectedAppointment} onClick={() => {}} className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-50">Next →</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
                <p>Patient: {selectedAppointment?.patientId?.name || invoiceForm.patientName || '--'} | Doctor: Dr. {selectedAppointment?.doctorId?.name || invoiceForm.doctorName || '--'} | Appointment: {selectedAppointment?.date ? formatDate(selectedAppointment.date) : invoiceForm.appointmentDate || '--'} {selectedAppointment?.timeSlot || invoiceForm.appointmentTime || ''}</p>
              </div>
              <InvoiceItemsForm
                items={invoiceForm.items || []}
                setItems={(updater) => setInvoiceForm((prev) => ({ ...prev, items: typeof updater === 'function' ? updater(prev.items || []) : updater }))}
                errors={errors}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div />
                <InvoiceTotals
                  totals={totals}
                  discount={invoiceForm.discount}
                  setDiscount={(value) => setInvoiceForm((prev) => ({ ...prev, discount: value }))}
                  taxPercent={invoiceForm.taxPercent}
                  setTaxPercent={(value) => setInvoiceForm((prev) => ({ ...prev, taxPercent: value }))}
                  error={errors.totals}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <select value={invoiceForm.paymentStatus} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, paymentStatus: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs">
                  <option value="">Payment Status *</option>
                  <option>Paid</option>
                  <option>Unpaid</option>
                  <option>Partial</option>
                </select>
                {invoiceForm.paymentStatus !== 'Unpaid' ? (
                  <select value={invoiceForm.paymentMethod} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs">
                    <option value="">Payment Method</option>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Online</option>
                    <option>Insurance</option>
                  </select>
                ) : <div />}
                {invoiceForm.paymentStatus === 'Partial' ? (
                  <input type="number" min={0} value={invoiceForm.paidAmount} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, paidAmount: e.target.value }))} placeholder="Amount Paid" className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
                ) : null}
                <textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes (optional)" rows={2} className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs" />
              </div>
              {(errors.items || errors.payment) ? (
                <p className="text-xs text-rose-300">{errors.items || errors.payment}</p>
              ) : null}
            </div>
          )}
        </div>
        <footer className="care-modal-footer">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 transition hover:bg-slate-800">Cancel</button>
          {step === 2 ? <button type="button" onClick={onSubmit} disabled={saving} className="h-9 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 transition hover:bg-teal-400 disabled:opacity-50">{saving ? 'Saving...' : 'Generate & Save Invoice'}</button> : null}
        </footer>
      </div>
    </div>
  );
}

export default GenerateInvoiceModal;
