// Headless check of the block generators and the server's guards. No brain needed.
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Blockly = require('blockly');
const { pythonGenerator } = require('blockly/python');
globalThis.Blockly = Blockly;
Blockly.Python = pythonGenerator;
require('../public/iq-blocks.js');
require('../public/iq-cpp.js');

const ws = new Blockly.Workspace();
const chain = (list) => list.reduceRight((next, b) => (next ? { ...b, next: { block: next } } : b), null);
const n = (v) => ({ block: { type: 'math_number', fields: { NUM: v } } });
const loopBody = chain([
  { type: 'iq_motor_spin', fields: { PORT: '6', DIR: 'FORWARD' }, inputs: { SPEED: { block: { type: 'iq_axis', fields: { AXIS: 'A' } } } } },
  { type: 'iq_port_led', fields: { PORT: '3', COLOR: 'GREEN' } },
  { type: 'iq_port_volts', fields: { PORT: '1', DIR: 'REVERSE' }, inputs: { VOLTS: n(4) } },
  { type: 'iq_raw_if', fields: { COND: 'x > 0 and y' }, inputs: { DO: { block: { type: 'iq_raw_stmt', fields: { CODE: 'x = 1' } } } } },
  { type: 'iq_port_write', fields: { PORT: '2', DEV: 'Touchled', CALL: 'set_color(Color.RED)' } },
  { type: 'iq_pin_write', fields: { TARGET: 2, PORT: '4', LEVEL: 'True' } },
  { type: 'iq_print', inputs: { TEXT: { block: { type: 'iq_bitop', fields: { OP: '&' }, inputs: { A: n(6), B: n(3) } } } } },
]);
Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [chain([
  { type: 'iq_motor_setup', fields: { PORT: '6', REV: true } },
  { type: 'controls_whileUntil', fields: { MODE: 'WHILE' }, inputs: { BOOL: { block: { type: 'iq_button', fields: { BTN: 'RUp' } } }, DO: { block: loopBody } } },
])] } }, ws);
const out = pythonGenerator.workspaceToCode(ws);
console.log(out);
for (const want of [
  'from vex import *', 'brain = Brain()', 'controller = Controller()',
  'motor_6 = Motor(Ports.PORT6, True)', 'motor_1 = Motor(Ports.PORT1, False)', 'touchled_3 = Touchled(Ports.PORT3)', 'touchled_2 = Touchled(Ports.PORT2)',
  'while controller.buttonRUp.pressing():', 'motor_6.spin(FORWARD, controller.axisA.position(), PERCENT)',
  'touchled_3.set_color(Color.GREEN)', 'motor_1.spin(REVERSE, 4, VOLT)', 'if x > 0 and y:\n        x = 1', 'touchled_2.set_color(Color.RED)', 'brain.screen.print(6 & 3)', '# pin blocks need C++ mode',
]) assert.ok(out.includes(want), 'missing: ' + want);
assert.ok(out.indexOf('from vex import *') < out.indexOf('brain = Brain()'));
// empty if body still valid python
const ws2 = new Blockly.Workspace();
Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [{ type: 'iq_raw_while', fields: { COND: 'True' } }] } }, ws2);
assert.ok(pythonGenerator.workspaceToCode(ws2).includes('while True:\n    pass'));
console.log('ok - generators');

// C++ output
const cppOut = Blockly.Cpp.workspaceToCode(ws);
console.log(cppOut);
for (const want of [
  '#include "vex.h"', 'vex::brain Brain;', 'vex::motor motor_6(PORT6, true);', 'vex::controller Controller;', 'vex::touchled touchled_3(PORT3);',
  'while (Controller.ButtonRUp.pressing()) {', 'motor_6.spin(forward, Controller.AxisA.position(), percent);', 'touchled_3.setColor(color::green);',
  'motor_1.spin(reverse, 4, volt);', 'if (x > 0 and y) {', 'touchled_2.set_color(Color.RED);', 'vexGenericDigitalOutput(PORT4, 2, 1);', 'Brain.Screen.print("%g", (double)((6) & (3)));',
]) assert.ok(cppOut.includes(want), 'missing in C++: ' + want);
console.log('ok - C++ generator');

