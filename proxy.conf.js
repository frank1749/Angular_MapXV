const { readFileSync } = require('fs');
const { resolve } = require('path');

// ---------------------------------------------------------------------------
// Load .env manually (no external dependency needed)
// ---------------------------------------------------------------------------
const envPath = resolve(__dirname, '.env');
const env = {};
try {
  readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) env[key.trim()] = rest.join('=').trim();
    });
} catch {
  console.warn('[proxy] .env not found — OpenSky requests will be anonymous');
}

const CLIENT_ID = env['OPENSKY_CLIENT_ID'];
const CLIENT_SECRET = env['OPENSKY_CLIENT_SECRET'];

// ---------------------------------------------------------------------------
// OAuth2 token cache (always-warm pattern)
// OpenSky exclusively uses OAuth2 client credentials — Basic Auth is rejected.
// Tokens expire after 1800 s (30 min). We refresh 60 s before expiry so
// every proxy request can synchronously inject a valid Bearer token.
// ---------------------------------------------------------------------------
const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

let currentToken = null;
let refreshTimer = null;

async function fetchToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function refreshToken() {
  try {
    const data = await fetchToken();
    currentToken = data.access_token;
    console.log('[proxy] OpenSky Bearer token acquired');

    // Schedule next refresh 60 s before expiry (minimum 60 s)
    const refreshInMs = Math.max((data.expires_in - 60) * 1000, 60_000);
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshToken, refreshInMs);
  } catch (err) {
    console.error('[proxy] Failed to fetch OpenSky token:', err.message);
    // Retry in 30 s
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshToken, 30_000);
  }
}

// Kick off token fetch at proxy startup (non-blocking)
if (CLIENT_ID && CLIENT_SECRET) {
  refreshToken();
} else {
  console.warn('[proxy] OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET not set — requests will be anonymous');
}

// ---------------------------------------------------------------------------
// Proxy configuration (Vite / Angular dev-server format)
// The `configure` hook fires once per proxy setup and lets us listen to the
// synchronous `proxyReq` event to inject the cached Bearer token per-request.
// ---------------------------------------------------------------------------
module.exports = {
  '/api': {
    target: 'https://opensky-network.org',
    secure: true,
    changeOrigin: true,
    logLevel: 'info',
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        if (currentToken) {
          proxyReq.setHeader('Authorization', `Bearer ${currentToken}`);
        }
      });
    },
  },
};
