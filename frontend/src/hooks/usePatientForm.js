import { useMemo, useRef, useState } from 'react';
import { parseLocalDateFromISO, toISOInputValue } from '../utils/isoDate.js';

export const defaultPatientForm = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  email: '',
  bloodGroup: '',
  status: 'Active',
  addressStreet: '',
  city: '',
  medicalNotes: '',
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10,15}$/;
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const genders = ['Male', 'Female', 'Other'];

const toAge = (value) => {
  if (!value) return null;
  const dob = parseLocalDateFromISO(value);
  if (!dob) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const thisYearBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
  if (now < thisYearBirthday) years -= 1;
  return years;
};

function validateField(name, formData) {
  const value = formData[name];

  if (name === 'firstName') {
    if (!String(value || '').trim() || String(value || '').trim().length < 2 || !/^[a-zA-Z\s]+$/.test(String(value || '').trim())) {
      return 'First name must be at least 2 characters';
    }
    return '';
  }

  if (name === 'lastName') {
    if (!String(value || '').trim() || String(value || '').trim().length < 2) {
      return 'Last name is required';
    }
    return '';
  }

  if (name === 'phone') {
    if (!phoneRegex.test(String(value || '').trim())) {
      return 'Enter a valid phone number (10-15 digits)';
    }
    return '';
  }

  if (name === 'email') {
    if (!String(value || '').trim()) return '';
    if (!emailRegex.test(String(value || '').trim())) {
      return 'Enter a valid email address';
    }
    return '';
  }

  if (name === 'dateOfBirth') {
    const dob = parseLocalDateFromISO(value);
    const age = toAge(value);
    const today = parseLocalDateFromISO(toISOInputValue(new Date()));
    if (!value || !dob || (today && dob >= today) || age === null || age < 0 || age > 150) {
      return 'Please enter a valid date of birth';
    }
    return '';
  }

  if (name === 'gender') {
    if (!genders.includes(String(value || ''))) {
      return 'Please select a gender';
    }
    return '';
  }

  if (name === 'bloodGroup') {
    if (!String(value || '').trim()) return '';
    if (!bloodGroups.includes(String(value || ''))) {
      return 'Invalid blood group';
    }
    return '';
  }

  return '';
}

export default function usePatientForm(initialData = defaultPatientForm) {
  const [formData, setFormData] = useState({ ...initialData });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const fieldRefs = useRef({});

  const requiredMissing = useMemo(() => {
    return !String(formData.firstName || '').trim()
      || !String(formData.lastName || '').trim()
      || !String(formData.phone || '').trim()
      || !String(formData.dateOfBirth || '').trim()
      || !String(formData.gender || '').trim();
  }, [formData]);

  const agePreview = useMemo(() => {
    const age = toAge(formData.dateOfBirth);
    if (age === null || age < 0 || age > 150) return '';
    return `Age: ${age} years`;
  }, [formData.dateOfBirth]);

  const registerFieldRef = (name, node) => {
    fieldRefs.current[name] = node;
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, formData);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateAll = () => {
    const nextErrors = {
      firstName: validateField('firstName', formData),
      lastName: validateField('lastName', formData),
      phone: validateField('phone', formData),
      email: validateField('email', formData),
      dateOfBirth: validateField('dateOfBirth', formData),
      gender: validateField('gender', formData),
      bloodGroup: validateField('bloodGroup', formData),
    };

    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      gender: true,
      bloodGroup: true,
    });
    setErrors(nextErrors);

    const firstError = Object.keys(nextErrors).find((key) => nextErrors[key]);
    if (firstError && fieldRefs.current[firstError]) {
      fieldRefs.current[firstError].scrollIntoView({ behavior: 'smooth', block: 'center' });
      fieldRefs.current[firstError].focus();
    }

    return !firstError;
  };

  const reset = (nextData = defaultPatientForm) => {
    setFormData({ ...nextData });
    setErrors({});
    setTouched({});
  };

  return {
    formData,
    errors,
    touched,
    agePreview,
    requiredMissing,
    registerFieldRef,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setErrors,
  };
}
