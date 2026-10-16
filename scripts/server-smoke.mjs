import { spawn } from 'node:child_process';
import process from 'node:process';

const port = 4179;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['dist/server.cjs'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    SESSION_SECRET: 'ci-smoke-test-secret-32-characters-minimum'
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
  throw new Error(`Server did not become ready: ${lastError?.message || 'unknown error'}\n${output}`);
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

  const dbStatus = await fetch(`${baseUrl}/api/db/status`);
  if (dbStatus.status !== 200) {
    throw new Error(`GET /api/db/status should remain available for diagnostics, got ${dbStatus.status}`);
  }

  const studentsWhenDatabaseUnavailable = await fetch(`${baseUrl}/api/students`);
  if (studentsWhenDatabaseUnavailable.status !== 503) {
    throw new Error(`GET /api/students should fail closed when production database is unavailable, got ${studentsWhenDatabaseUnavailable.status}`);
  }

  const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
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
