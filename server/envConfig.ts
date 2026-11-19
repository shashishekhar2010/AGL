/**
 * Centralized server-side environment variable reader for local & hosted Node backends.
 * Supports CORS_ORIGIN so a static GitHub Pages frontend can talk securely to this server.
 */
function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const val = process.env[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
}

export function getServerEnv() {
  return {
    apiKey: readEnv('GEMINI_API_KEY', 'API_KEY'),
    appUrl: readEnv('APP_URL'),
    corsOrigin: readEnv('CORS_ORIGIN'),
    resendApiKey: readEnv('RESEND_API_KEY'),
    enquiryToEmail: readEnv('ENQUIRY_TO_EMAIL'),
    enquiryWebhookUrl: readEnv('ENQUIRY_WEBHOOK_URL'),
    adminSessionSecret: readEnv('ADMIN_SESSION_SECRET'),
    superAdminUsername: readEnv('SUPER_ADMIN_USERNAME'),
    superAdminPassword: readEnv('SUPER_ADMIN_PASSWORD'),
    adminUsername: readEnv('ADMIN_USERNAME'),
    adminPassword: readEnv('ADMIN_PASSWORD'),
  };
}
