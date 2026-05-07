import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { dayBoundsInPakistan, todayBoundsInPakistan } from '../utils/dateTime.js';
import { paginationMeta, parsePagination, searchRegex } from '../utils/query.js';

const CRITICAL_ACTIONS = [
  'ROLE_CHANGED',
  'USER_DEACTIVATED',
  'STAFF_DEACTIVATED',
  'DOCTOR_DEACTIVATED',
  'PATIENT_ARCHIVED',
];

const statsCache = { data: null, ts: 0 };
const optionsCache = {
  actions: { data: null, ts: 0 },
  users: { data: null, ts: 0 },
};
const STATS_TTL_MS = 60_000;
const OPTIONS_TTL_MS = 5 * 60_000;

const buildDateRange = (fromRaw, toRaw) => {
  const today = todayBoundsInPakistan();
  if (!today) return { start: new Date(0), end: new Date() };
  const fromBounds = fromRaw ? dayBoundsInPakistan(fromRaw) : null;
  const toBounds = toRaw ? dayBoundsInPakistan(toRaw) : null;
  if (fromBounds && toBounds) return { start: fromBounds.start, end: toBounds.end };
  if (fromBounds) return { start: fromBounds.start, end: today.end };
  if (toBounds) {
    const start = new Date(toBounds.start);
    start.setDate(start.getDate() - 6);
    return { start, end: toBounds.end };
  }
  const start = new Date(today.start);
  start.setDate(start.getDate() - 6);
  return { start, end: today.end };
};

const parseSort = (sortByRaw, sortOrderRaw) => {
  const allowed = new Set(['createdAt', 'action', 'target', 'targetCollection', 'ipAddress']);
  const sortBy = allowed.has(String(sortByRaw || 'createdAt')) ? String(sortByRaw || 'createdAt') : 'createdAt';
  const sortOrder = String(sortOrderRaw || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  return { sortBy, sortOrder };
};

const buildBaseQuery = (query) => {
  const { start, end } = buildDateRange(query.from, query.to);
  const out = { createdAt: { $gte: start, $lte: end } };
  if (query.action) out.action = String(query.action).trim().toUpperCase();
  if (query.targetCollection) out.targetCollection = String(query.targetCollection).trim();
  if (query.ipAddress) out.ipAddress = String(query.ipAddress).trim();
  if (query.userId) out.userId = query.userId;
  return out;
};

const buildAggregationFilters = (query) => {
  const text = searchRegex(query.search);
  const role = String(query.role || '').trim();
  const stages = [];

  if (text) {
    stages.push({
      $match: {
        $or: [
          { 'user.name': text },
          { action: text },
          { target: text },
        ],
      },
    });
  }

  if (role) {
    if (role === 'system') {
      stages.push({
        $match: {
          $or: [
            { userId: null },
            { user: null },
          ],
        },
      });
    } else {
      stages.push({ $match: { 'user.role': role } });
    }
  }

  return stages;
};

const aggregateLogs = async ({
  baseQuery,
  query,
  sortBy,
  sortOrder,
  skip,
  limit,
  includePagination = true,
  exportMode = false,
}) => {
  const commonStages = [
    { $match: baseQuery },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    ...buildAggregationFilters(query),
  ];

  const projectionStage = {
    $project: {
      action: 1,
      target: 1,
      targetCollection: 1,
      details: 1,
      ipAddress: 1,
      userAgent: 1,
      createdAt: 1,
      user: {
        _id: '$user._id',
        name: '$user.name',
        email: '$user.email',
        role: '$user.role',
      },
      userId: 1,
    },
  };

  if (includePagination) {
    const [result] = await AuditLog.aggregate([
      ...commonStages,
      {
        $facet: {
          logs: [
            { $sort: { [sortBy]: sortOrder } },
            { $skip: skip },
            { $limit: limit },
            projectionStage,
          ],
          total: [{ $count: 'count' }],
        },
      },
      {
        $project: {
          logs: 1,
          total: { $ifNull: [{ $arrayElemAt: ['$total.count', 0] }, 0] },
        },
      },
    ]);

    return { logs: result?.logs || [], total: Number(result?.total || 0) };
  }

  const countRows = await AuditLog.aggregate([
    ...commonStages,
    { $count: 'count' },
  ]);
  const total = Number(countRows?.[0]?.count || 0);

  if (exportMode && total > 10000) {
    throw AppError.badRequest(`Too many records (${total}). Narrow your filters. Max export: 10,000 logs.`);
  }

  const logs = await AuditLog.aggregate([
    ...commonStages,
    { $sort: { [sortBy]: sortOrder } },
    projectionStage,
    ...(exportMode ? [] : [{ $limit: 10000 }]),
  ]);

  return { logs, total };
};

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
  const { sortBy, sortOrder } = parseSort(req.query.sortBy, req.query.sortOrder);
  const baseQuery = buildBaseQuery(req.query);
  const needsAggregation = Boolean(String(req.query.search || '').trim() || String(req.query.role || '').trim());

  if (needsAggregation) {
    const { logs, total } = await aggregateLogs({
      baseQuery,
      query: req.query,
      sortBy,
      sortOrder,
      skip,
      limit,
      includePagination: true,
    });
    return res.json({
      success: true,
      data: { logs, pagination: paginationMeta(total, page, limit) },
    });
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(baseQuery)
      .populate('userId', 'name email role')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(baseQuery),
  ]);

  const normalized = logs.map((log) => ({
    ...log,
    user: log.userId || null,
  }));

  return res.json({
    success: true,
    data: { logs: normalized, pagination: paginationMeta(total, page, limit) },
  });
});

