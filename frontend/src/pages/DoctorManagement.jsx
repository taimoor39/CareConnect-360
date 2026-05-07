import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { getDoctorById, getDoctors, getDoctorStats, toggleDoctorStatus } from '../api/doctors.js';
import { getStaff, getStaffStats, toggleStaffStatus } from '../api/staff.js';
import DashboardLayout from '../components/DashboardLayout.jsx';
import DoctorDetailDrawer from '../components/doctors/DoctorDetailDrawer.jsx';
import DoctorStatCards from '../components/doctors/DoctorStatCards.jsx';
import DoctorTable from '../components/doctors/DoctorTable.jsx';
import EditDoctorModal from '../components/doctors/EditDoctorModal.jsx';
import TabNavigation from '../components/doctors/TabNavigation.jsx';
import EditStaffModal from '../components/staff/EditStaffModal.jsx';
import StaffTable from '../components/staff/StaffTable.jsx';

function DoctorManagement() {
  const token = localStorage.getItem('careconnect360_token');
  const searchDebounceRef = useRef(null);
  const staffSearchDebounceRef = useRef(null);

  const [activeTab, setActiveTab] = useState('doctors');
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState({});
  const [staffStats, setStaffStats] = useState({});
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editStaffModalOpen, setEditStaffModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    specialization: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({});
  const [staffFilters, setStaffFilters] = useState({
    search: '',
    status: '',
    page: 1,
    limit: 10,
  });
  const [staffPagination, setStaffPagination] = useState({});
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [loadedTabs, setLoadedTabs] = useState({ doctors: false, receptionists: false });

  const fetchDoctors = useCallback(async (useFilters = filters) => {
    setTableLoading(true);
    try {
      const response = await getDoctors(useFilters);
      setDoctors(response.data.data || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      toast.error('Server error — please try again');
    } finally {
      setTableLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getDoctorStats();
      setStats(response.data.data || {});
    } catch (error) {
      toast.error('Server error — please try again');
    }
  }, []);

  const fetchStaff = useCallback(async (useFilters = staffFilters) => {
    setStaffLoading(true);
    try {
      const response = await getStaff(useFilters);
      setStaff(response.data?.data?.staff || []);
      setStaffPagination(response.data?.data?.pagination || {});
      setLoadedTabs((prev) => ({ ...prev, receptionists: true }));
    } catch (error) {
      toast.error('Failed to load staff data');
    } finally {
      setStaffLoading(false);
    }
  }, [staffFilters]);

  const fetchStaffStatsSummary = useCallback(async () => {
    try {
      const response = await getStaffStats();
      setStaffStats(response.data?.data || {});
    } catch (error) {
      toast.error('Server error — please try again');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchDoctors(filters), fetchStats()]);
  }, [fetchDoctors, fetchStats, filters]);

  const refreshStaffAll = useCallback(async () => {
    await Promise.all([fetchStaff(staffFilters), fetchStaffStatsSummary()]);
  }, [fetchStaff, fetchStaffStatsSummary, staffFilters]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const [doctorResponse, statsResponse, staffStatsResponse] = await Promise.all([getDoctors(filters), getDoctorStats(), getStaffStats()]);
        if (!active) return;
        setDoctors(doctorResponse.data.data || []);
        setPagination(doctorResponse.data.pagination || {});
        setStats(statsResponse.data.data || {});
        setStaffStats(staffStatsResponse.data?.data || {});
        setLoadedTabs((prev) => ({ ...prev, doctors: true }));
      } catch (error) {
        if (active) toast.error('Server error — please try again');
      } finally {
        if (active) {
          setLoading(false);
          setTableLoading(false);
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (activeTab !== 'doctors') return;

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      fetchDoctors(filters);
      fetchStats();
    }, 400);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [activeTab, filters.search, filters.status, filters.specialization, filters.page, filters.limit, fetchDoctors, fetchStats, loading]);

  useEffect(() => {
    if (loading) return;
    if (activeTab !== 'receptionists') return;

    if (staffSearchDebounceRef.current) {
      clearTimeout(staffSearchDebounceRef.current);
    }

    staffSearchDebounceRef.current = setTimeout(() => {
      fetchStaff(staffFilters);
    }, 400);

    return () => {
      if (staffSearchDebounceRef.current) clearTimeout(staffSearchDebounceRef.current);
    };
  }, [activeTab, staffFilters.search, staffFilters.status, staffFilters.page, staffFilters.limit, fetchStaff, staffFilters, loading]);

  useEffect(() => {
    if (loading) return;
    if (activeTab === 'doctors') return;
    if (!loadedTabs.receptionists) {
      fetchStaff(staffFilters);
    }
  }, [activeTab, fetchStaff, loadedTabs.receptionists, loading, staffFilters]);

  const openDrawer = async (doctor) => {
    setDrawerOpen(true);
    setSelectedDoctor(null);
    try {
      const response = await getDoctorById(doctor._id);
      setSelectedDoctor(response.data.data || null);
    } catch (error) {
      toast.error('Server error — please try again');
      setDrawerOpen(false);
    }
  };

  const openEdit = async (doctor) => {
    try {
      const response = await getDoctorById(doctor._id);
      setEditingDoctor(response.data.data || null);
      setEditModalOpen(true);
    } catch (error) {
      toast.error('Server error — please try again');
    }
  };

  const handleToggleStatus = async (doctor) => {
    const action = doctor.isActive ? 'Deactivate' : 'Activate';
    const confirmation = window.confirm(
      `Deactivate Dr. ${doctor.name}?\nThey will no longer appear in appointment booking.\n\n[Cancel] [${action}]`
    );
    if (!confirmation) return;

    try {
      await toggleDoctorStatus(doctor._id);
      if (doctor.isActive) {
        toast.success(`Dr. ${doctor.name} has been deactivated`);
      } else {
        toast.success(`Dr. ${doctor.name} has been activated`);
      }
      await refreshAll();
      if (selectedDoctor && selectedDoctor._id === doctor._id) {
        const refreshed = await getDoctorById(doctor._id);
        setSelectedDoctor(refreshed.data.data || null);
      }
    } catch (error) {
      toast.error('Server error — please try again');
    }
  };

  const openStaffEdit = (member) => {
    setEditingStaff(member);
    setEditStaffModalOpen(true);
  };

  const handleToggleStaffStatus = async (member) => {
    const action = member.isActive ? 'Deactivate' : 'Activate';
    const confirmation = window.confirm(
      member.isActive
        ? `Deactivate ${member.name}?\nThey will lose access to the system immediately.\n\n[Cancel] [Deactivate]`
        : `Activate ${member.name}?\n\n[Cancel] [Activate]`
    );
    if (!confirmation) return;

    try {
      await toggleStaffStatus(member._id);
      if (member.isActive) {
        toast.warn(`${member.name} has been deactivated`);
      } else {
        toast.success(`${member.name} has been reactivated`);
      }
      await refreshStaffAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Server error — please try again');
    }
  };

  const workloadMap = (staffStats.workload || []).reduce((acc, item) => {
    acc[item._id] = {
      patientsRegistered: item.patientsRegistered || 0,
      appointmentsBooked: item.appointmentsBooked || 0,
    };
    return acc;
  }, {});

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <DashboardLayout title="Doctors & Staff Management">
        <DoctorStatCards stats={stats} staffStats={staffStats.summary || {}} />

        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          doctorCount={stats.totalDoctors || 0}
          receptionistCount={staffStats.summary?.totalReceptionists || 0}
        />

        {activeTab === 'doctors' ? (
          <>
            <div className="glass-panel flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-300">
                To add a new doctor, create a user with role &ldquo;Doctor&rdquo; in User Management. Their profile will appear here for completion.
              </p>
              <Link to="/users" className="whitespace-nowrap text-xs font-semibold text-teal-400 transition hover:text-teal-300">
                Go to User Management &rarr;
              </Link>
            </div>
            <DoctorTable
              doctors={doctors}
              loading={loading || tableLoading}
              onRowClick={openDrawer}
              onEdit={openEdit}
              onToggleStatus={handleToggleStatus}
              filters={filters}
              setFilters={setFilters}
              pagination={pagination}
            />
          </>
        ) : (
          <StaffTable
            staff={staff}
            workloadMap={workloadMap}
            loading={loading || staffLoading}
            filters={staffFilters}
            setFilters={setStaffFilters}
            pagination={staffPagination}
            onRefresh={refreshStaffAll}
            onEdit={openStaffEdit}
            onToggleStatus={handleToggleStaffStatus}
          />
        )}
      </DashboardLayout>

      <DoctorDetailDrawer
        doctor={selectedDoctor}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={openEdit}
        onToggleStatus={handleToggleStatus}
      />

      <EditDoctorModal
        doctor={editingDoctor}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={refreshAll}
        setDoctors={setDoctors}
        setStats={setStats}
      />

      <EditStaffModal
        staff={editingStaff}
        isOpen={editStaffModalOpen}
        onClose={() => setEditStaffModalOpen(false)}
        onSuccess={refreshStaffAll}
      />

    </>
  );
}

export default DoctorManagement;