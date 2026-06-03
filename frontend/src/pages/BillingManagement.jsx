import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import DashboardLayout from '@/shared/layouts/DashboardLayout.jsx';
import BillingFilters from '../components/billing/BillingFilters.jsx';
import BillingStatCards from '../components/billing/BillingStatCards.jsx';
import GenerateInvoiceModal from '../components/billing/GenerateInvoiceModal.jsx';
import InvoiceDetailDrawer from '../components/billing/InvoiceDetailDrawer.jsx';
import InvoiceTable from '../components/billing/InvoiceTable.jsx';
import RecordPaymentModal from '../components/billing/RecordPaymentModal.jsx';
import RevenueSummaryPanel from '../components/billing/RevenueSummaryPanel.jsx';
import {
  createInvoice,
  downloadInvoicePDF,
  getBillingStats,
  getCompletedAppointments,
  getInvoiceById,
  getInvoices,
  getRevenueSummary,
  recordPayment,
  updateInvoice,
} from '../api/billing.js';
import { parseLocalDateFromISO, toISOInputValue, todayISOInPakistan } from '../utils/isoDate.js';
import { adminRefreshMatchesScopes, subscribeAdminRealtime } from '../utils/adminRealtimeClient.js';

const startOfMonth = () => {
  const d = parseLocalDateFromISO(todayISOInPakistan()) || new Date();
  d.setDate(1);
  return toISOInputValue(d);
};

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

