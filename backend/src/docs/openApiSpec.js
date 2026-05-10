/**
 * OpenAPI 3 snapshot for CareConnect 360 (NFR-29).
 *
 * Served at GET /api/openapi.json and interactive Swagger UI at GET /api/docs (same origin as API).
 * Expand `paths` as you stabilize more endpoints — this file is hand-maintained (not codegen).
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'CareConnect 360 API',
    description: 'Healthcare CRM REST API (MongoDB + Express). Bearer JWT on protected routes.',
    version: '1.0.0',
  },
  servers: [{ url: '/api', description: 'Same origin (append to backend base URL)' }],
  tags: [
    { name: 'Auth', description: 'Login, registration, password reset, email verification' },
    { name: 'Health', description: 'Liveness' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Backend health',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'JWT token + user' },
          '401': { description: 'Invalid credentials' },
          '403': { description: 'Email not verified (when ENFORCE_EMAIL_VERIFICATION=true)' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Patient self-registration',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstName', 'lastName', 'email', 'password', 'phone', 'dateOfBirth'],
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  phone: { type: 'string' },
                  dateOfBirth: { type: 'string', description: 'ISO date e.g. YYYY-MM-DD' },
                  gender: { type: 'string', enum: ['male', 'female', 'other'] },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Account created' },
          '409': { description: 'Email already registered' },
        },
      },
    },
    '/auth/verify-email/{token}': {
      get: {
        tags: ['Auth'],
        summary: 'Verify email via link',
        parameters: [
          { name: 'token', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Verified' },
          '400': { description: 'Invalid or expired token' },
        },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Resend verification email (authenticated)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Email queued if SMTP configured' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User profile' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } },
            },
          },
        },
        responses: { '200': { description: 'Generic success message' } },
      },
    },
    '/auth/reset-password/{token}': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newPassword', 'confirmPassword'],
                properties: {
                  newPassword: { type: 'string' },
                  confirmPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Password updated' }, '400': { description: 'Invalid token' } },
      },
    },
  },
};
