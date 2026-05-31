/** Merge JSON `data` field from multipart PUT into req.body for validation */
export const parseConsultationPutBody = (req, res, next) => {
  if (req.body?.data && typeof req.body.data === 'string') {
    try {
      const parsed = JSON.parse(req.body.data);
      req.parsedConsultationBody = { ...parsed, ...req.body };
      delete req.parsedConsultationBody.data;
      req.body = req.parsedConsultationBody;
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid consultation data JSON' });
    }
  } else {
    req.parsedConsultationBody = req.body;
  }
  return next();
};
