#!/usr/bin/env node
// Claude Arcade — Super Mario Runner — Zero-dependency game server
// Serves webview/super-mario-runner.html + SSE endpoint for real-time token data.
//
// Usage:
//   node super-mario-runner.js                      Launch in background, open browser
//   node super-mario-runner.js --port 4000          Use custom port
//   node super-mario-runner.js --session <id>       Lock to a specific session
//   node super-mario-runner.js --stop [--port N]    Stop a running instance
//   node super-mario-runner.js --status [--port N]  Check if a server is running
//   node super-mario-runner.js --foreground         Run in foreground (do not fork)
//
// The default mode forks the actual server into the background so the calling
// shell returns immediately. This works on macOS, Linux, and Windows without
// needing shell-specific backgrounding (`&` does not background on cmd.exe).

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// ── Constants ──
const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const LIVE_DATA_FILE = path.join(HOME, '.claude', 'token-graph-live.jsonl');
const HTML_FILE = path.join(__dirname, '..', 'webview', 'super-mario-runner.html');
const WEBVIEW_DIR = path.join(__dirname, '..', 'webview');
const DEFAULT_PORT = 3248;
const WATCH_INTERVAL = 500;
const READY_POLL_INTERVAL = 100;
const READY_TIMEOUT_MS = 5000;
const SERVER_FINGERPRINT = 'claude-arcade/super-mario-runner';

// ── CLI args ──
const args = process.argv.slice(2);
let sessionId = null;
let port = DEFAULT_PORT;
let mode = 'launch'; // 'launch' (default), 'foreground', 'stop', 'status'

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--session' && args[i + 1]) { sessionId = args[++i]; continue; }
  if (a === '--port' && args[i + 1]) {
    const p = parseInt(args[++i], 10);
    if (!(p >= 1024 && p <= 65535)) {
      console.error('Invalid --port: must be between 1024 and 65535');
      process.exit(1);
    }
    port = p;
    continue;
  }
  if (a === '--foreground') { mode = 'foreground'; continue; }
  if (a === '--stop') { mode = 'stop'; continue; }
  if (a === '--status') { mode = 'status'; continue; }
  if (a === '--help' || a === '-h') {
    console.log(readUsage());
    process.exit(0);
  }
}

// Internal: when re-spawned by the parent, we get this env var.
const isChild = process.env.CLAUDE_ARCADE_CHILD === '1';

// ── Dispatch ──
(async function main() {
  if (mode === 'stop') return runStop();
  if (mode === 'status') return runStatus();
  if (mode === 'foreground' || isChild) return runServer();
  return runLauncher();
})().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// ── Mode: launcher (parent — forks itself detached, opens browser) ──
async function runLauncher() {
  if (!sessionId) sessionId = findLatestSessionId();

  const alive = await checkExistingServer(port);
  if (alive) {
    const url = buildUrl(port);
    printBanner(url, sessionId, 'already running');
    openBrowser(url);
    process.exit(0);
  }

  const child = spawn(process.execPath, [__filename, ...rebuildArgs(['--foreground'])], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: Object.assign({}, process.env, { CLAUDE_ARCADE_CHILD: '1' }),
  });
  child.unref();

  const ready = await waitForPort(port, READY_TIMEOUT_MS);
  if (!ready) {
    console.error('Server did not start within ' + (READY_TIMEOUT_MS / 1000) + 's on port ' + port + '.');
    console.error('Try --foreground for diagnostics, or --port <N> to use a different port.');
    process.exit(1);
  }

  const url = buildUrl(port);
  printBanner(url, sessionId, 'started');
  openBrowser(url);
  process.exit(0);
}

