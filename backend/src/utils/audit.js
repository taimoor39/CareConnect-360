import auditLogger, { inferTargetCollection } from './auditLogger.js';

export const createAudit = ({
  userId,
  action,
  target,
  targetCollection,
  details = {},
  req = null,
}) => auditLogger({
  userId,
  action,
  target,
  targetCollection: targetCollection || inferTargetCollection(target),
  details,
  req,
});

export const auditFromReq = (req, action, target, details = {}, targetCollection = '') =>
  createAudit({
    userId: req?.user?._id || null,
    action,
    target,
    targetCollection: targetCollection || inferTargetCollection(target),
    details,
    req,
  });
