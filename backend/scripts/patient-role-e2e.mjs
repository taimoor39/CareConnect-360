const BASE_URL = process.env.BASE_URL || 'http://localhost:8000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'abc123456';

const stamp = Date.now();
const patientEmail = `patient.${stamp}@example.com`;
const patientPassword = 'Patient123!';

function logStep(title, result, extra = '') {
  const tag = result ? 'PASS' : 'FAIL';
  const suffix = extra ? ` | ${extra}` : '';
  console.log(`[${tag}] ${title}${suffix}`);
}

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  let failures = 0;

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const adminToken = adminLogin.data?.token;
  const adminOk = !!adminToken;
  logStep('Admin login', adminOk, adminOk ? `status=${adminLogin.status}` : JSON.stringify(adminLogin.data));
  if (!adminOk) {
    process.exitCode = 1;
    return;
  }

  const createPatient = await request('/patients', {
    method: 'POST',
    token: adminToken,
    body: {
      firstName: 'Portal',
      lastName: 'Patient',
      phone: '03001234567',
      email: patientEmail,
      password: patientPassword,
      dateOfBirth: '1994-05-06',
      gender: 'Male',
      bloodGroup: 'A+',
      status: 'Active',
      city: 'Karachi',
      addressLine1: 'Test Street',
      emergencyName: 'Family Member',
      emergencyPhone: '03007654321',
      emergencyRelation: 'Brother',
    },
  });
  const patientId = createPatient.data?.data?.patient?._id;
  const patientCreateOk = !!patientId;
  logStep(
    'Admin creates patient with linked portal user',
    patientCreateOk,
    patientCreateOk ? `patientId=${patientId}` : JSON.stringify(createPatient.data)
  );
  if (!patientCreateOk) failures += 1;

  const patientLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: patientEmail, password: patientPassword },
  });
  const patientToken = patientLogin.data?.token;
  const patientLoginOk = !!patientToken;
  logStep('Patient login', patientLoginOk, patientLoginOk ? `status=${patientLogin.status}` : JSON.stringify(patientLogin.data));
  if (!patientLoginOk) {
    process.exitCode = 1;
    return;
  }

  const patientEndpoints = [
    { name: 'Patient profile', path: '/patient/profile' },
    { name: 'Patient profile update', path: '/patient/profile', method: 'PUT', body: { city: 'Lahore', addressLine1: 'Updated Line 1' } },
    { name: 'Patient dashboard stats', path: '/patient/dashboard-stats' },
    { name: 'Patient appointments', path: '/patient/appointments' },
    { name: 'Patient prescriptions', path: '/patient/prescriptions' },
    { name: 'Patient reports', path: '/patient/reports' },
    { name: 'Patient invoices', path: '/patient/invoices' },
  ];

  for (const endpoint of patientEndpoints) {
    const res = await request(endpoint.path, {
      token: patientToken,
      method: endpoint.method || 'GET',
      body: endpoint.body,
    });
    const ok = res.ok && res.data?.success !== false;
    logStep(endpoint.name, ok, `status=${res.status}`);
    if (!ok) failures += 1;
  }

  const summaryMissing = await request('/patient/reports/64f000000000000000000001/summary', {
    token: patientToken,
  });
  const summaryMissingOk = [403, 404].includes(summaryMissing.status);
  logStep(
    'Patient report summary route returns controlled response for unavailable report',
    summaryMissingOk,
    `status=${summaryMissing.status}`
  );
  if (!summaryMissingOk) failures += 1;

  const patientForbiddenUsers = await request('/users', { token: patientToken });
  const forbiddenOk = patientForbiddenUsers.status === 403;
  logStep('Patient cannot access admin users API', forbiddenOk, `status=${patientForbiddenUsers.status}`);
  if (!forbiddenOk) failures += 1;

  if (patientId) {
    const adminGetPatient = await request(`/patients/${patientId}`, { token: adminToken });
    const adminPatientOk = adminGetPatient.ok && !!adminGetPatient.data?.data?.patient?._id;
    logStep('Admin can fetch created patient record', adminPatientOk, `status=${adminGetPatient.status}`);
    if (!adminPatientOk) failures += 1;
  }

  console.log(`\nCompleted with ${failures} failure(s).`);
  process.exitCode = failures > 0 ? 1 : 0;
}

run().catch((error) => {
  console.error('E2E script error:', error);
  process.exit(1);
});