// ── Mode: server (child — actually serves HTTP + SSE + watches JSONL) ──
function runServer() {
  if (!sessionId) sessionId = findLatestSessionId();

  let sseClients = [];
  let lastSize = 0;
  let lineBuffer = '';
  try { lastSize = fs.statSync(LIVE_DATA_FILE).size; } catch {}

  const server = http.createServer((req, res) => {
    let url;
    try { url = new URL(req.url, 'http://localhost:' + port); }
    catch { res.writeHead(400); res.end('Bad request'); return; }

    if (url.pathname === '/__stop') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('stopping');
      shutdown(server, sseClients);
      return;
    }

    if (url.pathname === '/events') {
      const sid = url.searchParams.get('session') || sessionId || findLatestSessionId();
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write('retry: 1000\n\n');

      const entries = readEntries(sid);
      if (entries.length > 0) {
        const latest = entries[entries.length - 1];
        const payload = {
          totalInput: latest.totalInput || 0,
          totalOutput: latest.totalOutput || 0,
          costUSD: latest.costUSD || 0,
          contextPct: latest.contextPct || 0,
          model: latest.model || 'Unknown',
          startedAt: entries[0].ts,
        };
        res.write('data: ' + JSON.stringify(payload) + '\n\n');
      }

      const client = { res, sid, startedAt: entries.length > 0 ? entries[0].ts : 0 };
      sseClients.push(client);
      req.on('close', () => { sseClients = sseClients.filter(c => c !== client); });
      return;
    }

    if (url.pathname.startsWith('/js/') && url.pathname.endsWith('.js')) {
      const resolved = path.resolve(WEBVIEW_DIR, url.pathname.slice(1));
      if (!resolved.startsWith(path.resolve(WEBVIEW_DIR))) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      try {
        const js = fs.readFileSync(resolved, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' });
        res.end(js);
      } catch {
        res.writeHead(404); res.end('Not found: ' + url.pathname);
      }
      return;
    }

    try {
      const html = fs.readFileSync(HTML_FILE, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html', 'X-Server': SERVER_FINGERPRINT });
      res.end(html);
    } catch (err) {
      res.writeHead(500);
      res.end('Error loading game: ' + err.message);
    }
  });

  fs.watchFile(LIVE_DATA_FILE, { interval: WATCH_INTERVAL }, () => {
    try {
      const stat = fs.statSync(LIVE_DATA_FILE);
      if (stat.size < lastSize) { lastSize = 0; lineBuffer = ''; }
      if (stat.size <= lastSize) return;

      const fd = fs.openSync(LIVE_DATA_FILE, 'r');
      let raw;
      try {
        const buf = Buffer.alloc(stat.size - lastSize);
        fs.readSync(fd, buf, 0, buf.length, lastSize);
        raw = buf.toString('utf-8');
      } finally {
        fs.closeSync(fd);
      }
      lastSize = stat.size;

      const parts = (lineBuffer + raw).split('\n');
      lineBuffer = parts.pop();

      for (const line of parts) {
        if (!line.trim()) continue;
        let entry;
        try { entry = JSON.parse(line); } catch { continue; }
        for (const client of sseClients) {
          if (client.sid && entry.sessionId !== client.sid) continue;
          if (!client.startedAt) client.startedAt = entry.ts;
          let payload;
          if (entry.type === 'waiting') {
            payload = { type: 'waiting', event: entry.event };
          } else if (entry.type === 'tool') {
            payload = { type: 'tool', tool: entry.tool };
          } else if (entry.type === 'stop') {
            payload = { type: 'stop' };
          } else if (entry.type === 'tool_failure') {
            payload = { type: 'tool_failure', tool: entry.tool };
          } else if (entry.type === 'subagent_start') {
            payload = { type: 'subagent_start', agentId: entry.agentId };
          } else if (entry.type === 'subagent_stop') {
            payload = { type: 'subagent_stop', agentId: entry.agentId };
          } else if (entry.type === 'resume') {
            payload = { type: 'resume' };
          } else if (entry.type === 'session_start' || entry.type === 'session_end' ||
                     entry.type === 'compact_start' || entry.type === 'compact_end' ||
                     entry.type === 'user_prompt' || entry.type === 'task_created' ||
                     entry.type === 'task_completed') {
            payload = { type: entry.type };
          } else {
            payload = {
              totalInput: entry.totalInput || 0,
              totalOutput: entry.totalOutput || 0,
              costUSD: entry.costUSD || 0,
              contextPct: entry.contextPct || 0,
              model: entry.model || 'Unknown',
              startedAt: client.startedAt,
            };
          }
          try { client.res.write('data: ' + JSON.stringify(payload) + '\n\n'); } catch {}
        }
      }
    } catch {}
  });

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('Port ' + port + ' is in use by another application.');
      console.error('Use --port <number> to specify a different port.');
      process.exit(1);
    }
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    if (mode === 'foreground' && !isChild) {
      const url = buildUrl(port);
      printBanner(url, sessionId, 'started (foreground)');
      openBrowser(url);
    }
  });

  process.on('SIGINT', () => shutdown(server, sseClients));
  process.on('SIGTERM', () => shutdown(server, sseClients));
}

