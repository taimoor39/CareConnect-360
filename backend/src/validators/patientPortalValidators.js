import { body, param } from 'express-validator';

export const patientReportIdValidator = [param('reportId').isMongoId().withMessage('Invalid report id')];

/** PUT /api/patient/profile — whitelisted fields only; rejects restricted keys. */
export const updateProfileValidator = [
  body('firstName')
    .optional({ values: 'falsy' })
    .isLength({ min: 2, max: 30 })
    .withMessage('Min 2 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Letters only'),
  body('lastName').optional({ values: 'falsy' }).isLength({ min: 2, max: 30 }).withMessage('Min 2 characters').trim(),
  body('phone').optional({ values: 'falsy' }).matches(/^[0-9]{10,15}$/).withMessage('10–15 digits only'),
  body('dateOfBirth')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Invalid date of birth')
    .custom((dob) => {
      const ageMs = Date.now() - new Date(dob).getTime();
      const ageYears = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
      if (ageYears < 0 || ageYears > 150) throw new Error('Invalid date of birth');
      return true;
    }),
  body('gender')
    .optional({ values: 'falsy' })
    .isIn(['Male', 'Female', 'Other', 'male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender'),
  body('address.line1').optional({ values: 'falsy' }).isString().isLength({ max: 200 }).trim(),
  body('address.city').optional({ values: 'falsy' }).isString().isLength({ max: 100 }).trim(),
  body('addressLine1').optional({ values: 'falsy' }).isString().isLength({ max: 200 }).trim(),
  body('city').optional({ values: 'falsy' }).isString().isLength({ max: 100 }).trim(),
  body('emergencyContact.name').optional({ values: 'falsy' }).isString().isLength({ max: 120 }).trim(),
  body('emergencyContact.phone')
    .optional({ values: 'falsy' })
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Invalid phone format'),
  body('emergencyContact.relation').optional({ values: 'falsy' }).isString().isLength({ max: 80 }).trim(),
  body('emergencyContactName').optional({ values: 'falsy' }).isString().isLength({ max: 120 }).trim(),
  body('emergencyContactPhone')
    .optional({ values: 'falsy' })
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Invalid phone format'),
  body('emergencyContactRelation').optional({ values: 'falsy' }).isString().isLength({ max: 80 }).trim(),
  body('bloodGroup').not().exists().withMessage('Cannot update blood group here'),
  body('status').not().exists().withMessage('Cannot update status here'),
  body('medicalHistory').not().exists().withMessage('Cannot update medical history here'),
  body('medicalNotes').not().exists().withMessage('Cannot update medical notes here'),
  body('medical').not().exists().withMessage('Cannot update medical record here'),
  body('isArchived').not().exists().withMessage('Cannot update archive flag here'),
];
