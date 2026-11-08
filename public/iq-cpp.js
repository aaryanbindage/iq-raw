// C++ generator for the same blocks, for the IQ (2nd gen) C++ SDK. Needs the global Blockly and iq-blocks.js loaded first.
(function () {
  const cpp = new Blockly.Generator('Cpp');
  cpp.INDENT = '    ';
  cpp.ORDER_ATOMIC = 0;
  cpp.ORDER_UNARY = 3;
  cpp.ORDER_MULTIPLICATIVE = 5;
  cpp.ORDER_ADDITIVE = 6;
  cpp.ORDER_RELATIONAL = 9;
  cpp.ORDER_EQUALITY = 10;
  cpp.ORDER_AND = 14;
  cpp.ORDER_OR = 15;
  cpp.ORDER_NONE = 99;
  cpp.addReservedWords('main,Brain,Controller,vex,int,double,float,long,short,char,bool,if,else,while,for,do,return,break,continue,true,false,new,delete,class,struct,this,auto,const,static');

  cpp.init = function (workspace) {
    this.definitions_ = Object.create(null); // global lines, in the order first needed
    this.loopCount_ = 0;
    this.variables_ = new Set();
    this.isInitialized = true;
  };

  cpp.scrub_ = function (block, code, opt_thisOnly) {
    const next = block.nextConnection && block.nextConnection.targetBlock();
    return code + (next && !opt_thisOnly ? cpp.blockToCode(next) : '');
  };

  cpp.finish = function (code) {
    const defs = Object.values(this.definitions_).join('\n');
    const vars = [...this.variables_].map((v) => `${this.INDENT}double ${v} = 0;\n`).join('');
    this.isInitialized = false;
    return [
      '#include "vex.h"',
      '#include <math.h>',
      '#include <stdlib.h>',
      '',
      'using namespace vex;',
      '',
      'vex::brain Brain;',
      defs,
      '',
      'int main() {',
      vars + this.prefixLines(code.replace(/\n+$/, ''), this.INDENT) + '\n',
      `${this.INDENT}while (true) {`,
      `${this.INDENT}${this.INDENT}this_thread::sleep_for(10);`,
      `${this.INDENT}}`,
      '}',
      '',
    ].join('\n').replace(/\n{3,}/g, '\n\n');
  };

  // joins a statement list; a block with nothing in it is an empty body
  const body = (g, b, name) => g.statementToCode(b, name);
  const val = (g, b, name, fallback, order) => g.valueToCode(b, name, order === undefined ? g.ORDER_NONE : order) || fallback;
  const F = cpp.forBlock;
  const varName = (g, b) => {
    const name = 'v_' + String(b.getField('VAR').getText()).replace(/[^A-Za-z0-9_]/g, '_');
    g.variables_.add(name);
    return name;
  };

  // ---- the shared blocks ----
  F.math_number = (b, g) => { const n = Number(b.getFieldValue('NUM')); return [String(n), n < 0 ? g.ORDER_UNARY : g.ORDER_ATOMIC]; };
  F.math_arithmetic = (b, g) => {
    const op = b.getFieldValue('OP');
    const a = val(g, b, 'A', '0'), c = val(g, b, 'B', '0');
    if (op === 'POWER') return [`pow(${a}, ${c})`, g.ORDER_ATOMIC];
    const sym = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/' }[op];
    const order = op === 'ADD' || op === 'MINUS' ? g.ORDER_ADDITIVE : g.ORDER_MULTIPLICATIVE;
    return [`(${a}) ${sym} (${c})`, order];
  };
  F.math_single = (b, g) => {
    const x = val(g, b, 'NUM', '0');
    const op = b.getFieldValue('OP');
    const fn = { ROOT: 'sqrt', ABS: 'fabs', LN: 'log', LOG10: 'log10', EXP: 'exp' }[op];
    if (fn) return [`${fn}(${x})`, g.ORDER_ATOMIC];
    if (op === 'NEG') return [`-(${x})`, g.ORDER_UNARY];
    if (op === 'POW10') return [`pow(10, ${x})`, g.ORDER_ATOMIC];
    return [`(${x})`, g.ORDER_ATOMIC];
  };
  F.math_random_int = (b, g) => {
    const lo = val(g, b, 'FROM', '0'), hi = val(g, b, 'TO', '1');
    return [`((int)(${lo}) + rand() % ((int)(${hi}) - (int)(${lo}) + 1))`, g.ORDER_ADDITIVE];
  };
  F.logic_boolean = (b, g) => [b.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', g.ORDER_ATOMIC];
  F.logic_negate = (b, g) => [`!(${val(g, b, 'BOOL', 'false')})`, g.ORDER_UNARY];
  F.logic_compare = (b, g) => {
    const op = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' }[b.getFieldValue('OP')];
    return [`(${val(g, b, 'A', '0')}) ${op} (${val(g, b, 'B', '0')})`, op === '==' || op === '!=' ? g.ORDER_EQUALITY : g.ORDER_RELATIONAL];
  };
  F.logic_operation = (b, g) => {
    const and = b.getFieldValue('OP') === 'AND';
    return [`(${val(g, b, 'A', 'false')}) ${and ? '&&' : '||'} (${val(g, b, 'B', 'false')})`, and ? g.ORDER_AND : g.ORDER_OR];
  };
  F.controls_if = (b, g) => {
    let code = '';
    let n = 0;
    do {
      code += `${n ? ' else ' : ''}if (${val(g, b, 'IF' + n, 'false')}) {\n${body(g, b, 'DO' + n)}}`;
      n++;
    } while (b.getInput('IF' + n));
    if (b.getInput('ELSE')) code += ` else {\n${body(g, b, 'ELSE')}}`;
    return code + '\n';
  };
  F.controls_whileUntil = (b, g) => {
    const cond = val(g, b, 'BOOL', 'false');
    return `while (${b.getFieldValue('MODE') === 'UNTIL' ? `!(${cond})` : cond}) {\n${body(g, b, 'DO')}}\n`;
  };
  F.controls_repeat_ext = (b, g) => {
    const i = `i_${g.loopCount_++}`;
    return `for (int ${i} = 0; ${i} < (int)(${val(g, b, 'TIMES', '0')}); ${i}++) {\n${body(g, b, 'DO')}}\n`;
  };
  F.controls_flow_statements = (b) => (b.getFieldValue('FLOW') === 'BREAK' ? 'break;\n' : 'continue;\n');
  F.variables_get = (b, g) => [varName(g, b), g.ORDER_ATOMIC];
  F.variables_set = (b, g) => `${varName(g, b)} = ${val(g, b, 'VALUE', '0')};\n`;
  F.text = (b, g) => [JSON.stringify(b.getFieldValue('TEXT')), g.ORDER_ATOMIC];
  F.text_join = (b, g) => ['"(text join is not supported in C++ mode)"', g.ORDER_ATOMIC];

  // ---- IQ blocks ----
  const sleepMs = (x) => `this_thread::sleep_for((uint32_t)(${x}));`;
  const motor = (g, port) => {
    const key = 'motor_' + port;
    if (!g.definitions_[key]) g.definitions_[key] = `vex::motor ${key}(PORT${port}, false);`;
    return key;
  };
  const dev = (g, cls, port) => {
    const key = `${cls}_${port}`;
    if (!g.definitions_[key]) g.definitions_[key] = `vex::${cls} ${key}(PORT${port});`;
    return key;
  };
  const controller = (g) => { g.definitions_.controller = 'vex::controller Controller;'; return 'Controller'; };
  const dirName = (d) => (d === 'REVERSE' ? 'reverse' : 'forward');
  const isText = (b, name) => { const t = b.getInputTargetBlock(name); return !!t && (t.type === 'text' || t.type === 'text_join'); };
  const portIndex = (b) => `PORT${b.getFieldValue('PORT')}`;

  F.iq_print = (b, g) => {
    const x = val(g, b, 'TEXT', '""');
    return isText(b, 'TEXT') ? `Brain.Screen.print("%s", ${x});\n` : `Brain.Screen.print("%g", (double)(${x}));\n`;
  };
  F.iq_clear = () => 'Brain.Screen.clearScreen();\nBrain.Screen.setCursor(1, 1);\n';
  F.iq_cursor = (b, g) => `Brain.Screen.setCursor((int)(${val(g, b, 'ROW', '1')}), (int)(${val(g, b, 'COL', '1')}));\n`;
  F.iq_wait = (b, g) => `${sleepMs(`(${val(g, b, 'SECS', '1')}) * 1000`)}\n`;
  F.iq_motor_setup = (b, g) => {
    const port = b.getFieldValue('PORT');
    g.definitions_['motor_' + port] = `vex::motor motor_${port}(PORT${port}, ${b.getFieldValue('REV') === 'TRUE' ? 'true' : 'false'});`;
    return '';
  };
  F.iq_motor_spin = (b, g) => `${motor(g, b.getFieldValue('PORT'))}.spin(${dirName(b.getFieldValue('DIR'))}, ${val(g, b, 'SPEED', '50')}, percent);\n`;
  F.iq_motor_spin_for = (b, g) => `${motor(g, b.getFieldValue('PORT'))}.spinFor(${dirName(b.getFieldValue('DIR'))}, ${val(g, b, 'DEG', '360')}, degrees);\n`;
  F.iq_motor_stop = (b, g) => `${motor(g, b.getFieldValue('PORT'))}.stop();\n`;
  F.iq_axis = (b, g) => [`${controller(g)}.Axis${b.getFieldValue('AXIS')}.position()`, g.ORDER_ATOMIC];
  F.iq_button = (b, g) => [`${controller(g)}.Button${b.getFieldValue('BTN')}.pressing()`, g.ORDER_ATOMIC];
  F.iq_port_volts = (b, g) => `${motor(g, b.getFieldValue('PORT'))}.spin(${dirName(b.getFieldValue('DIR'))}, ${val(g, b, 'VOLTS', '6')}, volt);\n`;
  F.iq_port_led = (b, g) => `${dev(g, 'touchled', b.getFieldValue('PORT'))}.setColor(color::${b.getFieldValue('COLOR').toLowerCase()});\n`;
  F.iq_port_bumper = (b, g) => [`${dev(g, 'bumper', b.getFieldValue('PORT'))}.pressing()`, g.ORDER_ATOMIC];
  F.iq_port_distance = (b, g) => [`${dev(g, 'distance', b.getFieldValue('PORT'))}.objectDistance(mm)`, g.ORDER_ATOMIC];
  F.iq_port_write = (b, g) => {
    const cls = b.getFieldValue('DEV').toLowerCase();
    const name = cls === 'motor' ? motor(g, b.getFieldValue('PORT')) : dev(g, cls, b.getFieldValue('PORT'));
    return `${name}.${b.getFieldValue('CALL').replace(/^\./, '').replace(/;\s*$/, '')};\n`;
  };

  // bare pins on a smart port, through the SDK's own pin calls. The SDK headers do not say what `target` and `options` mean.
  F.iq_pin_enable = (b, g) => `vexGenericDigitalEnable(${portIndex(b)}, ${Number(b.getFieldValue('OPTIONS')) >>> 0});\n`;
  F.iq_pin_write = (b, g) => `vexGenericDigitalOutput(${portIndex(b)}, ${Number(b.getFieldValue('TARGET')) >>> 0}, ${b.getFieldValue('LEVEL') === 'True' ? 1 : 0});\n`;
  F.iq_pin_read = (b, g) => [`vexGenericDigitalInput(${portIndex(b)}, ${Number(b.getFieldValue('TARGET')) >>> 0})`, g.ORDER_ATOMIC];
  F.iq_pin_digital = (b, g) => [`vexDigitalPinGet(${portIndex(b)})`, g.ORDER_ATOMIC];
  F.iq_pin_analog = (b, g) => [`vexAnalogPinGet(${portIndex(b)})`, g.ORDER_ATOMIC];

  // raw blocks pass through untouched: in C++ mode the text you type is C++
  F.iq_raw_stmt = (b) => `${b.getFieldValue('CODE').replace(/;\s*$/, '')};\n`;
  F.iq_raw_value = (b, g) => [b.getFieldValue('CODE') || '0', g.ORDER_ATOMIC];
  F.iq_raw_if = (b, g) => `if (${b.getFieldValue('COND') || 'true'}) {\n${body(g, b, 'DO')}}\n`;
  F.iq_raw_while = (b, g) => `while (${b.getFieldValue('COND') || 'true'}) {\n${body(g, b, 'DO')}}\n`;
  F.iq_bitop = (b, g) => [`(${val(g, b, 'A', '0')}) ${b.getFieldValue('OP')} (${val(g, b, 'B', '0')})`, g.ORDER_ATOMIC];

  Blockly.Cpp = cpp;
})();
