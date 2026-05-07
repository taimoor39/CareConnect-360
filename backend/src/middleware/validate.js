import { validationResult } from 'express-validator';

const MAX_ERRORS_RETURNED = 20;

export const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result
    .array()
    .slice(0, MAX_ERRORS_RETURNED)
    .map(({ path, msg }) => ({ field: path, message: msg }));

  return res.status(400).json({ success: false, errors });
};