function BillingManagement() {
  const token = localStorage.getItem('careconnect360_token');

  const [stats, setStats] = useState({});
  const [revenueSummary, setRevenueSummary] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 10 });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    from: startOfMonth(),
    to: todayISOInPakistan(),
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
  const [generateMode, setGenerateMode] = useState('create');
  const [completedFilters, setCompletedFilters] = useState({
    search: '',
    from: startOfMonth(),
    to: todayISOInPakistan(),
    page: 1,
    limit: 10,
  });
  const [completedData, setCompletedData] = useState({ appointments: [], pagination: {} });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(defaultInvoiceForm);
  const [invoiceErrors, setInvoiceErrors] = useState({});
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amountReceived: '',
    paymentMethod: '',
    paymentDate: todayISOInPakistan(),
    notes: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

  const totals = useMemo(() => {
    const subtotal = (invoiceForm.items || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    const discount = Number(invoiceForm.discount || 0);
    const taxPercent = Number(invoiceForm.taxPercent || 0);
    const taxable = Math.max(0, subtotal - discount);
    const taxAmount = (taxable * taxPercent) / 100;
    const totalAmount = taxable + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  }, [invoiceForm.items, invoiceForm.discount, invoiceForm.taxPercent]);

  useEffect(() => {
    setInvoiceForm((prev) => ({ ...prev, totals }));
  }, [totals]);

  const fetchStats = useCallback(async () => {
    const response = await getBillingStats();
    setStats(response.data?.data || {});
  }, []);

  const fetchSummary = useCallback(async () => {
    const response = await getRevenueSummary();
    setRevenueSummary(response.data?.data || {});
  }, []);

  const fetchInvoices = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await getInvoices(filters);
      setInvoices(response.data?.data?.invoices || []);
      setPagination(response.data?.data?.pagination || { total: 0, page: 1, pages: 1, limit: 10 });
    } catch (error) {
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

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchInvoices(), fetchStats(), fetchSummary()]);
  }, [fetchInvoices, fetchStats, fetchSummary]);

  const refreshAllRef = useRef(refreshAll);
  refreshAllRef.current = refreshAll;

  useEffect(() => {
    return subscribeAdminRealtime((payload) => {
      if (adminRefreshMatchesScopes(payload, ['billing'])) {
        refreshAllRef.current().catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    refreshAll().catch(() => toast.error('Failed to load invoices'));
  }, [refreshAll]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (loading) return;
    fetchInvoices();
  }, [filters.search, filters.status, filters.from, filters.to, filters.page, filters.limit, filters.patientId, fetchInvoices, loading]);

  useEffect(() => {
    if (!generateOpen || generateMode === 'edit') return;
    fetchCompleted().catch(() => {});
  }, [generateOpen, generateMode, fetchCompleted]);

  const resetGenerate = () => {
    setGenerateOpen(false);
    setGenerateMode('create');
    setSelectedAppointment(null);
    setEditingInvoiceId(null);
    setInvoiceForm(defaultInvoiceForm);
    setInvoiceErrors({});
  };

  const openView = async (invoice) => {
    setDrawerOpen(true);
    setSelectedInvoice(null);
    try {
      const response = await getInvoiceById(invoice._id);
      setSelectedInvoice(response.data?.data || null);
    } catch (error) {
      setDrawerOpen(false);
      toast.error('Failed to load invoice');
    }
  };

  const openEdit = async (invoice) => {
    try {
      const response = await getInvoiceById(invoice._id);
      const row = response.data?.data;
      setGenerateMode('edit');
      setEditingInvoiceId(row._id);
      setSelectedAppointment(row.appointmentId ? { ...row.appointmentId, patientId: row.patientId, doctorId: row.doctorId } : null);
      setInvoiceForm({
        invoiceNumber: row.invoiceNumber,
        patientName: row.patientId?.name || '',
        doctorName: row.doctorId?.name || '',
        appointmentDate: row.appointmentId?.date || '',
        appointmentTime: row.appointmentId?.timeSlot || '',
        items: row.items?.map((item) => ({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice })) || [{ description: '', quantity: 1, unitPrice: '' }],
        discount: row.discount ?? '',
        taxPercent: row.taxPercent ?? '',
        paymentStatus: row.paymentStatus || 'Unpaid',
        paymentMethod: row.paymentMethod || '',
        paidAmount: row.paidAmount || 0,
        notes: row.notes || '',
        totals: { subtotal: row.subtotal || 0, taxAmount: row.taxAmount || 0, totalAmount: row.totalAmount || 0 },
      });
      setGenerateOpen(true);
    } catch (error) {
      toast.error('Failed to load invoice');
    }
  };

  const validateInvoice = () => {
    const errors = {};
    const validItems = (invoiceForm.items || []).filter((item) => String(item.description || '').trim().length >= 2 && Number(item.unitPrice) >= 0);
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
    if (!validateInvoice()) return;
    const payload = {
      appointmentId: selectedAppointment?._id || selectedAppointment?.appointmentId || selectedAppointment?.id,
      items: (invoiceForm.items || []).map((item) => ({ description: item.description, quantity: Number(item.quantity || 1), unitPrice: Number(item.unitPrice || 0) })),
      discount: Number(invoiceForm.discount || 0),
      taxPercent: Number(invoiceForm.taxPercent || 0),
      paymentStatus: invoiceForm.paymentStatus,
      paymentMethod: ['Paid', 'Partial'].includes(invoiceForm.paymentStatus) ? invoiceForm.paymentMethod : undefined,
      paidAmount: invoiceForm.paymentStatus === 'Paid' ? totals.totalAmount : Number(invoiceForm.paidAmount || 0),
      notes: invoiceForm.notes,
    };
    try {
      setInvoiceSaving(true);
      let response;
      if (generateMode === 'edit' && editingInvoiceId) {
        response = await updateInvoice(editingInvoiceId, payload);
      } else {
        response = await createInvoice(payload);
      }
      if (generateMode === 'edit') {
        toast.success('Invoice updated successfully');
      } else {
        const invoiceNo = response?.data?.data?.invoiceNumber;
        toast.success(`Invoice ${invoiceNo || ''} generated successfully`.trim());
      }
      resetGenerate();
      await refreshAll();
    } catch (error) {
      const message = error.response?.data?.message || '';
      if (/already exists/i.test(message)) {
        setInvoiceErrors((prev) => ({ ...prev, items: 'Invoice already exists for this appointment' }));
      } else if (/cannot exceed total/i.test(message)) {
        setInvoiceErrors((prev) => ({ ...prev, payment: 'Paid amount exceeds total' }));
      } else if (/Only unpaid invoices can be edited/i.test(message)) {
        setInvoiceErrors((prev) => ({ ...prev, payment: 'Cannot edit a paid invoice' }));
      } else {
        toast.error('Failed to load invoices');
      }
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
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  const openPayment = (invoice) => {
    setPaymentInvoice(invoice);
    setPaymentForm({
      amountReceived: '',
      paymentMethod: '',
      paymentDate: todayISOInPakistan(),
      notes: '',
    });
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
      toast.success(`Payment of Rs. ${Number(paymentForm.amountReceived || 0).toLocaleString()} recorded successfully`);
      setPaymentOpen(false);
      setPaymentInvoice(null);
      await refreshAll();
      if (selectedInvoice?._id === paymentInvoice._id) {
        const fresh = await getInvoiceById(paymentInvoice._id);
        setSelectedInvoice(fresh.data?.data || null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Server error — please try again');
    } finally {
      setPaymentSaving(false);
    }
  };

  if (!token) return <Navigate to="/login" replace />;

  return (
    <>
      <DashboardLayout title="Billing & Invoices">
        <BillingStatCards stats={stats} />
        <div className="grid gap-4 xl:grid-cols-[1.9fr_1fr]">
          <div className="space-y-4">
            <BillingFilters
              filters={filters}
              setFilters={setFilters}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              onOpenGenerate={() => {
                setGenerateMode('create');
                setGenerateOpen(true);
              }}
            />
            <InvoiceTable
              invoices={invoices}
              loading={loading}
              tableLoading={tableLoading}
              pagination={pagination}
              filters={filters}
              setFilters={setFilters}
              onRefresh={refreshAll}
              onView={openView}
              onDownload={handleDownload}
              onRecordPayment={openPayment}
              onEdit={openEdit}
            />
          </div>
          <RevenueSummaryPanel
            summary={revenueSummary}
            onSelectPatient={(patientId) => setFilters((prev) => ({ ...prev, patientId, page: 1 }))}
          />
        </div>
      </DashboardLayout>

      <GenerateInvoiceModal
        open={generateOpen}
        onClose={resetGenerate}
        mode={generateMode}
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
        onEdit={openEdit}
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

export default BillingManagement;
