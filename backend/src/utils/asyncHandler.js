/**
 * Wraps an async Express route handler so that rejected promises
 * are forwarded to next() automatically — eliminating repetitive
 * try/catch blocks in every controller.
 *
 * Usage:
 *   export const listUsers = asyncHandler(async (req, res) => {
 *     const users = await User.find();
 *     res.json({ success: true, data: users });
 *   });
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
