import SystemSettings from '../models/SystemSettings.js';

const DEFAULT_AI_URL = 'http://localhost:8001';

export const ensureSettingsDoc = async () =>
  SystemSettings.findOneAndUpdate(
    {},
    { $setOnInsert: { singletonKey: 'default' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

/** AI base URL from admin settings, then env, then localhost default. */
export const resolveAiServiceUrl = (settings) => {
  const fromDb = String(settings?.aiService?.url || '').trim();
  if (fromDb) return fromDb.replace(/\/$/, '');
  const fromEnv = String(process.env.AI_SERVICE_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return DEFAULT_AI_URL;
};

/** True when SMTP is configured in SystemSettings (same rules as emailService). */
export const isEmailConfigured = (settings) => {
  const email = settings?.email || {};
  const host = String(email.smtpHost || '').trim();
  const user = String(email.smtpUser || '').trim();
  const passInDb = String(email.smtpPass || '').trim();
  const passInEnv = String(process.env.SMTP_PASS || '').trim();
  return Boolean(host && user && (passInDb || passInEnv));
};

export const probeAiService = async (baseUrl, timeoutMs = 5000) => {
  const url = `${baseUrl.replace(/\/$/, '')}/api/health`;
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const responseMs = Date.now() - start;
    if (!response.ok) {
      return { status: 'Offline', responseMs, url: baseUrl, error: `HTTP ${response.status}` };
    }
    return {
      status: responseMs > 2000 ? 'Slow' : 'Online',
      responseMs,
      url: baseUrl,
      warning: responseMs > 2000 ? 'AI responses are slower than expected' : '',
    };
  } catch (err) {
    return {
      status: 'Offline',
      responseMs: Date.now() - start,
      url: baseUrl,
      warning: 'AI summarization unavailable',
      error: err?.message || 'unreachable',
    };
  } finally {
    clearTimeout(timer);
  }
};

/** Settings page health probe (lowercase status for UI). */
export const probeAiServiceForSettings = async (settings) => {
  const baseUrl = resolveAiServiceUrl(settings);
  const timeoutMs = Math.min(Math.max(Number(settings?.aiService?.timeoutSeconds || 5) * 1000, 3000), 10000);
  const result = await probeAiService(baseUrl, timeoutMs);
  const map = { Online: 'online', Slow: 'slow', Offline: 'offline' };
  return {
    status: map[result.status] || 'error',
    responseMs: result.responseMs,
    url: baseUrl,
    checkedAt: new Date().toISOString(),
  };
};
