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

  const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
  if (manifest.status !== 200) {
    throw new Error(`GET /manifest.webmanifest returned ${manifest.status}`);
  }

  console.log('Runtime smoke test passed: /, /api/user/profile, and manifest.webmanifest');
} finally {
  stop();
}
