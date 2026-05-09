import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { archivePatient, createPatient, getPatientById, getPatients, getPatientStats, updatePatient } from '../api/patients.js';
import DashboardLayout from '@/shared/layouts/DashboardLayout.jsx';
import AddPatientModal from '../components/patients/AddPatientModal.jsx';
import EditPatientModal from '../components/patients/EditPatientModal.jsx';
import PatientDetailDrawer from '../components/patients/PatientDetailDrawer.jsx';
import PatientSearchBar from '../components/patients/PatientSearchBar.jsx';
import PatientStatCards from '../components/patients/PatientStatCards.jsx';
import PatientTable from '../components/patients/PatientTable.jsx';

function normalizePatientPayload(formData) {
  return {
    firstName: String(formData.firstName || '').trim(),
    lastName: String(formData.lastName || '').trim(),
    dateOfBirth: formData.dateOfBirth,
    gender: formData.gender,
    phone: String(formData.phone || '').trim(),
    email: String(formData.email || '').trim().toLowerCase(),
    bloodGroup: formData.bloodGroup || '',
    status: formData.status || 'Active',
    addressStreet: String(formData.addressStreet || '').trim(),
    city: String(formData.city || '').trim(),
    medicalNotes: String(formData.medicalNotes || '').trim(),
  };
}

