import DateDropdown from '../ui/DateDropdown.jsx';
import CareModal from '@/shared/components/CareModal.jsx';
import {
  currentYearInPakistan,
  todayISOInPakistan,
} from '../../utils/isoDate.js';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function RecordPaymentModal({ open, invoice, form, setForm, saving, onClose, onSubmit }) {
  if (!invoice) return null;
  const outstanding = Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0);
  const amount = Number(form.amountReceived || 0);
  const nextBalance = Math.max(0, outstanding - amount);
  const nextStatus = amount >= outstanding ? 'Paid' : 'Partial';
  const tooMuch = amount > outstanding;
  const minDate = todayISOInPakistan();
  const minYear = currentYearInPakistan();
  const maxYear = currentYearInPakistan() + 3;

  return (
    <CareModal
      open={open}
      onClose={onClose}
      title={`Record payment — ${invoice.invoiceNumber}`}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-600 px-4 text-xs text-slate-200 transition hover:bg-slate-800">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || tooMuch || !form.amountReceived || !form.paymentMethod || !form.paymentDate}
            onClick={onSubmit}
            className="h-9 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 transition hover:bg-teal-400 disabled:opacity-50"
          >
            {saving ? 'Recording…' : 'Record payment'}
          </button>
        </>
      }
    >
      <div className="text-xs text-slate-300">
        <p>Total Amount: {money(invoice.totalAmount)}</p>
        <p>Already Paid: {money(invoice.paidAmount)}</p>
        <p className="text-amber-300">Outstanding: {money(outstanding)}</p>
      </div>
      <div className="mt-3 grid gap-2">
        <input
          type="number"
          min={0.01}
          value={form.amountReceived}
          onChange={(e) => setForm((prev) => ({ ...prev, amountReceived: e.target.value }))}
          placeholder="Amount Received *"
          className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
        />
        <select
          value={form.paymentMethod}
          onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
          className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
        >
          <option value="">Payment Method *</option>
          <option>Cash</option>
          <option>Card</option>
          <option>Online</option>
          <option>Insurance</option>
        </select>
        <DateDropdown
          value={form.paymentDate}
          onChange={(iso) => setForm((prev) => ({ ...prev, paymentDate: iso }))}
          minDate={minDate}
          yearFrom={minYear}
          yearTo={maxYear}
          placeholder={['Day', 'Month', 'Year']}
        />
        <textarea
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          rows={2}
          placeholder="Notes (optional)"
          className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs"
        />
      </div>
      <div className="mt-2 text-[11px] text-slate-400">
        <p>Payment date is PKT-based and cannot be in the past.</p>
        <p>New balance: {money(nextBalance)}</p>
        <p>Will be marked as: {nextStatus}</p>
        {tooMuch ? <p className="text-rose-300">Max {money(outstanding)}</p> : null}
      </div>
    </CareModal>
  );
}

export default RecordPaymentModal;
