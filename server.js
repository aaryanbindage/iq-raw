#!/usr/bin/env node
// Local server for iq-raw: serves the editor and runs VEX's own `vexcom` tool to talk to the IQ (2nd gen) brain over USB.
// It listens on 127.0.0.1 only, because anything that can reach it can overwrite programs on the brain.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT) || 5174;
const ROOT = __dirname;
const HOME_DIR = path.join(os.homedir(), '.iq-raw', 'vexcom');
const MAX_CODE = 200000;

// ---- finding vexcom ----
// VEX ships vexcom inside its VS Code extension (without the executable bit, and one folder per platform). Copy it, with
// its libusb, to our own folder. Looks in VS Code and the other editors that share its extension format.
const EXE = process.platform === 'win32' ? 'vexcom.exe' : 'vexcom';
const PLATFORM_DIR = process.platform === 'darwin' ? 'osx' : process.platform === 'win32' ? 'win32' : `linux-${{ x64: 'x64', arm64: 'arm64', arm: 'arm32' }[process.arch] || process.arch}`;
const EXT_ROOTS = ['.vscode', '.vscode-insiders', '.vscode-oss', '.cursor', '.windsurf', '.vscode-server'].map((d) => path.join(os.homedir(), d, 'extensions'));
// The extension downloads vexcom into its own storage folder (tools/vexcom/<version>/<platform>) the first time it runs;
// older versions bundled it inside the extension folder instead.
const STORE_ROOTS = [
  path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'vexrobotics.vexcode', 'tools', 'vexcom'),
  path.join(os.homedir(), 'Library', 'Application Support', 'Code - Insiders', 'User', 'globalStorage', 'vexrobotics.vexcode', 'tools', 'vexcom'),
  path.join(os.homedir(), '.config', 'Code', 'User', 'globalStorage', 'vexrobotics.vexcode', 'tools', 'vexcom'),
  ...(process.env.APPDATA ? [path.join(process.env.APPDATA, 'Code', 'User', 'globalStorage', 'vexrobotics.vexcode', 'tools', 'vexcom')] : []),
];
let lastSearch = '';

function installVexcom(src) {
  fs.mkdirSync(HOME_DIR, { recursive: true });
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(HOME_DIR, f));
  fs.chmodSync(path.join(HOME_DIR, EXE), 0o755);
  return path.join(HOME_DIR, EXE);
}

function findVexcom() {
  if (process.env.VEXCOM) return process.env.VEXCOM;
  const own = path.join(HOME_DIR, EXE);
  if (fs.existsSync(own)) return own;
  for (const root of STORE_ROOTS) {
    let versions = [];
    try { versions = fs.readdirSync(root).filter((d) => fs.existsSync(path.join(root, d, PLATFORM_DIR, EXE))); } catch { continue; /* not downloaded */ }
    versions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (versions.length) return installVexcom(path.join(root, versions[versions.length - 1], PLATFORM_DIR));
  }
  const seen = [];
  for (const root of EXT_ROOTS) {
    let dirs = [];
    try { dirs = fs.readdirSync(root); } catch { continue; /* editor not installed */ }
    for (const d of dirs) {
      if (/vex/i.test(d)) seen.push(path.join(root, d));
      const src = path.join(root, d, 'resources', 'tools', 'vexcom', PLATFORM_DIR);
      if (!fs.existsSync(path.join(src, EXE))) continue;
      return installVexcom(src);
    }
  }
  lastSearch = `Looked in: ${STORE_ROOTS.filter((r) => r).join(', ')} and in resources/tools/vexcom/${PLATFORM_DIR} of ${EXT_ROOTS.join(', ')}. VEX-looking extension folders found: ${seen.length ? seen.join(', ') : 'none'}.`;
  return null;
}

const notFound = () => `vexcom was not found. Install the VS Code extension "VEX" by VEX Robotics (id vexrobotics.vexcode). Then open VS Code once and create a new VEX project (Cmd+Shift+P, "New Project"), so the extension downloads its tools, and retry. Or set VEXCOM=/path/to/${EXE}.\n${lastSearch}`;

// ---- running tools, one command at a time (one USB device, and builds share the template) ----
let queue = Promise.resolve();
function run(bin, args, { timeoutMs = 30000, cwd, env } = {}) {
  const job = queue.then(() => new Promise((resolve) => {
    if (!bin) return resolve({ code: -1, out: notFound() });
    const p = spawn(bin, args, { cwd: cwd || path.dirname(bin), env: env || process.env });
    let out = '';
    const timer = setTimeout(() => { out += '\n[timed out]'; p.kill(); }, timeoutMs);
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out: String(e) }); });
    p.on('close', (code) => { clearTimeout(timer); resolve({ code, out: out.replace(/\r/g, '\n') }); });
  }));
  queue = job.catch(() => {});
  return job;
}
const vexcom = (args, timeoutMs = 30000) => run(findVexcom(), args, { timeoutMs });

