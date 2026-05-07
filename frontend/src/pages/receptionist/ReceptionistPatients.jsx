import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { createPatient, getPatientById, getPatients, updatePatient } from '../../api/patients.js';
import { requestPortalAccess } from '../../api/portalAccess.js';
import AddPatientModal from '../../components/patients/AddPatientModal.jsx';
import EditPatientModal from '../../components/patients/EditPatientModal.jsx';
import PatientDetailDrawer from '../../components/patients/PatientDetailDrawer.jsx';
import PatientSearchBar from '../../components/patients/PatientSearchBar.jsx';
import PatientTable from '../../components/patients/PatientTable.jsx';
import ReceptionistLayout from '../../components/receptionist/ReceptionistLayout.jsx';

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

function ReceptionistPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [modalState, setModalState] = useState({ add: false, edit: false, view: false });
  const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [requestingPortalAccess, setRequestingPortalAccess] = useState(false);

  const fetchAll = useCallback(async () => {
    setTableLoading(true);
    try {
      const patientsRes = await getPatients(filters);
      const tableData = patientsRes.data?.data || {};
      setPatients(tableData.patients || []);
      setPagination(tableData.pagination || { total: 0, page: 1, pages: 1, limit: 10 });
    } catch {
      toast.error('Failed to load patients');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const timer = setTimeout(() => setFilters((prev) => ({ ...prev, search: searchInput, page: 1 })), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openView = async (patient) => {
    try {
      const response = await getPatientById(patient._id);
      setSelectedPatient(response.data?.data?.patient || null);
      setModalState((prev) => ({ ...prev, view: true }));
    } catch {
      toast.error('Failed to load patient');
    }
  };

  const openEdit = async (patient) => {
    try {
      const response = await getPatientById(patient._id);
      setSelectedPatient(response.data?.data?.patient || null);
      setModalState((prev) => ({ ...prev, edit: true }));
    } catch {
      toast.error('Failed to load patient');
    }
  };

  const handleAddSubmit = async (formData, helpers) => {
    try {
      setCreateSaving(true);
      const created = await createPatient(normalizePatientPayload(formData));
      const createdPatientId = created.data?.data?.patient?._id || created.data?.data?._id || null;
      const portalRequested = Boolean(helpers?.portalAccess?.requested);
      if (portalRequested && createdPatientId) {
        try {
          await requestPortalAccess({
            patientId: createdPatientId,
            requestedEmail: helpers.portalAccess.email,
          });
          toast.success('Patient registered. Portal access request submitted for admin approval.');
        } catch (portalError) {
          if (portalError.response?.status === 409) {
            helpers?.setPortalAccessError?.('This email is already registered');
            return false;
          }
          toast.success('Patient registered successfully');
          toast.warning('Portal access request could not be submitted. Try again from patient details.');
        }
      } else {
        toast.success('Patient registered successfully');
      }
      await fetchAll();
      return true;
    } catch (error) {
      if (error.response?.status === 409 && /phone/i.test(error.response?.data?.message || '')) {
        helpers?.setErrors?.((prev) => ({ ...prev, phone: 'Phone number already registered' }));
      } else {
        toast.error('Failed to register patient');
      }
      return false;
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEditSubmit = async (formData, helpers) => {
    if (!selectedPatient?._id) return false;
    try {
      setEditSaving(true);
      await updatePatient(selectedPatient._id, normalizePatientPayload(formData));
      if (helpers?.portalAccess?.requested) {
        try {
          await requestPortalAccess({
            patientId: selectedPatient._id,
            requestedEmail: helpers.portalAccess.email,
          });
          toast.success('Portal access request submitted');
        } catch (portalError) {
          if (portalError.response?.status === 409) {
            helpers?.setPortalAccessError?.(
              /already has a portal/i.test(portalError.response?.data?.message || '')
                ? 'Patient already has portal access'
                : 'This email is already registered'
            );
            return false;
          }
          toast.success('Patient updated successfully');
          toast.warning('Portal access request could not be submitted.');
        }
      } else {
        toast.success('Patient updated successfully');
      }
      setModalState((prev) => ({ ...prev, edit: false }));
      await fetchAll();
      return true;
    } catch {
      toast.error('Failed to update patient');
      return false;
    } finally {
      setEditSaving(false);
    }
  };

  const handlePortalAccessFromDrawer = async (patient, email, done) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      toast.warning('Please enter a valid portal email');
      return;
    }
    try {
      setRequestingPortalAccess(true);
      await requestPortalAccess({ patientId: patient._id, requestedEmail: String(email).trim().toLowerCase() });
      toast.success('Portal access request submitted');
      const fresh = await getPatientById(patient._id);
      setSelectedPatient(fresh.data?.data?.patient || patient);
      done?.();
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit portal access request');
    } finally {
      setRequestingPortalAccess(false);
    }
  };

  const content = useMemo(() => (
    <>
      <PatientSearchBar
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        statusValue={filters.status}
        onStatusChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
        onAddClick={() => setModalState((prev) => ({ ...prev, add: true }))}
      />
      <PatientTable
        patients={patients}
        loading={loading}
        tableLoading={tableLoading}
        pagination={pagination}
        filters={filters}
        onPageChange={(nextPage) => setFilters((prev) => ({ ...prev, page: nextPage }))}
        onLimitChange={(nextLimit) => setFilters((prev) => ({ ...prev, limit: nextLimit, page: 1 }))}
        onView={openView}
        onEdit={openEdit}
        onArchive={() => {}}
        showArchive={false}
      />
    </>
  ), [searchInput, filters, patients, loading, tableLoading, pagination]);

  return (
    <>
      <ReceptionistLayout title="Patients">
        {content}
      </ReceptionistLayout>

      <AddPatientModal open={modalState.add} onClose={() => setModalState((prev) => ({ ...prev, add: false }))} onSubmit={handleAddSubmit} saving={createSaving} />
      <EditPatientModal open={modalState.edit} patient={selectedPatient} onClose={() => setModalState((prev) => ({ ...prev, edit: false }))} onSubmit={handleEditSubmit} saving={editSaving} />
      <PatientDetailDrawer
        patient={selectedPatient}
        open={modalState.view}
        onClose={() => setModalState((prev) => ({ ...prev, view: false }))}
        onEdit={() => setModalState((prev) => ({ ...prev, view: false, edit: true }))}
        onArchive={() => {}}
        onRequestPortalAccess={handlePortalAccessFromDrawer}
        requestingPortalAccess={requestingPortalAccess}
        showArchive={false}
      />
    </>
  );
}

export default ReceptionistPatients;

