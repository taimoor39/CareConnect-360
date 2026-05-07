import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import AddUserModal from '../components/AddUserModal.jsx';
import EditUserModal from '../components/EditUserModal.jsx';
import UserStatCards from '../components/UserStatCards.jsx';
import UserTable from '../components/UserTable.jsx';
import { createUser, fetchUsers, sendUserResetEmail, setUserTempPassword, toggleUserStatus, updateUser } from '../api/users.js';
import {
  approvePortalAccess,
  getPortalAccessRequests,
  rejectPortalAccess,
  reopenPortalAccess,
  updatePortalRequestEmail,
} from '../api/portalAccess.js';
import ApproveRequestModal from '../components/portalAccess/ApproveRequestModal.jsx';
import EditEmailModal from '../components/portalAccess/EditEmailModal.jsx';
import PortalRequestsTable from '../components/portalAccess/PortalRequestsTable.jsx';
import RejectRequestModal from '../components/portalAccess/RejectRequestModal.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'patient',
  specialization: '',
  qualification: '',
};

const toEditForm = (user) => {
  const parts = String(user.name || '').split(' ');
  return {
    id: user._id,
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    originalEmail: user.email || '',
    email: user.email || '',
    phone: user.phone || '',
    password: '',
    role: user.role || 'patient',
    specialization: user.specialization || '',
    qualification: user.qualification || '',
  };
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10,15}$/;
const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;
const nameSearchRegex = /^[a-zA-Z\s'-]+$/;

const validateCreate = (form) => {
  const errors = {};
  if (!form.firstName.trim() || form.firstName.trim().length < 2) errors.firstName = 'First name must be at least 2 characters';
  if (!form.lastName.trim() || form.lastName.trim().length < 2) errors.lastName = 'Last name must be at least 2 characters';
  if (!emailRegex.test(form.email)) errors.email = 'Valid email is required';
  if (!phoneRegex.test(form.phone)) errors.phone = 'Phone must be 10-15 digits';
  if (!strongPasswordRegex.test(form.password)) errors.password = 'Password must be 8+ chars with uppercase, lowercase, number';
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords must match';
  if (!form.role) errors.role = 'Role is required';
  return errors;
};

const validateEdit = (form) => {
  const errors = {};
  if (!form.firstName.trim() || form.firstName.trim().length < 2) errors.firstName = 'First name must be at least 2 characters';
  if (!form.lastName.trim() || form.lastName.trim().length < 2) errors.lastName = 'Last name must be at least 2 characters';
  if (!emailRegex.test(form.email)) errors.email = 'Valid email is required';
  if (!phoneRegex.test(form.phone)) errors.phone = 'Phone must be 10-15 digits';
  if (form.password && !strongPasswordRegex.test(form.password)) errors.password = 'Password must be 8+ chars with uppercase, lowercase, number';
  return errors;
};

function UserManagement() {
  const token = localStorage.getItem('careconnect360_token');
  const location = useLocation();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [searchName, setSearchName] = useState('');
  const [searchError, setSearchError] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeTab, setActiveTab] = useState(location.search.includes('tab=portal-requests') ? 'portal-requests' : 'all-users');
  const [portalFilter, setPortalFilter] = useState('pending');
  const [portalData, setPortalData] = useState({ requests: [], counts: { pending: 0, approved: 0, rejected: 0, total: 0 } });
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalActionLoading, setPortalActionLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveSuccess, setApproveSuccess] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editEmailTarget, setEditEmailTarget] = useState(null);
  const [editEmailValue, setEditEmailValue] = useState('');
  const [editEmailError, setEditEmailError] = useState('');

  const refs = {
    firstName: useRef(null),
    lastName: useRef(null),
    email: useRef(null),
    phone: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
    role: useRef(null),
    specialization: useRef(null),
  };

  const load = async (nameFilter = appliedSearch) => {
    try {
      setLoading(true);
      const response = await fetchUsers({
        limit: 100,
        ...(nameFilter ? { name: nameFilter } : {}),
      });
      const payload = response.data.data;
      setUsers(payload.users || []);
      setStats(payload.stats || { totalUsers: 0, activeUsers: 0 });
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('careconnect360_token');
        navigate('/login');
        return;
      }
      if (error.response?.status === 403) {
        toast.error('Access denied');
        return;
      }
      if (error.response?.status === 400) {
        const message =
          error.response?.data?.errors?.[0]?.message ||
          error.response?.data?.errors?.[0]?.msg ||
          error.response?.data?.message ||
          'Invalid search input';
        setSearchError(message);
        return;
      }
      toast.error('Server error, please try again');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadPortalRequests = async (status = portalFilter) => {
    try {
      setPortalLoading(true);
      const response = await getPortalAccessRequests({ status, page: 1, limit: 50 });
      const data = response.data?.data || {};
      setPortalData({
        requests: data.requests || [],
        counts: data.counts || { pending: 0, approved: 0, rejected: 0, total: 0 },
      });
    } catch {
      toast.error('Failed to load portal access requests');
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'portal-requests') {
      loadPortalRequests(portalFilter);
    }
  }, [activeTab, portalFilter]);

  const validateSearch = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    if (trimmed.length < 2 || trimmed.length > 50) return 'Search name must be between 2 and 50 characters';
    if (!nameSearchRegex.test(trimmed)) return 'Use letters, spaces, apostrophes, or hyphens only';
    return '';
  };

  const firstErrorField = useMemo(() => Object.keys(errors)[0], [errors]);
  useEffect(() => {
    if (firstErrorField && refs[firstErrorField]?.current) {
      refs[firstErrorField].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      refs[firstErrorField].current.focus();
    }
  }, [firstErrorField]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';
  const relativeTime = (value) => {
    if (!value) return '';
    const diff = Date.now() - new Date(value).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const trimmed = searchName.trim();
    const validationError = validateSearch(trimmed);
    setSearchError(validationError);
    if (validationError) return;
    setAppliedSearch(trimmed);
    await load(trimmed);
  };

  const handleClearSearch = async () => {
    setSearchName('');
    setSearchError('');
    setAppliedSearch('');
    await load('');
  };

  const handleConfirmBlur = () => {
    if (form.confirmPassword && form.confirmPassword !== form.password) {
      setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords must match' }));
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const validation = validateCreate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    try {
      setSaving(true);
      await createUser({
        firstName: form.firstName,
        lastName: form.lastName,
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
        specialization: form.specialization,
        qualification: form.qualification,
      });
      toast.success('User created successfully');
      setForm(initialForm);
      setErrors({});
      setCreateOpen(false);
      await load(appliedSearch);
    } catch (error) {
      if (error.response?.status === 409) {
        setErrors((prev) => ({ ...prev, email: 'This email is already registered' }));
        return;
      }
      if (error.response?.status === 401) {
        localStorage.removeItem('careconnect360_token');
        navigate('/login');
        return;
      }
      if (error.response?.status === 403) {
        toast.error('Access denied');
        return;
      }
      toast.error('Server error, please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    const ok = window.confirm(`Are you sure you want to ${action} ${user.name}?`);
    if (!ok) return;

    try {
      await toggleUserStatus(user._id, !user.isActive);
      toast.success(`User ${action}d successfully`);
      await load(appliedSearch);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('careconnect360_token');
        navigate('/login');
        return;
      }
      if (error.response?.status === 403) {
        toast.error('Access denied');
        return;
      }
      toast.error('Server error, please try again');
    }
  };

  const handleEdit = (user) => {
    setEditForm(toEditForm(user));
    setEditErrors({});
    setEditOpen(true);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    const validation = validateEdit(editForm);
    setEditErrors(validation);
    if (Object.keys(validation).length > 0) return;

    try {
      setEditSaving(true);
      await updateUser(editForm.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        name: `${editForm.firstName} ${editForm.lastName}`.trim(),
        email: editForm.email,
        phone: editForm.phone,
        password: editForm.password || undefined,
        role: editForm.role,
        specialization: editForm.specialization,
        qualification: editForm.qualification,
      });
      toast.success('User updated successfully');
      setEditOpen(false);
      setEditForm(null);
      await load(appliedSearch);
    } catch (error) {
      if (error.response?.status === 409) {
        setEditErrors((prev) => ({ ...prev, email: 'This email is already registered' }));
        return;
      }
      if (error.response?.status === 401) {
        localStorage.removeItem('careconnect360_token');
        navigate('/login');
        return;
      }
      if (error.response?.status === 403) {
        toast.error('Access denied');
        return;
      }
      toast.error('Server error, please try again');
    } finally {
      setEditSaving(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!editForm?.id) return;
    const res = await sendUserResetEmail(editForm.id);
    const em = res.data?.data?.email || editForm.email;
    toast.success(`Reset email sent to ${em}`);
  };

  const handleSetTempPassword = async (temporaryPassword) => {
    if (!editForm?.id) return;
    await setUserTempPassword(editForm.id, temporaryPassword);
    toast.success('Temporary password set. User must change it on next login.');
  };

  const handlePortalApprove = async (requestId) => {
    try {
      setPortalActionLoading(true);
      const response = await approvePortalAccess(requestId);
      const successEmail = response.data?.data?.email || approveTarget?.requestedEmail || '';
      const successPatientName = approveTarget?.patientId?.name || 'patient';
      toast.success(`Portal account created for ${successPatientName}. Welcome email sent to ${successEmail}.`);
      setApproveSuccess({
        message: response.data?.message || 'Portal account created',
        email: successEmail,
      });
      await loadPortalRequests(portalFilter);
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Email is now taken — ask receptionist to update it');
      } else {
        toast.error('Failed to create account');
      }
    } finally {
      setPortalActionLoading(false);
    }
  };

  const handlePortalReject = async () => {
    if (!rejectTarget) return;
    if (rejectReason.length > 500) return;
    try {
      setPortalActionLoading(true);
      await rejectPortalAccess(rejectTarget._id, { reason: rejectReason.trim() || undefined });
      toast.warning('Request rejected');
      setRejectTarget(null);
      setRejectReason('');
      await loadPortalRequests(portalFilter);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not reject request');
    } finally {
      setPortalActionLoading(false);
    }
  };

  const handlePortalEmailUpdate = async () => {
    if (!editEmailTarget) return;
    if (!editEmailValue) {
      setEditEmailError('Email required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmailValue)) {
      setEditEmailError('Invalid email format');
      return;
    }
    try {
      setPortalActionLoading(true);
      await updatePortalRequestEmail(editEmailTarget._id, { newEmail: editEmailValue.trim().toLowerCase() });
      toast.success('Email updated successfully');
      setEditEmailTarget(null);
      setEditEmailValue('');
      setEditEmailError('');
      await loadPortalRequests(portalFilter);
    } catch (error) {
      if (error.response?.status === 409) {
        setEditEmailError('This email is already registered');
      } else {
        toast.error(error.response?.data?.message || 'Could not update email');
      }
    } finally {
      setPortalActionLoading(false);
    }
  };

  return (
    <>
      <DashboardLayout title="User Management">
        <UserStatCards stats={stats} />

        <section className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => { setActiveTab('all-users'); navigate('/users'); }} className={`rounded-lg px-3 py-1.5 text-xs ${activeTab === 'all-users' ? 'bg-teal-500 text-slate-900' : 'border border-slate-700 text-slate-200'}`}>
              All Users ({stats.totalUsers || users.length || 0})
            </button>
            <button type="button" onClick={() => { setActiveTab('portal-requests'); navigate('/users?tab=portal-requests'); }} className={`rounded-lg px-3 py-1.5 text-xs ${activeTab === 'portal-requests' ? 'bg-teal-500 text-slate-900' : 'border border-slate-700 text-slate-200'}`}>
              Portal Requests ({portalData.counts.total || 0}) {portalData.counts.pending > 0 ? '🔴' : ''}
            </button>
          </div>

          {activeTab === 'portal-requests' ? (
            <article className="glass-panel space-y-4 rounded-2xl p-4">
              <div>
                <h3 className="text-base font-semibold text-white">Patient Portal Access Requests</h3>
                <p className="text-xs text-slate-400">Review and approve patient portal accounts</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ['all', 'All', portalData.counts.total || 0],
                  ['pending', 'Pending', portalData.counts.pending || 0],
                  ['approved', 'Approved', portalData.counts.approved || 0],
                  ['rejected', 'Rejected', portalData.counts.rejected || 0],
                ].map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPortalFilter(value)}
                    className={`rounded-lg px-3 py-1.5 text-xs ${portalFilter === value ? 'bg-teal-500 text-slate-900' : 'border border-slate-700 text-slate-200'}`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <PortalRequestsTable
                  loading={portalLoading}
                  requests={portalData.requests}
                  formatDate={formatDate}
                  relativeTime={relativeTime}
                  onApprove={(request) => {
                    setApproveTarget(request);
                    setApproveSuccess(null);
                  }}
                  onReject={(request) => {
                    setRejectTarget(request);
                    setRejectReason('');
                  }}
                  onEditEmail={(request) => {
                    setEditEmailTarget(request);
                    setEditEmailValue(request.requestedEmail || '');
                    setEditEmailError('');
                  }}
                  onReopen={async (request) => {
                    await reopenPortalAccess(request._id);
                    toast.success('Portal access request submitted');
                    await loadPortalRequests(portalFilter);
                  }}
                />
              </div>
            </article>
          ) : null}

          {activeTab === 'all-users' ? (
            <>
              <article className="glass-panel flex flex-col gap-3 rounded-2xl p-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-slate-300">Manage system users, roles and access</p>
            <div className="w-full lg:w-auto">
              <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-start justify-end gap-2">
                <div className="flex flex-col">
                  <input
                    type="text"
                    value={searchName}
                    onChange={(event) => {
                      setSearchName(event.target.value);
                      if (searchError) setSearchError('');
                    }}
                    placeholder="Search user by name"
                    className="h-9 min-w-[220px] rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none focus:border-teal-400/40"
                  />
                  {searchError ? <span className="mt-1 text-[11px] text-rose-300">{searchError}</span> : null}
                </div>
                <button
                  type="submit"
                  className="h-9 rounded-lg border border-teal-400/40 bg-teal-500/15 px-3 text-xs font-semibold text-teal-100 transition hover:bg-teal-500/25"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  disabled={!appliedSearch && !searchName}
                  className="h-9 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(initialForm);
                    setErrors({});
                    setCreateOpen(true);
                  }}
                  className="h-9 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-slate-900 transition hover:bg-teal-400"
                >
                  + Add User
                </button>
              </form>
            </div>
              </article>

              <UserTable
                users={users}
                loading={loading}
                onRefresh={load}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
              />
            </>
          ) : null}
        </section>
      </DashboardLayout>

      <AddUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        form={form}
        errors={errors}
        onChange={handleChange}
        onSubmit={handleCreate}
        saving={saving}
        firstErrorRef={refs}
        onConfirmBlur={handleConfirmBlur}
      />

      <EditUserModal
        open={editOpen}
        form={editForm || {}}
        errors={editErrors}
        saving={editSaving}
        onClose={() => setEditOpen(false)}
        onChange={handleEditChange}
        onSubmit={handleEditSubmit}
        onSendResetEmail={handleSendResetEmail}
        onSetTempPassword={handleSetTempPassword}
      />

      <ApproveRequestModal
        target={approveTarget}
        loading={portalActionLoading}
        success={approveSuccess}
        onApprove={() => handlePortalApprove(approveTarget._id)}
        onClose={() => {
          setApproveTarget(null);
          setApproveSuccess(null);
        }}
      />
      <RejectRequestModal
        target={rejectTarget}
        reason={rejectReason}
        setReason={setRejectReason}
        loading={portalActionLoading}
        onReject={handlePortalReject}
        onClose={() => setRejectTarget(null)}
      />
      <EditEmailModal
        target={editEmailTarget}
        email={editEmailValue}
        setEmail={setEditEmailValue}
        error={editEmailError}
        setError={setEditEmailError}
        loading={portalActionLoading}
        onSave={handlePortalEmailUpdate}
        onClose={() => setEditEmailTarget(null)}
      />

    </>
  );
}

export default UserManagement;