export const getAuditStats = asyncHandler(async (_req, res) => {
  if (statsCache.data && Date.now() - statsCache.ts < STATS_TTL_MS) {
    return res.json({ success: true, data: statsCache.data });
  }

  const todayBounds = todayBoundsInPakistan();
  const todayStart = todayBounds?.start || new Date();
  const todayEnd = todayBounds?.end || new Date();

  const [totalToday, criticalToday, activeUsersToday] = await Promise.all([
    AuditLog.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    AuditLog.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      action: { $in: CRITICAL_ACTIONS },
    }),
    AuditLog.distinct('userId', {
      createdAt: { $gte: todayStart, $lte: todayEnd },
      userId: { $ne: null },
    }).then((ids) => ids.length),
  ]);

  const data = { totalToday, criticalToday, activeUsersToday, retentionDays: 365 };
  statsCache.data = data;
  statsCache.ts = Date.now();

  res.json({ success: true, data });
});

export const getAuditLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id)
    .populate('userId', 'name email role')
    .lean();
  if (!log) throw AppError.notFound('Audit log not found');

  res.json({
    success: true,
    data: {
      ...log,
      user: log.userId || null,
    },
  });
});

export const exportAuditLogs = asyncHandler(async (req, res) => {
  const { sortBy, sortOrder } = parseSort(req.query.sortBy, req.query.sortOrder);
  const baseQuery = buildBaseQuery(req.query);
  const needsAggregation = Boolean(String(req.query.search || '').trim() || String(req.query.role || '').trim());

  let logs;
  let total;

  if (needsAggregation) {
    ({ logs, total } = await aggregateLogs({
      baseQuery,
      query: req.query,
      sortBy,
      sortOrder,
      skip: 0,
      limit: 10000,
      includePagination: false,
      exportMode: true,
    }));
  } else {
    total = await AuditLog.countDocuments(baseQuery);
    if (total > 10000) {
      throw AppError.badRequest(`Too many records (${total}). Narrow your filters. Max export: 10,000 logs.`);
    }
    logs = await AuditLog.find(baseQuery)
      .populate('userId', 'name email role')
      .sort({ [sortBy]: sortOrder })
      .limit(10000)
      .lean();
    logs = logs.map((log) => ({ ...log, user: log.userId || null }));
  }

  res.json({
    success: true,
    data: { logs, total },
  });
});

export const getAuditActions = asyncHandler(async (_req, res) => {
  if (optionsCache.actions.data && Date.now() - optionsCache.actions.ts < OPTIONS_TTL_MS) {
    return res.json({ success: true, data: optionsCache.actions.data });
  }
  const actions = await AuditLog.distinct('action');
  const data = actions.sort();
  optionsCache.actions = { data, ts: Date.now() };
  res.json({ success: true, data });
});

export const getAuditUsers = asyncHandler(async (_req, res) => {
  if (optionsCache.users.data && Date.now() - optionsCache.users.ts < OPTIONS_TTL_MS) {
    return res.json({ success: true, data: optionsCache.users.data });
  }
  const userIds = await AuditLog.distinct('userId', { userId: { $ne: null } });
  const users = await User.find({ _id: { $in: userIds } })
    .select('name email role')
    .sort({ name: 1 })
    .lean();
  optionsCache.users = { data: users, ts: Date.now() };
  res.json({ success: true, data: users });
});