// ---- the C++ toolchain: VEX's SDK, clang and make, downloaded by the VEX VS Code extension ----
const STORAGE = process.env.VEX_STORAGE || path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'vexrobotics.vexcode');
function findCpp() {
  const sdkRoot = path.join(STORAGE, 'sdk', 'cpp', 'IQ2');
  const tools = path.join(STORAGE, 'tools', 'cpp', 'toolchain_osx64');
  let sdks = [];
  try { sdks = fs.readdirSync(sdkRoot).filter((d) => fs.existsSync(path.join(sdkRoot, d, 'vexiq2', 'libviq2rt.a'))).sort(); } catch { /* none */ }
  if (!sdks.length || !fs.existsSync(path.join(tools, 'clang', 'bin', 'clang'))) return null;
  const extRoot = path.join(os.homedir(), '.vscode', 'extensions');
  let zip = null;
  try {
    for (const d of fs.readdirSync(extRoot)) {
      const z = path.join(extRoot, d, 'resources', 'templates', 'projects', 'IQ2', 'cpp_iq2_vsc_empty.zip');
      if (fs.existsSync(z)) { zip = z; break; }
    }
  } catch { /* no VS Code */ }
  if (!zip) return null;
  const pathDirs = ['clang/bin', 'gcc/bin', 'tools/bin'].map((d) => path.join(tools, d));
  return { sdk: path.join(sdkRoot, sdks[sdks.length - 1]), zip, path: pathDirs.join(':') + ':' + process.env.PATH };
}

// Compile main.cpp into a .bin using the stock IQ2 project template and its makefile. Returns { ok, out, dir, bin }; the caller removes dir.
async function buildCpp(code) {
  const cpp = findCpp();
  if (!cpp) return { ok: false, out: 'The VEX IQ2 C++ tools were not found. In VS Code, open the VEX extension and create an IQ (2nd gen) C++ project once so it downloads the SDK.' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iq-raw-cpp-'));
  const unzip = await run('/usr/bin/unzip', ['-qo', cpp.zip, '-d', dir], { cwd: dir });
  if (unzip.code !== 0) return { ok: false, out: unzip.out, dir };
  fs.writeFileSync(path.join(dir, 'src', 'main.cpp'), code);
  const r = await run('make', [`T=${cpp.sdk}`, 'P=iqraw', 'PRINTF_FLOAT=1'], { cwd: dir, env: { ...process.env, PATH: cpp.path }, timeoutMs: 120000 });
  const bin = path.join(dir, 'build', 'iqraw.bin');
  return { ok: r.code === 0 && fs.existsSync(bin), out: r.out, dir, bin };
}

const cleanSlot = (s) => (Number.isInteger(s) && s >= 1 && s <= 8 ? s : null);
const cleanName = (n) => (typeof n === 'string' && /^[\w .-]{1,32}$/.test(n.trim()) ? n.trim() : 'iq-raw');

async function download({ code, slot, name, run: runAfter, lang = 'python', timeoutMs = 120000 }) {
  let dir = null;
  try {
    let file;
    if (lang === 'cpp') {
      const b = await buildCpp(code);
      dir = b.dir || null;
      if (!b.ok) return { code: 1, out: b.out };
      file = b.bin;
    } else {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iq-raw-'));
      file = path.join(dir, 'main.py');
      fs.writeFileSync(file, code);
    }
    const base = ['--slot', String(slot), '--write', file, '--timer', '--progress'];
    if (runAfter) base.push('--run');
    let r = await vexcom(['--name', name, ...base], timeoutMs);
    // older vexcom builds do not know --name
    if (r.code !== 0 && /unknown|unrecognized|invalid option|usage/i.test(r.out)) r = await vexcom(base, timeoutMs);
    return r;
  } finally {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
}

// A tiny program that asks the brain's own Python what it offers, and prints it back through vexcom's stdio relay.
const PROBE = `from vex import *
brain = Brain()
print("PROBE brain:", dir(brain))
print("PROBE three_wire_port:", hasattr(brain, "three_wire_port"))
print("PROBE names:", [n for n in dir() if n[:1].isupper()])
brain.screen.print("probe done")
`;

// ---- HTTP ----
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.mjs': 'text/javascript; charset=utf-8' };

function sendFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
}

function inside(base, p) {
  const full = path.resolve(base, '.' + path.sep + p);
  return full === base || full.startsWith(base + path.sep) ? full : null;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (d) => { s += d; if (s.length > MAX_CODE + 5000) { reject(new Error('too big')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch (e) { reject(e); } });
  });
}

