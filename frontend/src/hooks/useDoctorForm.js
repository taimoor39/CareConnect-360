import { useMemo, useState } from 'react';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10,15}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const workingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const asNumberOrEmpty = (value) => (value === '' || value === null || typeof value === 'undefined' ? '' : Number(value));

const checkPasswordStrength = (password) => {
  const value = String(password || '');
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (value.length >= 12) score += 1;
  return score;
};

const getStrengthMeta = (score) => {
  if (score <= 2) return { label: 'Weak', color: 'bg-rose-400', width: `${Math.max(20, score * 20)}%` };
  if (score === 3) return { label: 'Fair', color: 'bg-amber-400', width: '60%' };
  return { label: 'Strong', color: 'bg-emerald-400', width: `${Math.min(100, 60 + (score - 3) * 20)}%` };
};

const baseInitial = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  specialization: '',
  qualification: '',
  schedule: {
    days: [],
    shiftStart: '',
    shiftEnd: '',
    maxPatientsPerDay: 20,
    consultationDurationMins: 30,
  },
  bio: '',
  isActive: true,
};

export const defaultDoctorForm = baseInitial;

export default function useDoctorForm(initial = baseInitial, options = { mode: 'create' }) {
  const [formData, setFormData] = useState(initial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const mode = options.mode || 'create';

  const validateField = (field, value, draft = formData) => {
    const validators = {
      firstName: () => {
        const text = String(value || '').trim();
        if (!text) return 'First name is required';
        if (text.length < 2) return 'First name must be at least 2 characters';
        if (!/^[A-Za-z\s]+$/.test(text)) return 'First name must contain letters only';
        return '';
      },
      lastName: () => {
        const text = String(value || '').trim();
        if (!text) return 'Last name is required';
        if (text.length < 2) return 'Last name must be at least 2 characters';
        return '';
      },
      email: () => {
        const text = String(value || '').trim();
        if (!text) return 'Email is required';
        if (!emailRegex.test(text)) return 'Invalid email format';
        return '';
      },
      phone: () => {
        const text = String(value || '').trim();
        if (!text) return 'Phone is required';
        if (!phoneRegex.test(text)) return 'Phone must be 10-15 digits';
        return '';
      },
      password: () => {
        const text = String(value || '');
        const passwordRequired = mode === 'create' || (mode === 'edit' && text.length > 0);
        if (!passwordRequired) return '';
        if (text.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(text)) return 'Password must include 1 uppercase letter';
        if (!/[0-9]/.test(text)) return 'Password must include 1 number';
        return '';
      },
      confirmPassword: () => {
        const text = String(value || '');
        const hasPassword = String(draft.password || '').length > 0;
        const required = mode === 'create' || hasPassword;
        if (!required) return '';
        if (!text) return 'Confirm password is required';
        if (text !== String(draft.password || '')) return 'Passwords do not match';
        return '';
      },
      specialization: () => {
        const text = String(value || '').trim();
        if (!text) return 'Specialization is required';
        if (text.length < 2) return 'Specialization must be at least 2 characters';
        return '';
      },
      qualification: () => {
        const text = String(value || '').trim();
        if (!text) return 'Qualification is required';
        if (text.length < 2) return 'Qualification must be at least 2 characters';
        return '';
      },
      'schedule.days': () => {
        if (!Array.isArray(value) || value.length === 0) return 'Please select at least one working day';
        return '';
      },
      'schedule.shiftStart': () => {
        const text = String(value || '');
        if (!text) return '';
        if (!timeRegex.test(text)) return 'Format: HH:MM';
        return '';
      },
      'schedule.shiftEnd': () => {
        const text = String(value || '');
        if (!text) return '';
        if (!timeRegex.test(text)) return 'Format: HH:MM';
        return '';
      },
      'schedule.maxPatientsPerDay': () => {
        const num = asNumberOrEmpty(value);
        if (num === '') return '';
        if (Number.isNaN(num) || num < 1 || num > 100) return 'Between 1 and 100';
        return '';
      },
      'schedule.consultationDurationMins': () => {
        const num = asNumberOrEmpty(value);
        if (num === '') return '';
        if (Number.isNaN(num) || num < 10 || num > 120) return 'Between 10 and 120 minutes';
        return '';
      },
    };

    if (!validators[field]) return '';
    return validators[field]();
  };

  const validate = () => {
    const nextErrors = {};
    let fields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'password',
      'confirmPassword',
      'specialization',
      'qualification',
      'schedule.days',
      'schedule.shiftStart',
      'schedule.shiftEnd',
      'schedule.maxPatientsPerDay',
      'schedule.consultationDurationMins',
    ];

    if (mode === 'edit') {
      fields = [
        'specialization',
        'qualification',
        'schedule.days',
        'schedule.shiftStart',
        'schedule.shiftEnd',
        'schedule.maxPatientsPerDay',
        'schedule.consultationDurationMins',
      ];
    }

    fields.forEach((field) => {
      const value = field.startsWith('schedule.') ? formData.schedule[field.replace('schedule.', '')] : formData[field];
      const message = validateField(field, value, formData);
      if (message) nextErrors[field] = message;
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = field.startsWith('schedule.') ? formData.schedule[field.replace('schedule.', '')] : formData[field];
    const message = validateField(field, value, formData);
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev };
      if (field.startsWith('schedule.')) {
        const key = field.replace('schedule.', '');
        next.schedule = { ...prev.schedule, [key]: value };
      } else {
        next[field] = value;
      }
      return next;
    });

    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (field === 'password') {
        delete next.confirmPassword;
      }
      if (field === 'schedule.days' && Array.isArray(value) && value.length > 0) {
        delete next['schedule.days'];
      }
      if (field === 'schedule.shiftStart') {
        const draft = {
          ...formData,
          schedule: { ...formData.schedule, shiftStart: value },
        };
        const shiftEndError = validateField('schedule.shiftEnd', draft.schedule.shiftEnd, draft);
        if (shiftEndError) next['schedule.shiftEnd'] = shiftEndError;
        else delete next['schedule.shiftEnd'];
      }
      return next;
    });
  };

  const passwordStrength = useMemo(() => {
    const score = checkPasswordStrength(formData.password);
    return { score, ...getStrengthMeta(score) };
  }, [formData.password]);

  const reset = (next = baseInitial) => {
    setFormData(next);
    setErrors({});
    setTouched({});
  };

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    touched,
    validate,
    handleChange,
    handleBlur,
    passwordStrength,
    reset,
    validDays: workingDays,
  };
}
