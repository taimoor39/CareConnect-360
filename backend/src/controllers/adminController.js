import DoctorProfile from '../models/DoctorProfile.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';

import asyncHandler from '../utils/asyncHandler.js';

/**
 * One-time migration: ensure every patient-role User has a Patient record.
 */
export const migratePatientUsers = asyncHandler(async (_req, res) => {
  const patientUsers = await User.find({ role: 'patient' }).lean();
  let created = 0;

  for (const user of patientUsers) {
    const exists = await Patient.findOne({ userId: user._id }).lean();
    if (exists) continue;

    const count = await Patient.countDocuments();
    const year = new Date().getFullYear();
    const patientId = `PAT-${year}-${String(count + 1).padStart(4, '0')}`;
    const parts = user.name ? user.name.split(' ') : ['Patient'];

    await Patient.create({
      patientId,
      name: user.name,
      firstName: parts[0] || 'Patient',
      lastName: parts.slice(1).join(' ') || 'User',
      dateOfBirth: new Date('1990-01-01'),
      email: user.email,
      phone: user.phone,
      status: user.isActive ? 'Active' : 'Inactive',
      isArchived: false,
      userId: user._id,
      registeredBy: user._id,
    });
    created++;
  }

  res.json({ success: true, message: `${patientUsers.length} patient users processed, ${created} records created` });
});

/**
 * One-time migration: ensure every doctor-role User has a DoctorProfile.
 */
export const migrateDoctorUsers = asyncHandler(async (_req, res) => {
  const doctorUsers = await User.find({ role: 'doctor' }).lean();
  let linked = 0;
  let created = 0;

  for (const user of doctorUsers) {
    const exists = await DoctorProfile.findOne({ userId: user._id }).lean();
    if (exists) {
      linked++;
      continue;
    }

    await DoctorProfile.create({
      userId: user._id,
      specialization: '',
      qualification: '',
      schedule: { days: [], shiftStart: '', shiftEnd: '', maxPatientsPerDay: 20, consultationDurationMins: 30 },
      isProfileComplete: false,
      isActive: user.isActive,
    });
    created++;
  }

  res.json({ success: true, message: `${linked} already linked, ${created} profiles created` });
});
