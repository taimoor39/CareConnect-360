import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { createInvoice, downloadInvoicePDF, getCompletedAppointments, getInvoiceById, getInvoices, recordPayment } from '../../api/billing.js';
import BillingFilters from '../../components/billing/BillingFilters.jsx';
import GenerateInvoiceModal from '../../components/billing/GenerateInvoiceModal.jsx';
import InvoiceDetailDrawer from '../../components/billing/InvoiceDetailDrawer.jsx';
import InvoiceTable from '../../components/billing/InvoiceTable.jsx';
import RecordPaymentModal from '../../components/billing/RecordPaymentModal.jsx';
import ReceptionistLayout from '@/shared/layouts/ReceptionistLayout.jsx';
import { buildInvoiceTotals } from '../../utils/invoiceTotals.js';
import { firstOfMonthISOInPakistan, todayISOInPakistan } from '../../utils/isoDate.js';

const defaultInvoiceForm = {
  invoiceNumber: '',
  patientName: '',
  doctorName: '',
  appointmentDate: '',
  appointmentTime: '',
  items: [{ description: 'Consultation Fee', quantity: 1, unitPrice: '' }],
  discount: '',
  taxPercent: '',
  paymentStatus: '',
  paymentMethod: '',
  paidAmount: '',
  notes: '',
};

