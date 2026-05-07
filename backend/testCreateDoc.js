import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import DoctorProfile from './src/models/DoctorProfile.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const email = `test.doc.${Date.now()}@careconnect.local`;

  // Simulate controller behavior
  const user = await User.create({
    name: 'Test Doctor User',
    email,
    password: 'Password123!',
    phone: '1234567890',
    role: 'doctor',
    specialization: '',
    qualification: '',
    isActive: true,
  });

  console.log('User created:', user._id);

  const profile = await DoctorProfile.create({
    userId: user._id,
    specialization: '',
    qualification: '',
    schedule: {
      days: [],
      shiftStart: '',
      shiftEnd: '',
      maxPatientsPerDay: 20,
      consultationDurationMins: 30
    },
    isProfileComplete: false,
    isActive: true
  });

  console.log('Profile created:', profile._id);

  await mongoose.disconnect();
}

run().catch(console.error);
