import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import { getAuditLogs } from '../api/audit.js';
import {
  changePassword,
  checkAIHealth,
  createMedicalTerm,
  deleteMedicalTerm,
  getMedicalTerms,
  getSettings,
  runJobManually,
  testEmailConnection,
  updateAIService,
  updateClinicSettings,
  updateCronJobs,
  updateEmailSettings,
  updateEmailTemplate,
  updateMedicalTerm,
  updateSecuritySettings,
  uploadClinicLogo,
} from '../api/settings.js';
import SettingsNav from '../components/settings/SettingsNav.jsx';
import {
  IconAIService,
  IconChangePassword,
  IconClinic,
  IconCronJobs,
  IconEmail,
  IconGeneralSecurity,
  IconMedicalTerms,
} from '../components/settings/SettingsNavIcons.jsx';
import AIServiceSettings from '../components/settings/categories/AIServiceSettings.jsx';
import ChangePasswordSettings from '../components/settings/categories/ChangePasswordSettings.jsx';
import ClinicSettings from '../components/settings/categories/ClinicSettings.jsx';
import CronJobSettings from '../components/settings/categories/CronJobSettings.jsx';
import EmailSettings from '../components/settings/categories/EmailSettings.jsx';
import GeneralSettings from '../components/settings/categories/GeneralSettings.jsx';
import MedicalTermsSettings from '../components/settings/categories/MedicalTermsSettings.jsx';
import DashboardLayout from '@/shared/layouts/DashboardLayout.jsx';
import { parseLocalDateFromISO, toISOInputValue, todayISOInPakistan } from '../utils/isoDate.js';

const CATEGORIES = [
  { key: 'general', icon: <IconGeneralSecurity />, label: 'General & Security' },
  { key: 'email', icon: <IconEmail />, label: 'Email Configuration' },
  { key: 'cronJobs', icon: <IconCronJobs />, label: 'Scheduled Jobs' },
  { key: 'clinic', icon: <IconClinic />, label: 'Clinic Information' },
  { key: 'aiService', icon: <IconAIService />, label: 'AI Service' },
  { key: 'medicalTerms', icon: <IconMedicalTerms />, label: 'Medical Terms' },
  { key: 'password', icon: <IconChangePassword />, label: 'Change Password' },
];

const DEFAULT_SETTINGS = {
  security: {},
  email: {},
  emailTemplates: {},
  cronJobs: {
    appointmentReminder: { enabled: true, schedule: '0 9 * * *' },
    patientReEngagement: { enabled: true, schedule: '0 10 * * *' },
    prescriptionRenewal: { enabled: true, schedule: '0 8 * * *' },
  },
  clinic: { workingHours: [] },
  aiService: {},
};
const SMTP_MASK = '••••••••';

const parseCronToUi = (cron) => {
  const [minuteRaw, hourRaw] = String(cron || '0 9 * * *').split(' ');
  const hour24 = Number(hourRaw || 9);
  const minute = String(minuteRaw || '0').padStart(2, '0');
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return { hour: String(hour12), minute, ampm };
};

const uiToCron = ({ hour, minute, ampm }) => {
  const h = Number(hour || 12);
  const hour24 = ampm === 'PM' ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
  return `${Number(minute || 0)} ${hour24} * * *`;
};