function ReceptionistBilling() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 10 });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    patientId: '',
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [completedFilters, setCompletedFilters] = useState({
    search: '',
    from: firstOfMonthISOInPakistan(),
    to: todayISOInPakistan(),
    page: 1,
    limit: 10,
  });
  const [completedData, setCompletedData] = useState({ appointments: [], pagination: {} });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(defaultInvoiceForm);
  const [invoiceErrors, setInvoiceErrors] = useState({});
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amountReceived: '',
    paymentMethod: '',
    paymentDate: todayISOInPakistan(),
    notes: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

  const totals = useMemo(
    () => buildInvoiceTotals(invoiceForm.items, invoiceForm.discount, invoiceForm.taxPercent),
    [invoiceForm.items, invoiceForm.discount, invoiceForm.taxPercent],
  );

  useEffect(() => {
    setInvoiceForm((prev) => ({ ...prev, totals }));
  }, [totals]);

  const fetchInvoices = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await getInvoices(filters);
      setInvoices(response.data?.data?.invoices || []);
      setPagination(response.data?.data?.pagination || { total: 0, page: 1, pages: 1, limit: 10 });
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [filters]);

  const fetchCompleted = useCallback(async () => {
    const response = await getCompletedAppointments(completedFilters);
    setCompletedData(response.data?.data || { appointments: [], pagination: {} });
  }, [completedFilters]);

  useEffect(() => {
    fetchInvoices().catch(() => toast.error('Failed to load invoices'));
  }, [fetchInvoices]);

  useEffect(() => {
    const timer = setTimeout(() => setFilters((prev) => ({ ...prev, search: searchInput, page: 1 })), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!generateOpen) return;
    fetchCompleted().catch(() => {});
  }, [generateOpen, fetchCompleted]);

  const openView = async (invoice) => {
    setDrawerOpen(true);
    setSelectedInvoice(null);
    try {
      const response = await getInvoiceById(invoice._id);
      setSelectedInvoice(response.data?.data || null);
    } catch {
      setDrawerOpen(false);
      toast.error('Failed to load invoice');
    }
  };

  const validateInvoice = () => {
    const errors = {};
    const validItems = (invoiceForm.items || []).filter(
      (item) => String(item.description || '').trim().length >= 2 && Number(item.unitPrice) >= 0,
    );
    if (validItems.length === 0) errors.items = 'At least 1 valid billing item is required';
    if (Number(invoiceForm.discount || 0) > totals.subtotal) {
      errors.totals = `Discount cannot exceed subtotal (Rs. ${totals.subtotal.toLocaleString()})`;
    }
    if (Number(invoiceForm.taxPercent || 0) < 0 || Number(invoiceForm.taxPercent || 0) > 100) {
      errors.totals = 'Tax must be between 0% and 100%';
    }
    if (!invoiceForm.paymentStatus) errors.payment = 'Payment status is required';
    if (['Paid', 'Partial'].includes(invoiceForm.paymentStatus) && !invoiceForm.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }
    if (invoiceForm.paymentStatus === 'Partial') {
      const paid = Number(invoiceForm.paidAmount || 0);
      if (paid <= 0) {
        errors.paidAmount = 'Paid amount is required';
      } else if (paid >= totals.totalAmount) {
        errors.paidAmount = 'For full payment, select Paid status';
      }
    }
    setInvoiceErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitInvoice = async () => {
    if (!selectedAppointment) {
      setInvoiceErrors({ items: 'Select an appointment first' });
      return;
    }
    if (!validateInvoice()) return;
    try {
      setInvoiceSaving(true);
      await createInvoice({
        appointmentId: selectedAppointment._id,
        items: (invoiceForm.items || []).map((item) => ({
          description: item.description,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
        })),
        discount: Number(invoiceForm.discount || 0),
        taxPercent: Number(invoiceForm.taxPercent || 0),
        paymentStatus: invoiceForm.paymentStatus,
        paymentMethod: ['Paid', 'Partial'].includes(invoiceForm.paymentStatus)
          ? invoiceForm.paymentMethod
          : undefined,
        paidAmount:
          invoiceForm.paymentStatus === 'Paid'
            ? totals.totalAmount
            : Number(invoiceForm.paidAmount || 0),
        notes: invoiceForm.notes,
      });
      toast.success('Invoice generated successfully');
      setGenerateOpen(false);
      setSelectedAppointment(null);
      setInvoiceForm(defaultInvoiceForm);
      await fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    } finally {
      setInvoiceSaving(false);
    }
  };

  const handleDownload = async (invoice) => {
    try {
      const response = await downloadInvoicePDF(invoice._id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  const openPayment = (invoice) => {
    setPaymentInvoice(invoice);
    setPaymentForm({ amountReceived: '', paymentMethod: '', paymentDate: todayISOInPakistan(), notes: '' });
    setPaymentOpen(true);
  };

  const submitPayment = async () => {
    if (!paymentInvoice) return;
    try {
      setPaymentSaving(true);
      await recordPayment(paymentInvoice._id, {
        amountReceived: Number(paymentForm.amountReceived || 0),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
      });
      toast.success('Payment recorded successfully');
      setPaymentOpen(false);
      await fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaymentSaving(false);
    }
  };

  return (
    <>
      <ReceptionistLayout title="Billing">
        <BillingFilters
          filters={filters}
          setFilters={setFilters}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          hideDateRange
          onOpenGenerate={() => setGenerateOpen(true)}
        />
        <InvoiceTable
          invoices={invoices}
          loading={loading}
          tableLoading={tableLoading}
          pagination={pagination}
          filters={filters}
          setFilters={setFilters}
          onRefresh={fetchInvoices}
          onView={openView}
          onDownload={handleDownload}
          onRecordPayment={openPayment}
          onEdit={() => {}}
          showEdit={false}
        />
      </ReceptionistLayout>

      <GenerateInvoiceModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        mode="create"
        completedData={completedData}
        completedFilters={completedFilters}
        setCompletedFilters={setCompletedFilters}
        selectedAppointment={selectedAppointment}
        setSelectedAppointment={setSelectedAppointment}
        invoiceForm={invoiceForm}
        setInvoiceForm={setInvoiceForm}
        errors={invoiceErrors}
        saving={invoiceSaving}
        onSubmit={submitInvoice}
      />

      <InvoiceDetailDrawer
        open={drawerOpen}
        invoice={selectedInvoice}
        onClose={() => setDrawerOpen(false)}
        onDownload={handleDownload}
        onRecordPayment={openPayment}
        onEdit={() => {}}
        showEdit={false}
      />
      <RecordPaymentModal
        open={paymentOpen}
        invoice={paymentInvoice}
        form={paymentForm}
        setForm={setPaymentForm}
        saving={paymentSaving}
        onClose={() => setPaymentOpen(false)}
        onSubmit={submitPayment}
      />
    </>
  );
}

export default ReceptionistBilling;
