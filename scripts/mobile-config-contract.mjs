import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const capacitor = JSON.parse(fs.readFileSync(new URL('../capacitor.config.json', import.meta.url), 'utf8'));
const vite = fs.readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
const apiClient = fs.readFileSync(new URL('../src/lib/apiClient.ts', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const env = fs.readFileSync(new URL('../.env.mobile', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

assert.equal(capacitor.appId, 'com.dugsipro.app');
assert.equal(capacitor.webDir, 'dist-mobile');
assert.match(packageJson.scripts['build:mobile'], /vite build --mode mobile/);
assert.match(vite, /outDir: isMobileBuild \? 'dist-mobile' : 'dist'/);
assert.match(vite, /base: isMobileBuild \? '\.\/' : '\/'/);
assert.match(env, /^VITE_API_BASE_URL=https:\/\/samatar-project\.onrender\.com\s*$/m);
assert.match(apiClient, /VITE_API_BASE_URL/);
assert.match(apiClient, /X-Dugsi-Client/);
assert.match(server, /capacitor:\/\/localhost/);
assert.match(server, /https:\/\/localhost/);
assert.match(server, /isCapacitorClient\(req\)/);
assert.match(app, /MODE === 'mobile' && publicRoute === 'signup'/, 'native signup must return to login instead of opening a tokenless dashboard');
assert.match(app, /MODE === 'mobile' && !payload\.token/, 'native login must reject success responses without a bearer token');
assert.match(styles, /mobile-safe-bottom/);
assert.match(styles, /prefers-reduced-motion/);

console.log('Mobile contract checks passed: isolated bundle, shared Render API, native CORS and token gating.');
