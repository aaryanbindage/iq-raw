// C++ build plumbing on this OS, against a fake VEX install: storage folder, toolchain, SDK and extension template.
// `make` is this Node binary (linked or copied, so it is a real .exe on Windows) with a preload that plays make.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { makeZip } from './tools.mjs';

const exe = process.platform === 'win32' ? '.exe' : '';
const toolchain = { darwin: process.arch === 'arm64' ? 'toolchain_osxarm64' : 'toolchain_osx64', win32: process.arch === 'arm64' ? 'toolchain_winarm64' : 'toolchain_win32', linux: process.arch === 'arm64' ? 'toolchain_linuxarm64' : 'toolchain_linux64' }[process.platform];
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'iqraw-build-'));
const storage = path.join(home, 'storage with spaces', 'vexrobotics.vexcode');
const tools = path.join(storage, 'tools', 'cpp', toolchain);
const sdk = path.join(storage, 'sdk', 'cpp', 'IQ2', 'V1_0_0');
let server;
try {
  for (const file of ['clang/bin/clang', 'gcc/bin/arm-none-eabi-ld', 'gcc/bin/arm-none-eabi-objcopy', 'gcc/bin/arm-none-eabi-ar', 'gcc/bin/arm-none-eabi-size']) {
    const f = path.join(tools, file + exe);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, '');
    fs.chmodSync(f, 0o755);
  }
  const make = path.join(tools, 'tools', 'bin', 'make' + exe);
  fs.mkdirSync(path.dirname(make), { recursive: true });
  try { fs.linkSync(process.execPath, make); } catch { fs.copyFileSync(process.execPath, make); }
  fs.mkdirSync(path.join(sdk, 'vexiq2'), { recursive: true });
  fs.writeFileSync(path.join(sdk, 'vexiq2', 'libviq2rt.a'), '');
  const template = path.join(home, '.vscode', 'extensions', 'vexrobotics.vexcode-0.8.1', 'resources', 'templates', 'projects', 'IQ2', 'cpp_iq2_vsc_empty.zip');
  fs.mkdirSync(path.dirname(template), { recursive: true });
  fs.writeFileSync(template, makeZip([['makefile', 'all:\n', true], ['src/main.cpp', 'template\n'], ['include/vex.h', '#pragma once\n']]));

  // vexcom, as the extension downloads it: tools/vexcom/<version>/<platform folder>.
  const platformDir = { darwin: 'osx', win32: 'win32', linux: 'linux-' + ({ x64: 'x64', arm64: 'arm64', arm: 'arm32' }[process.arch] || process.arch) }[process.platform];
  const vexcom = path.join(storage, 'tools', 'vexcom', '1_0_2_2', platformDir, 'vexcom' + exe);
  fs.mkdirSync(path.dirname(vexcom), { recursive: true });
  try { fs.linkSync(process.execPath, vexcom); } catch { fs.copyFileSync(process.execPath, vexcom); }

  // Runs only when this Node binary was started as make: checks the project, then "links" or fails like a compiler.
  const preload = path.join(home, 'fake-make.cjs');
  fs.writeFileSync(preload, `
const fs = require('fs'), path = require('path');
if (/^make/i.test(path.basename(process.execPath))) {
  const source = fs.readFileSync('src/main.cpp', 'utf8');
  const args = process.argv.slice(1).map((a, i) => (i ? a : path.relative(process.cwd(), a))); // Node resolved argv[1] as a script path
  console.log(JSON.stringify({ args, path: process.env.PATH, makefile: fs.existsSync('makefile') }));
  if (source.includes('nope')) { console.error("src/main.cpp:1:21: error: use of undeclared identifier 'nope'"); process.exit(2); }
  fs.mkdirSync('build', { recursive: true });
  fs.writeFileSync(path.join('build', 'iqraw.bin'), 'bin');
  process.exit(0);
}
`);
  const port = 5196;
  const env = { ...process.env, VEXCOM: '', PORT: String(port), HOME: home, USERPROFILE: home, VEX_STORAGE: storage, NODE_OPTIONS: `--require "${preload.split(path.sep).join('/')}"` }; // NODE_OPTIONS reads \ as an escape
  server = spawn(process.execPath, ['server.js'], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => /open http/.test(d) && resolve());
    server.on('exit', (code) => reject(new Error('server exited ' + code)));
  });
  const build = async (code) => (await fetch(`http://127.0.0.1:${port}/api/build`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) })).json();

  // The stand-in cannot answer (Node itself rejects vexcom's flags), but the server must find it, copy it and run the copy.
  const own = path.join(home, '.iq-raw', 'vexcom', 'vexcom' + exe);
  const info = await (await fetch(`http://127.0.0.1:${port}/api/info`)).json();
  assert.ok(info.out.includes(own), info.out);
  assert.ok(fs.existsSync(own), 'vexcom should be copied to ~/.iq-raw/vexcom');

  const good = await build('int main() { return 0; }\r\n');
  assert.ok(good.ok, good.out);
  assert.match(good.out, /Build OK/);
  const seen = JSON.parse(good.out.slice(good.out.indexOf('{'), good.out.indexOf('}\n') + 1));
  assert.deepEqual(seen.args, [`T=${sdk}`, 'P=iqraw', 'PRINTF_FLOAT=1']);
  assert.ok(seen.makefile, 'the template should be unpacked next to main.cpp');
  const dirs = seen.path.split(path.delimiter);
  assert.deepEqual(dirs.slice(0, 4), [sdk, path.join(tools, 'gcc', 'bin'), path.join(tools, 'clang', 'bin'), path.join(tools, 'tools', 'bin')]);
  assert.ok(dirs.length > 4, 'the user PATH should follow the VEX tools');

  const bad = await build('int main() { return nope; }');
  assert.equal(bad.ok, false);
  assert.match(bad.out, /undeclared identifier 'nope'/);
  assert.ok(!fs.readdirSync(os.tmpdir()).some((d) => d.startsWith('iq-raw-cpp-') && fs.existsSync(path.join(os.tmpdir(), d, 'src', 'main.cpp')) && fs.readFileSync(path.join(os.tmpdir(), d, 'src', 'main.cpp'), 'utf8').includes('nope')), 'build folders should be removed');
  console.log(`ok - finds vexcom in ${platformDir}; C++ build finds the ${toolchain} toolchain, unpacks the template and runs make with VEX's PATH order`);
} finally {
  server?.kill();
  fs.rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