const server = http.createServer(async (req, res) => {
  const host = String(req.headers.host || '');
  if (host !== `localhost:${PORT}` && host !== `127.0.0.1:${PORT}`) return void res.writeHead(403).end('Forbidden');
  const url = new URL(req.url, `http://${host}`);
  const json = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };

  if (url.pathname.startsWith('/api/')) {
    if (req.method === 'POST') {
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) return json(415, { error: 'JSON only' });
      if (req.headers.origin && req.headers.origin !== `http://${host}`) return json(403, { error: 'Bad origin' });
    }
    try {
      if (url.pathname === '/api/info' && req.method === 'GET') {
        const r = await vexcom(['--json'], 20000);
        let info = null;
        try { info = JSON.parse(r.out.slice(r.out.indexOf('{'))); } catch { /* not JSON, e.g. no brain */ }
        return json(200, { ok: r.code === 0 && !!info, info, out: r.out });
      }
      if (url.pathname === '/api/programs' && req.method === 'GET') {
        const r = await vexcom(['--programs'], 20000);
        return json(200, { ok: r.code === 0, out: r.out });
      }
      if (req.method !== 'POST') return json(405, { error: 'POST only' });
      const body = await readJson(req);
      if (url.pathname === '/api/download') {
        const slot = cleanSlot(body.slot);
        if (!slot) return json(400, { error: 'Slot must be 1 to 8.' });
        if (typeof body.code !== 'string' || !body.code.trim() || body.code.length > MAX_CODE) return json(400, { error: 'No code to send (or too long).' });
        const r = await download({ code: body.code.replace(/\r\n/g, '\n'), slot, name: cleanName(body.name), run: body.run === true, lang: body.lang === 'cpp' ? 'cpp' : 'python' });
        return json(200, { ok: r.code === 0, out: r.out });
      }
      if (url.pathname === '/api/build') {
        if (typeof body.code !== 'string' || !body.code.trim() || body.code.length > MAX_CODE) return json(400, { error: 'No code to build (or too long).' });
        const b = await buildCpp(body.code.replace(/\r\n/g, '\n'));
        if (b.dir) fs.rmSync(b.dir, { recursive: true, force: true });
        return json(200, { ok: b.ok, out: b.ok ? (b.out.trim() + '\nBuild OK.') : b.out });
      }
      if (url.pathname === '/api/probe') {
        const slot = cleanSlot(body.slot) || 8;
        const r = await download({ code: PROBE, slot, name: 'probe', run: true, timeoutMs: 25000 });
        return json(200, { ok: /PROBE /.test(r.out), out: r.out });
      }
      if (url.pathname === '/api/python-vm') {
        const r = await vexcom(['--python', '--timer', '--progress'], 180000);
        return json(200, { ok: r.code === 0, out: r.out });
      }
      if (url.pathname === '/api/run' || url.pathname === '/api/stop' || url.pathname === '/api/erase') {
        const slot = cleanSlot(body.slot);
        if (url.pathname !== '/api/stop' && !slot) return json(400, { error: 'Slot must be 1 to 8.' });
        const args = url.pathname === '/api/stop' ? ['--stop'] : url.pathname === '/api/run' ? ['--slot', String(slot), '--load'] : ['--erase', String(slot)];
        const r = await vexcom(args, 30000);
        return json(200, { ok: r.code === 0, out: r.out });
      }
      return json(404, { error: 'No such call.' });
    } catch (e) {
      return json(400, { error: String(e.message || e) });
    }
  }

  if (url.pathname.startsWith('/vendor/blockly/')) {
    const f = inside(path.join(ROOT, 'node_modules', 'blockly'), url.pathname.slice('/vendor/blockly/'.length));
    return f ? sendFile(res, f) : void res.writeHead(404).end('Not found');
  }
  const f = inside(path.join(ROOT, 'public'), url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  return f ? sendFile(res, f) : void res.writeHead(404).end('Not found');
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log(`iq-raw: open http://localhost:${PORT}  (vexcom: ${findVexcom() || 'NOT FOUND'})`));
}
module.exports = { server, vexcom, findVexcom };