function Settings() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [aiHealth, setAiHealth] = useState(null);
  const [aiHealthLoading, setAiHealthLoading] = useState(false);
  const [jobLogs, setJobLogs] = useState([]);
  const [terms, setTerms] = useState([]);
  const [termsPagination, setTermsPagination] = useState({ total: 0, page: 1, pages: 1, limit: 10 });
  const [termsSearch, setTermsSearch] = useState('');
  const [termEditor, setTermEditor] = useState({ mode: '', id: '', medicalTerm: '', simplifiedTerm: '' });
  const [termInlineError, setTermInlineError] = useState('');

  const [cronUi, setCronUi] = useState({
    appointmentReminder: { hour: '9', minute: '00', ampm: 'AM' },
    patientReEngagement: { hour: '10', minute: '00', ampm: 'AM' },
    prescriptionRenewal: { hour: '8', minute: '00', ampm: 'AM' },
  });

  const [formStates, setFormStates] = useState({
    general: { data: null, original: null, saving: false, errors: {} },
    email: { data: null, original: null, saving: false, errors: {} },
    cronJobs: { data: null, original: null, saving: false, errors: {} },
    clinic: { data: null, original: null, saving: false, errors: {} },
    aiService: { data: null, original: null, saving: false, errors: {} },
    medicalTerms: { data: null, original: null, saving: false, errors: {} },
    password: { data: { currentPassword: '', newPassword: '', confirmPassword: '' }, original: null, saving: false, errors: {} },
  });

  const token = localStorage.getItem('careconnect360_token') || '';
  const adminUser = useMemo(() => {
    if (!token) return { name: 'Admin', email: '', role: 'admin' };
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return { name: decoded?.name || 'Admin', email: decoded?.email || '', role: decoded?.role || 'admin' };
    } catch {
      return { name: 'Admin', email: '', role: 'admin' };
    }
  }, [token]);

  const isCategoryDirty = (category) => {
    const state = formStates[category];
    if (!state?.data || !state?.original) return false;
    return JSON.stringify(state.data) !== JSON.stringify(state.original);
  };

  const anyDirty = useMemo(() => Object.keys(formStates).some((k) => isCategoryDirty(k)), [formStates]);

  useEffect(() => {
    const handler = (e) => {
      if (!anyDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [anyDirty]);

  const setCategory = (category, nextData) => {
    setFormStates((prev) => ({ ...prev, [category]: { ...prev[category], data: nextData } }));
  };
  const setCategoryErrors = (category, errors) => {
    setFormStates((prev) => ({ ...prev, [category]: { ...prev[category], errors } }));
  };
  const markSaved = (category, savedData) => {
    setFormStates((prev) => ({ ...prev, [category]: { ...prev[category], data: savedData, original: savedData, saving: false, errors: {} } }));
  };

  const loadJobLogs = async () => {
    try {
      const to = todayISOInPakistan();
      const fromDt = parseLocalDateFromISO(to) || new Date();
      fromDt.setDate(fromDt.getDate() - 7);
      const from = toISOInputValue(fromDt);
      const res = await getAuditLogs({ search: 'CRON_', page: 1, limit: 10, from, to });
      setJobLogs(res.data?.data?.logs || []);
    } catch {
      setJobLogs([]);
    }
  };

  const loadTerms = async (page = 1, search = '') => {
    const res = await getMedicalTerms({ page, limit: 10, search });
    setTerms(res.data?.data?.terms || []);
    setTermsPagination(res.data?.data?.pagination || { total: 0, page: 1, pages: 1, limit: 10 });
  };

  useEffect(() => {
    Promise.all([getSettings(), loadTerms(), loadJobLogs()])
      .then(([settingsRes]) => {
        const s = { ...DEFAULT_SETTINGS, ...(settingsRes.data?.data || {}) };
        const emailFromServer = { ...(s.email || {}) };
        const smtpPassConfigured = Boolean(String(emailFromServer.smtpPass || '').trim());
        const emailForForm = {
          ...emailFromServer,
          smtpPass: '',
          smtpPassConfigured,
        };
        setSettings(s);
        setFormStates((prev) => ({
          ...prev,
          general: { ...prev.general, data: { ...s.security }, original: { ...s.security } },
          email: {
            ...prev.email,
            data: { ...emailForForm, emailTemplates: { ...s.emailTemplates } },
            original: { ...emailForForm, emailTemplates: { ...s.emailTemplates } },
          },
          cronJobs: { ...prev.cronJobs, data: { ...s.cronJobs }, original: { ...s.cronJobs } },
          clinic: { ...prev.clinic, data: { ...s.clinic }, original: { ...s.clinic } },
          aiService: { ...prev.aiService, data: { ...s.aiService }, original: { ...s.aiService } },
        }));
        setCronUi({
          appointmentReminder: parseCronToUi(s.cronJobs?.appointmentReminder?.schedule),
          patientReEngagement: parseCronToUi(s.cronJobs?.patientReEngagement?.schedule),
          prescriptionRenewal: parseCronToUi(s.cronJobs?.prescriptionRenewal?.schedule),
        });
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const refreshAiHealth = useCallback(async () => {
    setAiHealthLoading(true);
    try {
      const res = await checkAIHealth();
      setAiHealth(res.data?.data || null);
    } catch {
      setAiHealth({
        status: 'offline',
        responseMs: 0,
        url: formStates.aiService.data?.url || '',
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setAiHealthLoading(false);
    }
  }, [formStates.aiService.data?.url]);

  useEffect(() => {
    if (loading) return;
    refreshAiHealth();
  }, [loading, refreshAiHealth]);

  useEffect(() => {
    if (activeCategory !== 'aiService' || loading) return;
    refreshAiHealth();
    const timer = setInterval(refreshAiHealth, 30000);
    return () => clearInterval(timer);
  }, [activeCategory, loading, refreshAiHealth]);

  const validateGeneral = () => {
    const d = formStates.general.data || {};
    const errors = {};
    if (!Number.isInteger(Number(d.jwtExpiryHours)) || Number(d.jwtExpiryHours) < 1 || Number(d.jwtExpiryHours) > 720) errors.jwtExpiryHours = 'JWT expiry must be 1–720 hours';
    if (!Number.isInteger(Number(d.minPasswordLength)) || Number(d.minPasswordLength) < 6 || Number(d.minPasswordLength) > 32) errors.minPasswordLength = 'Min password length: 6–32';
    if (!Number.isInteger(Number(d.fileUploadLimitMB)) || Number(d.fileUploadLimitMB) < 1 || Number(d.fileUploadLimitMB) > 50) errors.fileUploadLimitMB = 'File limit: 1–50 MB';
    if (!Number.isInteger(Number(d.maxLoginAttempts)) || Number(d.maxLoginAttempts) < 3 || Number(d.maxLoginAttempts) > 10) errors.maxLoginAttempts = 'Login attempts: 3–10';
    const origin = String(d.corsAllowedOrigin || '').trim();
    if (origin && origin !== '*') {
      try { new URL(origin); } catch { errors.corsAllowedOrigin = 'Must be valid URL or *'; }
    }
    setCategoryErrors('general', errors);
    return Object.keys(errors).length === 0;
  };

  const validateEmail = () => {
    const d = formStates.email.data || {};
    const errors = {};
    const fields = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'fromName', 'fromEmail', 'replyTo'];
    const filledAny = fields.some((k) => String(d[k] ?? '').trim());
    const required = ['smtpHost', 'smtpPort', 'smtpUser', 'fromName', 'fromEmail'];
    const hasExistingSmtpPass = Boolean(d.smtpPassConfigured);
    const enteredSmtpPass = String(d.smtpPass || '').trim();
    if (!hasExistingSmtpPass && !enteredSmtpPass && filledAny) {
      errors.smtpPass = 'Required';
    }
    if (filledAny) required.forEach((k) => { if (!String(d[k] ?? '').trim()) errors[k] = 'Required'; });
    if (d.smtpPort && (Number(d.smtpPort) < 1 || Number(d.smtpPort) > 65535)) errors.smtpPort = 'Port: 1–65535';
    if (d.smtpUser && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.smtpUser)) errors.smtpUser = 'Valid email required';
    if (d.fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.fromEmail)) errors.fromEmail = 'Valid email required';
    if (d.replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.replyTo)) errors.replyTo = 'Must be valid email';
    setCategoryErrors('email', errors);
    return Object.keys(errors).length === 0;
  };

  const validateClinic = () => {
    const d = formStates.clinic.data || {};
    const errors = {};
    if (!String(d.name || '').trim() || String(d.name).trim().length < 2) errors.name = 'Clinic name required';
    if (!String(d.phone || '').trim() || !/^[0-9+\-\s()]{7,20}$/.test(d.phone)) errors.phone = 'Invalid phone format';
    if (!String(d.email || '').trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errors.email = 'Valid email required';
    if (d.website) { try { new URL(d.website); } catch { errors.website = 'Invalid URL'; } }
    if (d.invoicePrefix && (!/^[A-Z0-9]+$/.test(d.invoicePrefix) || d.invoicePrefix.length > 5)) errors.invoicePrefix = 'Uppercase letters and numbers only, max 5';
    if ((d.workingHours || []).some((h) => h.isOpen && h.start >= h.end)) errors.workingHours = 'End time must be after start time for open days';
    setCategoryErrors('clinic', errors);
    return Object.keys(errors).length === 0;
  };

  const validateAI = () => {
    const d = formStates.aiService.data || {};
    const errors = {};
    if (!String(d.url || '').trim()) errors.url = 'AI service URL required';
    else { try { new URL(d.url); } catch { errors.url = 'Invalid URL'; } }
    if (d.timeoutSeconds && (Number(d.timeoutSeconds) < 30 || Number(d.timeoutSeconds) > 300)) {
      errors.timeoutSeconds = 'Timeout: 30–300 seconds';
    }
    if (d.maxReportLength && (Number(d.maxReportLength) < 500 || Number(d.maxReportLength) > 50000)) errors.maxReportLength = 'Max length: 500–50,000';
    setCategoryErrors('aiService', errors);
    return Object.keys(errors).length === 0;
  };

  const saveGeneral = async () => {
    if (!validateGeneral()) return;
    const payload = formStates.general.data;
    const res = await updateSecuritySettings(payload);
    markSaved('general', res.data?.data || payload);
    toast.success('General settings saved');
    toast.warning('Restart server for changes to apply');
  };
  const saveEmail = async () => {
    if (!validateEmail()) return;
    const emailData = { ...(formStates.email.data || {}) };
    delete emailData.emailTemplates;
    delete emailData.smtpPassConfigured;
    if (!String(emailData.smtpPass || '').trim() || emailData.smtpPass === SMTP_MASK) {
      // Omitting smtpPass tells backend to keep previously saved secret.
      delete emailData.smtpPass;
    }
    const res = await updateEmailSettings(emailData);
    const saved = {
      ...(formStates.email.data || {}),
      ...(res.data?.data || {}),
      smtpPass: '',
      smtpPassConfigured: true,
    };
    markSaved('email', saved);
    toast.success('Email settings saved');
  };
  const saveCronJobs = async () => {
    const payload = {
      appointmentReminder: { enabled: formStates.cronJobs.data?.appointmentReminder?.enabled, schedule: uiToCron(cronUi.appointmentReminder) },
      patientReEngagement: { enabled: formStates.cronJobs.data?.patientReEngagement?.enabled, schedule: uiToCron(cronUi.patientReEngagement) },
      prescriptionRenewal: { enabled: formStates.cronJobs.data?.prescriptionRenewal?.enabled, schedule: uiToCron(cronUi.prescriptionRenewal) },
    };
    const res = await updateCronJobs(payload);
    markSaved('cronJobs', res.data?.data || payload);
    toast.success('Cron jobs settings saved');
    toast.warning('Restart server for changes to apply');
  };
  const saveClinic = async () => {
    if (!validateClinic()) return;
    const payload = formStates.clinic.data;
    const res = await updateClinicSettings(payload);
    markSaved('clinic', res.data?.data || payload);
    toast.success('Clinic settings saved');
  };
  const saveAI = async () => {
    if (!validateAI()) return;
    const payload = formStates.aiService.data;
    const res = await updateAIService(payload);
    markSaved('aiService', res.data?.data || payload);
    toast.success('AI service settings saved');
    await refreshAiHealth();
  };

  const saveActiveCategory = async () => {
    setSaving(true);
    try {
      if (activeCategory === 'general' && isCategoryDirty('general')) await saveGeneral();
      if (activeCategory === 'email' && isCategoryDirty('email')) await saveEmail();
      if (activeCategory === 'cronJobs' && isCategoryDirty('cronJobs')) await saveCronJobs();
      if (activeCategory === 'clinic' && isCategoryDirty('clinic')) await saveClinic();
      if (activeCategory === 'aiService' && isCategoryDirty('aiService')) await saveAI();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Settings & Configuration" subline="System preferences and environment configuration">
        <div className="glass-panel rounded-xl p-6 text-sm text-slate-300">Loading settings...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Settings & Configuration"
      subline="System preferences and environment configuration"
      headerActions={(
        <button
          type="button"
          title={!isCategoryDirty(activeCategory) ? 'No unsaved changes' : ''}
          disabled={!isCategoryDirty(activeCategory) || saving}
          onClick={saveActiveCategory}
          className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 transition hover:bg-teal-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <span className="inline-block animate-spin">◌</span> : '💾'}
          Save All Changes
        </button>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsNav categories={CATEGORIES} activeCategory={activeCategory} onSelect={setActiveCategory} isCategoryDirty={isCategoryDirty} />
        <section className="space-y-4">
          {activeCategory === 'general' ? (
            <GeneralSettings
              data={formStates.general.data || {}}
              errors={formStates.general.errors || {}}
              onChange={(next) => setCategory('general', next)}
              onSave={saveGeneral}
              dirty={isCategoryDirty('general')}
              saving={formStates.general.saving}
            />
          ) : null}
          {activeCategory === 'email' ? (
            <EmailSettings
              data={formStates.email.data || {}}
              errors={formStates.email.errors || {}}
              dirty={isCategoryDirty('email')}
              saving={formStates.email.saving}
              smtpStatus={smtpStatus}
              smtpTesting={smtpTesting}
              onChange={(next) => setCategory('email', next)}
              onSave={saveEmail}
              onTest={async () => {
                setSmtpTesting(true);
                setSmtpStatus(null);
                try {
                  const res = await testEmailConnection();
                  setSmtpStatus({ type: 'success', message: res.data?.message || 'Test email sent' });
                  toast.success(res.data?.message || 'Test email sent');
                } catch (err) {
                  setSmtpStatus({ type: 'error', message: `SMTP connection failed: ${err.response?.data?.message || 'Unknown error'}` });
                } finally {
                  setSmtpTesting(false);
                }
              }}
              templates={formStates.email.data?.emailTemplates || {}}
              onTemplateChange={(key, field, value) => {
                const current = formStates.email.data || {};
                setCategory('email', { ...current, emailTemplates: { ...(current.emailTemplates || {}), [key]: { ...(current.emailTemplates?.[key] || {}), [field]: value } } });
              }}
              onSaveTemplate={async (templateKey) => {
                setSavingTemplate(true);
                try {
                  const template = formStates.email.data?.emailTemplates?.[templateKey] || {};
                  await updateEmailTemplate({ templateKey, subject: template.subject || '', body: template.body || '' });
                  toast.success('Email template saved');
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to save template');
                } finally {
                  setSavingTemplate(false);
                }
              }}
              savingTemplate={savingTemplate}
            />
          ) : null}
          {activeCategory === 'cronJobs' ? (
            <CronJobSettings
              data={formStates.cronJobs.data || {}}
              cronUi={cronUi}
              onCronUiChange={(key, next) => {
                setCronUi((p) => ({ ...p, [key]: next }));
                const current = formStates.cronJobs.data || {};
                setCategory('cronJobs', { ...current, [key]: { ...(current[key] || {}), schedule: uiToCron(next) } });
              }}
              onToggle={(key, enabled) => {
                const current = formStates.cronJobs.data || {};
                setCategory('cronJobs', { ...current, [key]: { ...(current[key] || {}), enabled } });
              }}
              onSave={saveCronJobs}
              onRunNow={async (key, name) => {
                if (!window.confirm(`Run ${name} now?`)) return;
                try {
                  await runJobManually(key);
                  toast.success(`Job '${name}' triggered successfully`);
                  loadJobLogs();
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to trigger job');
                }
              }}
              dirty={isCategoryDirty('cronJobs')}
              saving={formStates.cronJobs.saving}
              logs={jobLogs}
            />
          ) : null}
          {activeCategory === 'clinic' ? (
            <ClinicSettings
              data={formStates.clinic.data || {}}
              errors={formStates.clinic.errors || {}}
              dirty={isCategoryDirty('clinic')}
              saving={formStates.clinic.saving}
              onChange={(next) => setCategory('clinic', next)}
              onSave={saveClinic}
              onLogoChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const typeOk = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
                if (!typeOk) {
                  setCategoryErrors('clinic', { ...(formStates.clinic.errors || {}), logo: 'Invalid file type (JPG/PNG only)' });
                  return;
                }
                if (file.size > 2 * 1024 * 1024) {
                  setCategoryErrors('clinic', { ...(formStates.clinic.errors || {}), logo: 'File too large (max 2MB)' });
                  return;
                }
                const localUrl = URL.createObjectURL(file);
                setCategory('clinic', { ...(formStates.clinic.data || {}), logoUrl: localUrl });
                const fd = new FormData();
                fd.append('logo', file);
                try {
                  const res = await uploadClinicLogo(fd);
                  const saved = res.data?.data?.logoUrl || localUrl;
                  setCategory('clinic', { ...(formStates.clinic.data || {}), logoUrl: saved });
                  toast.success('Clinic settings saved');
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to upload logo');
                }
              }}
              onRemoveLogo={() => setCategory('clinic', { ...(formStates.clinic.data || {}), logoUrl: '' })}
            />
          ) : null}
          {activeCategory === 'aiService' ? (
            <AIServiceSettings
              data={formStates.aiService.data || {}}
              errors={formStates.aiService.errors || {}}
              dirty={isCategoryDirty('aiService')}
              saving={formStates.aiService.saving}
              health={aiHealth}
              healthLoading={aiHealthLoading}
              onChange={(next) => setCategory('aiService', next)}
              onSave={saveAI}
              onCheckHealth={refreshAiHealth}
            />
          ) : null}
          {activeCategory === 'medicalTerms' ? (
            <MedicalTermsSettings
              terms={terms}
              pagination={termsPagination}
              search={termsSearch}
              onSearchChange={setTermsSearch}
              onSearchSubmit={() => loadTerms(1, termsSearch)}
              termEditor={termEditor}
              onTermEditorChange={setTermEditor}
              onAddStart={() => { setTermInlineError(''); setTermEditor({ mode: 'add', id: '', medicalTerm: '', simplifiedTerm: '' }); }}
              onAddCancel={() => { setTermInlineError(''); setTermEditor({ mode: '', id: '', medicalTerm: '', simplifiedTerm: '' }); }}
              onAddSave={async () => {
                const medicalTerm = String(termEditor.medicalTerm || '').trim();
                const simplifiedTerm = String(termEditor.simplifiedTerm || '').trim();
                if (medicalTerm.length < 2 || medicalTerm.length > 100 || simplifiedTerm.length < 2 || simplifiedTerm.length > 200) {
                  setTermInlineError('Please provide valid lengths (medical: 2-100, simplified: 2-200)');
                  return;
                }
                if (terms.some((t) => t.medicalTerm.toLowerCase() === medicalTerm.toLowerCase())) {
                  setTermInlineError('This medical term already exists');
                  return;
                }
                try {
                  await createMedicalTerm({ medicalTerm, simplifiedTerm });
                  toast.success('Medical term added');
                  setTermInlineError('');
                  setTermEditor({ mode: '', id: '', medicalTerm: '', simplifiedTerm: '' });
                  loadTerms(termsPagination.page, termsSearch);
                } catch (err) {
                  setTermInlineError(err.response?.status === 409 ? 'This medical term already exists' : (err.response?.data?.message || 'Failed to add term'));
                }
              }}
              onEditStart={(term) => { setTermInlineError(''); setTermEditor({ mode: 'edit', id: term._id, medicalTerm: term.medicalTerm, simplifiedTerm: term.simplifiedTerm }); }}
              onEditCancel={() => { setTermInlineError(''); setTermEditor({ mode: '', id: '', medicalTerm: '', simplifiedTerm: '' }); }}
              onEditSave={async () => {
                const medicalTerm = String(termEditor.medicalTerm || '').trim();
                const simplifiedTerm = String(termEditor.simplifiedTerm || '').trim();
                if (terms.some((t) => t._id !== termEditor.id && t.medicalTerm.toLowerCase() === medicalTerm.toLowerCase())) {
                  setTermInlineError('This medical term already exists');
                  return;
                }
                try {
                  await updateMedicalTerm(termEditor.id, { medicalTerm, simplifiedTerm });
                  toast.success('Medical term updated');
                  setTermInlineError('');
                  setTermEditor({ mode: '', id: '', medicalTerm: '', simplifiedTerm: '' });
                  loadTerms(termsPagination.page, termsSearch);
                } catch (err) {
                  setTermInlineError(err.response?.data?.message || 'Failed to update term');
                }
              }}
              onDelete={async (term) => {
                if (!window.confirm(`Delete term '${term.medicalTerm}'?`)) return;
                try {
                  await deleteMedicalTerm(term._id);
                  toast.success('Medical term deleted');
                  loadTerms(termsPagination.page, termsSearch);
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to delete term');
                }
              }}
              inlineError={termInlineError}
              onPageChange={(page) => loadTerms(page, termsSearch)}
            />
          ) : null}
          {activeCategory === 'password' ? (
            <ChangePasswordSettings
              data={formStates.password.data}
              errors={formStates.password.errors || {}}
              saving={formStates.password.saving}
              onChange={(next) => setCategory('password', next)}
              onSubmit={async () => {
                const d = formStates.password.data;
                const errors = {};
                if (!d.currentPassword) errors.currentPassword = 'Current password required';
                if (!d.newPassword) errors.newPassword = 'New password required';
                else if (!/[A-Z]/.test(d.newPassword) || !/[0-9]/.test(d.newPassword) || d.newPassword.length < 8) errors.newPassword = 'Minimum 8 chars, include uppercase and number';
                if (!d.confirmPassword || d.confirmPassword !== d.newPassword) errors.confirmPassword = 'Passwords do not match';
                if (Object.keys(errors).length) {
                  setCategoryErrors('password', errors);
                  return;
                }
                setCategoryErrors('password', {});
                setFormStates((prev) => ({ ...prev, password: { ...prev.password, saving: true } }));
                try {
                  await changePassword(d);
                  toast.success('Password changed successfully');
                  setFormStates((prev) => ({ ...prev, password: { ...prev.password, data: { currentPassword: '', newPassword: '', confirmPassword: '' }, saving: false, errors: {} } }));
                } catch (err) {
                  const msg = err.response?.data?.message || 'Failed to change password';
                  if (msg.toLowerCase().includes('current password')) {
                    setCategoryErrors('password', { currentPassword: 'Current password is incorrect' });
                  } else {
                    toast.error(msg);
                  }
                  setFormStates((prev) => ({ ...prev, password: { ...prev.password, saving: false } }));
                }
              }}
              admin={adminUser}
            />
          ) : null}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default Settings;
