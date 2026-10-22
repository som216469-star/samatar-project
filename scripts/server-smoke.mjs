import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import process from 'node:process';

const port = 4179;
const baseUrl = `http://127.0.0.1:${port}`;
const smokeSessionSecret = 'ci-smoke-test-secret-32-characters-minimum';

function createSmokeSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    iat: now,
    exp: now + 12 * 60 * 60,
    jti: crypto.randomBytes(16).toString('hex'),
    user: {
      email: 'smoke@example.test',
      role: 'admin',
      schoolId: 'smoke-school'
    }
  };
  const payloadSegment = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const secret = crypto.createHash('sha256').update(smokeSessionSecret, 'utf8').digest();
  const signature = crypto.createHmac('sha256', secret).update(payloadSegment, 'utf8').digest('base64url');
  return `s1.${payloadSegment}.${signature}`;
}

const child = spawn(process.execPath, ['dist/server.cjs'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    SESSION_SECRET: smokeSessionSecret,
    QUANTORA_SKIP_DOTENV: '1',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    SUPABASE_PUBLISHABLE_KEY: '',
    SUPABASE_SECRET_KEY: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    SUPABASE_JWKS_URL: ''
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', (chunk) => { output += chunk.toString(); });
child.stderr.on('data', (chunk) => { output += chunk.toString(); });

function stop() {
  if (!child.killed) child.kill('SIGTERM');
}

async function waitForServer(timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseUrl);
      return response;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Server did not become ready: ${lastError?.message || 'unknown error'}\\n${output}`);
}

try {
  const home = await waitForServer();
  if (home.status !== 200) {
    throw new Error(`GET / returned ${home.status}`);
  }

  const html = await home.text();
  if (!html.includes('<div id="root"></div>')) {
    throw new Error('GET / did not return the built SPA shell');
  }

  const session = await fetch(`${baseUrl}/api/user/profile`);
  if (session.status !== 401) {
    throw new Error(`GET /api/user/profile expected 401 without a session, got ${session.status}`);
  }

  const sessionToken = createSmokeSessionToken();
  const authHeaders = { Authorization: `Bearer ${sessionToken}` };

  const dbStatus = await fetch(`${baseUrl}/api/db/status`, { headers: authHeaders });
  if (dbStatus.status !== 200) {
    throw new Error(`Authenticated GET /api/db/status should remain available for diagnostics, got ${dbStatus.status}`);
  }
  const dbStatusBody = await dbStatus.json();
  if (dbStatusBody.connected !== false || dbStatusBody.customSupabaseActive !== false) {
    throw new Error('Smoke test requires Supabase to be unavailable so production fail-closed behavior is exercised');
  }

  const studentsWhenDatabaseUnavailable = await fetch(`${baseUrl}/api/students`, { headers: authHeaders });
  if (studentsWhenDatabaseUnavailable.status !== 503) {
    throw new Error(`GET /api/students should fail closed when production database is unavailable, got ${studentsWhenDatabaseUnavailable.status}`);
  }

  const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: authHeaders });
  if (logout.status !== 200) {
    throw new Error(`POST /api/auth/logout should remain available to clear the session, got ${logout.status}`);
  }

  const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
  if (manifest.status !== 200) {
    throw new Error(`GET /manifest.webmanifest returned ${manifest.status}`);
  }

  console.log('Runtime smoke test passed: SPA shell, unauthenticated profile, DB diagnostics, fail-closed data API, logout, and manifest');
} finally {
  stop();
}