function shutdown(server, sseClients) {
  try { fs.unwatchFile(LIVE_DATA_FILE); } catch {}
  sseClients.forEach((c) => { try { c.res.end(); } catch {} });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}

// ── Mode: stop ──
function runStop() {
  const url = 'http://localhost:' + port + '/__stop';
  const req = http.get(url, { timeout: 2000 }, (res) => {
    let body = '';
    res.on('data', (c) => { body += c; });
    res.on('end', () => {
      console.log('Super Mario Runner stopped on port ' + port + '.');
      process.exit(0);
    });
  });
  req.on('error', () => {
    console.log('No Super Mario Runner server running on port ' + port + '.');
    process.exit(0);
  });
  req.on('timeout', () => {
    req.destroy();
    console.log('Stop request timed out on port ' + port + '.');
    process.exit(1);
  });
}

// ── Mode: status ──
async function runStatus() {
  const alive = await checkExistingServer(port);
  if (alive) {
    console.log('Running on http://localhost:' + port + '/');
    process.exit(0);
  } else {
    console.log('Not running on port ' + port + '.');
    process.exit(1);
  }
}

// ── Helpers ──
function buildUrl(p) {
  const base = 'http://localhost:' + p + '/';
  return sessionId ? base + '#' + sessionId : base;
}

function rebuildArgs(extra) {
  const out = [];
  if (sessionId) out.push('--session', sessionId);
  out.push('--port', String(port));
  for (const e of (extra || [])) out.push(e);
  return out;
}

function findLatestSessionId() {
  try {
    const lines = fs.readFileSync(LIVE_DATA_FILE, 'utf-8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const e = JSON.parse(lines[i]);
        if (e.sessionId && e.sessionId !== 'unknown') return e.sessionId;
      } catch {}
    }
  } catch {}
  return '';
}

function readEntries(sid) {
  try {
    return fs.readFileSync(LIVE_DATA_FILE, 'utf-8').split('\n')
      .filter(l => l.trim())
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(e => e && e.type === 'status' && (!sid || e.sessionId === sid));
  } catch { return []; }
}

function openBrowser(url) {
  let cmd, cmdArgs;
  if (process.platform === 'darwin') { cmd = 'open'; cmdArgs = [url]; }
  else if (process.platform === 'win32') { cmd = 'cmd'; cmdArgs = ['/c', 'start', '""', url]; }
  else { cmd = 'xdg-open'; cmdArgs = [url]; }
  try {
    spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true, windowsHide: true }).unref();
  } catch {}
}

function checkExistingServer(targetPort) {
  return new Promise((resolve) => {
    const req = http.get(
      'http://localhost:' + targetPort + '/',
      { timeout: 1000 },
      (res) => {
        const ours = res.headers['x-server'] === SERVER_FINGERPRINT;
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => resolve(ours || body.includes('Super Mario Runner')));
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function waitForPort(targetPort, maxMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = async () => {
      if (await checkExistingServer(targetPort)) return resolve(true);
      if (Date.now() - start >= maxMs) return resolve(false);
      setTimeout(tick, READY_POLL_INTERVAL);
    };
    tick();
  });
}

function printBanner(url, sid, statusLabel) {
  console.log('');
  console.log('  Claude Arcade — Super Mario Runner ' + (statusLabel ? '(' + statusLabel + ')' : ''));
  console.log('  ----------------------------');
  console.log('  URL:     ' + url);
  console.log('  Session: ' + (sid || '(none)'));
  console.log('  Stop:    node "' + __filename + '" --stop --port ' + port);
  console.log('');
}

function readUsage() {
  return [
    'Usage:',
    '  node super-mario-runner.js [--session <id>] [--port <n>]',
    '  node super-mario-runner.js --stop [--port <n>]',
    '  node super-mario-runner.js --status [--port <n>]',
    '  node super-mario-runner.js --foreground',
    '',
    'Default port: ' + DEFAULT_PORT,
  ].join('\n');
}