// A startup hat is a top-level entry point; its attached stack runs once in order.
const startup = new Blockly.Workspace();
Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [chain([
  { type: 'iq_when_started' },
  { type: 'controls_repeat_ext', inputs: { TIMES: n(2), DO: { block: { type: 'iq_clear' } } } },
  { type: 'iq_motor_spin', fields: { PORT: '2', DIR: 'FORWARD' }, inputs: { SPEED: n(25) } },
  { type: 'iq_motor_stop', fields: { PORT: '2' } },
])] } }, startup);
const start = startup.getTopBlocks()[0];
assert.equal(start.previousConnection, null);
assert.ok(start.nextConnection);
assert.equal(start.hat, 'cap');
const startupPy = pythonGenerator.workspaceToCode(startup);
const startupCpp = Blockly.Cpp.workspaceToCode(startup);
assert.match(startupPy, /# When started\nfor .* in range\(2\):\n    brain.screen.clear_screen\(\)/);
assert.match(startupPy, /motor_2.spin\(FORWARD, 25, PERCENT\)\nmotor_2.stop\(\)/);
assert.match(startupCpp, /\/\/ When started\n    for \(int i_0 = 0;/);
assert.match(startupCpp, /motor_2.spin\(forward, 25, percent\);\n    motor_2.stop\(\);/);
assert.equal((startupCpp.match(/int main\(/g) || []).length, 1);
const restored = new Blockly.Workspace();
Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(startup), restored);
assert.equal(restored.getTopBlocks()[0].hat, 'cap');
assert.equal(pythonGenerator.workspaceToCode(restored), startupPy);
assert.equal(Blockly.Cpp.workspaceToCode(restored), startupCpp);
startup.clear();
startup.newBlock('iq_when_started');
assert.match(pythonGenerator.workspaceToCode(startup), /# When started/);
assert.match(Blockly.Cpp.workspaceToCode(startup), /int main\(\)/);
startup.dispose();
restored.dispose();
console.log('ok - startup block, execution order, empty stack and saved workspace');

// server guards
process.env.PORT = '5199';
const { server } = require('../server.js');
await new Promise((r) => server.listen(5199, '127.0.0.1', r));
const get = (p, h = {}) => fetch('http://127.0.0.1:5199' + p, { headers: h });
assert.equal((await get('/')).status, 200);
for (const asset of ['/settings.html', '/base.css', '/app.css', '/theme.js', '/preferences.js', '/settings.js']) {
  assert.equal((await get(asset)).status, 200, asset + ' should be served');
}
assert.equal((await get('/vendor/blockly/blockly_compressed.js')).status, 200);
assert.equal((await get('/vendor/blockly/../../package.json')).status, 404);
assert.equal((await get('/%2e%2e/server.js')).status, 404);
const rawStatus = (host) => new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port: 5199, path: '/', headers: { host } }, (r) => { r.resume(); res(r.statusCode); }); q.on('error', rej); q.end(); });
assert.equal(await rawStatus('evil.example:5199'), 403);
assert.equal(await rawStatus('localhost:5199'), 200);
const post = (b, h = {}) => fetch('http://127.0.0.1:5199/api/download', { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(b) });
assert.equal((await post({ code: 'x', slot: 9 })).status, 400);
assert.equal((await post({ code: '', slot: 1 })).status, 400);
assert.equal((await post({ code: 'x', slot: 1 }, { origin: 'http://evil.example' })).status, 403);
assert.equal((await fetch('http://127.0.0.1:5199/api/download', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })).status, 415);
console.log('ok - server guards');
// a real compile of a pin program with VEX's own toolchain (skipped if the extension's SDK is not installed)
const sdkThere = (await (await fetch('http://127.0.0.1:5199/api/build', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'x' }) })).json()).out.includes('were not found') === false;
if (sdkThere) {
  const wsPins = new Blockly.Workspace();
  Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [chain([
    { type: 'iq_prong_write', fields: { LEVEL: 'False', PORT: '12' } },
    { type: 'iq_pin_enable', fields: { PORT: '3', OPTIONS: 1 } },
    { type: 'iq_pin_write', fields: { TARGET: 0, PORT: '3', LEVEL: 'True' } },
    { type: 'iq_print', inputs: { TEXT: { block: { type: 'iq_pin_digital', fields: { PORT: '3' } } } } },
    { type: 'iq_print', inputs: { TEXT: { block: { type: 'iq_pin_analog', fields: { PORT: '3' } } } } },
    { type: 'iq_print', inputs: { TEXT: { block: { type: 'iq_pin_read', fields: { TARGET: 1, PORT: '5' } } } } },
    { type: 'iq_motor_spin_for', fields: { PORT: '1', DIR: 'FORWARD' }, inputs: { DEG: n(90) } },
    { type: 'iq_port_distance', },
  ].slice(0, 7))] } }, wsPins);
  const good = Blockly.Cpp.workspaceToCode(wsPins);
  const ok = await (await fetch('http://127.0.0.1:5199/api/build', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: good }) })).json();
  assert.ok(ok.ok, 'pin program should compile:\n' + ok.out + '\n' + good);
  const bad = await (await fetch('http://127.0.0.1:5199/api/build', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'int main() { return nope; }' }) })).json();
  assert.equal(bad.ok, false);
  console.log('ok - C++ pin program compiles with the VEX toolchain');
} else console.log('skip - VEX C++ SDK not installed');
server.close();