function PatientManagement() {
  const token = localStorage.getItem('careconnect360_token');
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({ totalPatients: 0, activePatients: 0, inactivePatients: 0 });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [modalState, setModalState] = useState({ add: false, edit: false, view: false });
  const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 10 });

  const [searchInput, setSearchInput] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [inlineServerErrors, setInlineServerErrors] = useState({ add: {}, edit: {} });

  const fetchAll = useCallback(async () => {
    setTableLoading(true);
    try {
      const [patientsRes, statsRes] = await Promise.all([
        getPatients(filters),
        getPatientStats(),
      ]);

      const tableData = patientsRes.data?.data || {};
      const nextPatients = tableData.patients || [];
      const nextPagination = tableData.pagination || { total: 0, page: 1, pages: 1, limit: 10 };



      setPatients(nextPatients);
      setPagination(nextPagination);
      setStats(statsRes.data?.data || { totalPatients: 0, activePatients: 0, inactivePatients: 0 });
    } catch (err) {
      toast.error('Failed to load patients');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const openAddModal = () => {
    setInlineServerErrors((prev) => ({ ...prev, add: {} }));
    setModalState((prev) => ({ ...prev, add: true }));
  };

  const openView = async (patient) => {
    try {
      const response = await getPatientById(patient._id);
      setSelectedPatient(response.data?.data?.patient || null);
      setModalState((prev) => ({ ...prev, view: true }));
    } catch (error) {
      toast.error('Server error — please try again');
    }
  };

  const handleCreateLogin = async (patient) => {
    const ok = window.confirm(`Create a login account for ${patient.name || patient.firstName}?`);
    if (!ok) return;

    try {
      const { createUser } = await import('../api/users.js');
      await createUser({
        firstName: patient.firstName || patient.name?.split(' ')[0] || 'Patient',
        lastName: patient.lastName || patient.name?.split(' ').slice(1).join(' ') || 'User',
        email: patient.email || patient.contact?.email,
        phone: patient.phone || patient.contact?.phone || '0000000000',
        password: 'Password123!',
        role: 'patient',
        linkPatientId: patient._id
      });
      toast.success('Login account created and linked successfully');
      await fetchAll();
      setModalState((prev) => ({ ...prev, view: false }));
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('An account with this email already exists');
        return;
      }
      toast.error('Failed to create login account');
    }
  };

  const openEdit = async (patient) => {
    try {
      const response = await getPatientById(patient._id);
      setSelectedPatient(response.data?.data?.patient || null);
      setInlineServerErrors((prev) => ({ ...prev, edit: {} }));
      setModalState((prev) => ({ ...prev, edit: true }));
    } catch (error) {
      toast.error('Server error — please try again');
    }
  };

  const handleAddSubmit = async (formData, helpers) => {
    try {
      setCreateSaving(true);
      setInlineServerErrors((prev) => ({ ...prev, add: {} }));
      await createPatient(normalizePatientPayload(formData));
      toast.success('Patient registered successfully');
      await fetchAll();
      return true;
    } catch (error) {
      if (error.response?.status === 409 && /phone/i.test(error.response?.data?.message || '')) {
        helpers?.setErrors?.((prev) => ({ ...prev, phone: 'Phone number already registered' }));
        return false;
      }
      if (error.response?.status === 409 && /email/i.test(error.response?.data?.message || '')) {
        helpers?.setErrors?.((prev) => ({ ...prev, email: 'Enter a valid email address' }));
        return false;
      }
      toast.error('Server error — please try again');
      return false;
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEditSubmit = async (formData, helpers) => {
    if (!selectedPatient?._id) return false;

    try {
      setEditSaving(true);
      setInlineServerErrors((prev) => ({ ...prev, edit: {} }));
      await updatePatient(selectedPatient._id, normalizePatientPayload(formData));
      toast.success('Patient updated successfully');
      setModalState((prev) => ({ ...prev, edit: false }));
      await fetchAll();
      return true;
    } catch (error) {
      if (error.response?.status === 409 && /phone/i.test(error.response?.data?.message || '')) {
        helpers?.setErrors?.((prev) => ({ ...prev, phone: 'Phone number already registered' }));
        return false;
      }
      toast.error('Server error — please try again');
      return false;
    } finally {
      setEditSaving(false);
    }
  };

  const handleArchive = async (patient) => {
    const ok = window.confirm(
      `Archive ${patient.firstName || ''} ${patient.lastName || ''}?\nThis patient will be hidden from all active lists.\nTheir records and history will be preserved.\n[Cancel] [Archive Patient]`
    );
    if (!ok) return;

    try {
      await archivePatient(patient._id);
      toast.warning(`${(patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`).trim()} has been archived`);
      if (selectedPatient?._id === patient._id) {
        setModalState((prev) => ({ ...prev, view: false, edit: false }));
      }
      await fetchAll();
    } catch (error) {
      toast.error('Server error — please try again');
    }
  };

  const fullPageLoading = loading;

  const content = useMemo(() => {
    return (
      <>
        <PatientStatCards stats={stats} loading={fullPageLoading} />

        <PatientSearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          statusValue={filters.status}
          onStatusChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
          onAddClick={openAddModal}
        />

        <PatientTable
          patients={patients}
          loading={fullPageLoading}
          tableLoading={tableLoading}
          pagination={pagination}
          filters={filters}
          onPageChange={(nextPage) => setFilters((prev) => ({ ...prev, page: nextPage }))}
          onLimitChange={(nextLimit) => setFilters((prev) => ({ ...prev, limit: nextLimit, page: 1 }))}
          onView={openView}
          onEdit={openEdit}
          onArchive={handleArchive}
        />
      </>
    );
  }, [stats, fullPageLoading, searchInput, filters, patients, tableLoading, pagination]);

  return (
    <>
      <DashboardLayout title="Patient Management">
        {content}
      </DashboardLayout>

      <AddPatientModal
        open={modalState.add}
        onClose={() => setModalState((prev) => ({ ...prev, add: false }))}
        onSubmit={handleAddSubmit}
        saving={createSaving}
        serverErrors={inlineServerErrors.add}
      />

      <EditPatientModal
        open={modalState.edit}
        patient={selectedPatient}
        onClose={() => setModalState((prev) => ({ ...prev, edit: false }))}
        onSubmit={handleEditSubmit}
        saving={editSaving}
        serverErrors={inlineServerErrors.edit}
      />

      <PatientDetailDrawer
        patient={selectedPatient}
        open={modalState.view}
        onClose={() => setModalState((prev) => ({ ...prev, view: false }))}
        onEdit={() => setModalState((prev) => ({ ...prev, view: false, edit: true }))}
        onArchive={() => selectedPatient && handleArchive(selectedPatient)}
        onCreateLogin={handleCreateLogin}
      />

    </>
  );
}

export default PatientManagement;
