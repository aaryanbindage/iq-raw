// IQ (2nd gen) blocks and their Python generators. Needs the global Blockly with Blockly.Python loaded.
(function () {
  const gen = Blockly.Python;
  gen.INDENT = '    '; // four spaces, so hand edits match what the blocks write
  const PORTS = Array.from({ length: 12 }, (_, i) => [String(i + 1), String(i + 1)]);
  const DIRS = [['forward', 'FORWARD'], ['reverse', 'REVERSE']];
  const AXES = [['A (left stick, up/down)', 'A'], ['B (left stick, left/right)', 'B'], ['C (right stick, left/right)', 'C'], ['D (right stick, up/down)', 'D']];
  const BUTTONS = [['L up', 'LUp'], ['L down', 'LDown'], ['R up', 'RUp'], ['R down', 'RDown'], ['E up', 'EUp'], ['E down', 'EDown'], ['F up', 'FUp'], ['F down', 'FDown'], ['L3', 'L3'], ['R3', 'R3']];
  const COLORS = ['RED', 'GREEN', 'BLUE', 'YELLOW', 'ORANGE', 'PURPLE', 'CYAN', 'WHITE', 'BLACK'].map((c) => [c.toLowerCase(), c]);
  const DEVICES = [['Touchled', 'Touchled'], ['Bumper', 'Bumper'], ['Distance', 'Distance'], ['Optical', 'Optical'], ['Motor', 'Motor']];
  const COLOUR = { brain: 200, motor: 20, control: 290, port: 50, pin: 90, raw: 0 };

  Blockly.Extensions.register('iq_start_hat', function () { this.hat = 'cap'; });
  Blockly.defineBlocksWithJsonArray([
    { type: 'iq_when_started', message0: 'when started', nextStatement: null, colour: 45, extensions: ['iq_start_hat'], tooltip: 'Blocks attached below run once when the program starts. Use one start stack for a predictable execution order.' },
    { type: 'iq_print', message0: 'brain screen print %1', args0: [{ type: 'input_value', name: 'TEXT' }], previousStatement: null, nextStatement: null, colour: COLOUR.brain },
    { type: 'iq_clear', message0: 'brain screen clear', previousStatement: null, nextStatement: null, colour: COLOUR.brain },
    { type: 'iq_cursor', message0: 'brain screen cursor row %1 column %2', args0: [{ type: 'input_value', name: 'ROW', check: 'Number' }, { type: 'input_value', name: 'COL', check: 'Number' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOUR.brain },
    { type: 'iq_wait', message0: 'wait %1 seconds', args0: [{ type: 'input_value', name: 'SECS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: COLOUR.brain },
    { type: 'iq_motor_setup', message0: 'motor on port %1 reversed %2', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }, { type: 'field_checkbox', name: 'REV', checked: false }], previousStatement: null, nextStatement: null, colour: COLOUR.motor, tooltip: 'Put this at the top. Motors you never set up are not reversed.' },
    { type: 'iq_motor_spin', message0: 'motor %1 spin %2 at %3 %%', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }, { type: 'field_dropdown', name: 'DIR', options: DIRS }, { type: 'input_value', name: 'SPEED', check: 'Number' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOUR.motor },
    { type: 'iq_motor_spin_for', message0: 'motor %1 spin %2 for %3 degrees', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }, { type: 'field_dropdown', name: 'DIR', options: DIRS }, { type: 'input_value', name: 'DEG', check: 'Number' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOUR.motor },
    { type: 'iq_motor_stop', message0: 'motor %1 stop', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }], previousStatement: null, nextStatement: null, colour: COLOUR.motor },
    { type: 'iq_axis', message0: 'controller axis %1 position', args0: [{ type: 'field_dropdown', name: 'AXIS', options: AXES }], output: 'Number', colour: COLOUR.control },
    { type: 'iq_button', message0: 'controller button %1 pressed?', args0: [{ type: 'field_dropdown', name: 'BTN', options: BUTTONS }], output: 'Boolean', colour: COLOUR.control },
    // writes and reads on a smart port (IQ2 has no bare GPIO pins; every port takes a smart device)
    { type: 'iq_port_volts', message0: 'port %1 motor drive %2 at %3 volts', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }, { type: 'field_dropdown', name: 'DIR', options: DIRS }, { type: 'input_value', name: 'VOLTS', check: 'Number' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOUR.port, tooltip: 'Raw voltage to a motor on this port, no speed control.' },
    { type: 'iq_port_led', message0: 'port %1 touch LED colour %2', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }, { type: 'field_dropdown', name: 'COLOR', options: COLORS }], previousStatement: null, nextStatement: null, colour: COLOUR.port },
    { type: 'iq_port_bumper', message0: 'port %1 bumper pressed?', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }], output: 'Boolean', colour: COLOUR.port },
    { type: 'iq_port_distance', message0: 'port %1 distance (mm)', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }], output: 'Number', colour: COLOUR.port },
    { type: 'iq_port_write', message0: 'port %1 device %2 call %3', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }, { type: 'field_dropdown', name: 'DEV', options: DEVICES }, { type: 'field_input', name: 'CALL', text: 'set_color(Color.RED)' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: COLOUR.port, tooltip: 'Make a device on a port and call any method on it. Type the call in the language you are using: set_color(Color.GREEN) in Python, setColor(color::green) in C++.' },
    // bare pins on a smart port: C++ only (the Python on the brain has no pin calls). Press "Build only" in C++ mode to check them.
    { type: 'iq_prong_write', message0: 'write %1 to prong of port %2', args0: [{ type: 'field_dropdown', name: 'LEVEL', options: [['high', 'True'], ['low', 'False']] }, { type: 'field_dropdown', name: 'PORT', options: PORTS }], previousStatement: null, nextStatement: null, colour: COLOUR.pin, tooltip: 'C++ only. One write to one of the 12 ports: enable (options 0), then output (pin 0). Both numbers are guesses, so use the pin blocks to tune them on a real brain.' },
    { type: 'iq_pin_enable', message0: 'pins on port %1 enable options %2', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }, { type: 'field_number', name: 'OPTIONS', value: 0, min: 0 }], previousStatement: null, nextStatement: null, colour: COLOUR.pin, tooltip: 'C++ only. vexGenericDigitalEnable(port, options). The SDK does not say what the options mean.' },
    { type: 'iq_pin_write', message0: 'pin %1 on port %2 write %3', args0: [{ type: 'field_number', name: 'TARGET', value: 0, min: 0 }, { type: 'field_dropdown', name: 'PORT', options: PORTS }, { type: 'field_dropdown', name: 'LEVEL', options: [['high', 'True'], ['low', 'False']] }], previousStatement: null, nextStatement: null, colour: COLOUR.pin, tooltip: 'C++ only. vexGenericDigitalOutput(port, pin, value).' },
    { type: 'iq_pin_read', message0: 'pin %1 on port %2 read', args0: [{ type: 'field_number', name: 'TARGET', value: 0, min: 0 }, { type: 'field_dropdown', name: 'PORT', options: PORTS }], output: 'Number', colour: COLOUR.pin, tooltip: 'C++ only. vexGenericDigitalInput(port, pin).' },
    { type: 'iq_pin_digital', message0: 'port %1 digital pin value', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }], output: 'Number', colour: COLOUR.pin, tooltip: 'C++ only. vexDigitalPinGet(port).' },
    { type: 'iq_pin_analog', message0: 'port %1 analog pin value', args0: [{ type: 'field_dropdown', name: 'PORT', options: PORTS }], output: 'Number', colour: COLOUR.pin, tooltip: 'C++ only. vexAnalogPinGet(port).' },
    // raw logic
    { type: 'iq_raw_if', message0: 'if raw Python %1 %2 do %3', args0: [{ type: 'field_input', name: 'COND', text: 'x > 0 and y' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: COLOUR.raw },
    { type: 'iq_raw_while', message0: 'while raw Python %1 %2 do %3', args0: [{ type: 'field_input', name: 'COND', text: 'True' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: COLOUR.raw },
    { type: 'iq_bitop', message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A', check: 'Number' }, { type: 'field_dropdown', name: 'OP', options: [['AND', '&'], ['OR', '|'], ['XOR', '^'], ['shift left', '<<'], ['shift right', '>>']] }, { type: 'input_value', name: 'B', check: 'Number' }], inputsInline: true, output: 'Number', colour: COLOUR.raw, tooltip: 'Bitwise logic on whole numbers.' },
    { type: 'iq_raw_stmt', message0: 'raw Python %1', args0: [{ type: 'field_input', name: 'CODE', text: 'print("hi")' }], previousStatement: null, nextStatement: null, colour: COLOUR.raw, tooltip: 'One line of Python, copied as is.' },
    { type: 'iq_raw_value', message0: 'raw Python value %1', args0: [{ type: 'field_input', name: 'CODE', text: '0' }], output: null, colour: COLOUR.raw, tooltip: 'A Python expression, copied as is.' },
  ]);

  // the lines every program starts with; the Python generator puts "import" lines first, then these in order
  function base(g) {
    g.definitions_.import_vex = 'from vex import *';
    g.definitions_.brain = 'brain = Brain()';
  }
  const motor = (g, port) => {
    base(g);
    if (!g.definitions_['motor_' + port]) g.definitions_['motor_' + port] = `motor_${port} = Motor(Ports.PORT${port}, False)`;
    return `motor_${port}`;
  };
  const num = (g, block, name, fallback) => g.valueToCode(block, name, g.ORDER_NONE) || fallback;
  const F = gen.forBlock;

  F.iq_when_started = (b, g) => { base(g); return '# When started\n'; };
  F.iq_print = (b, g) => { base(g); return `brain.screen.print(${num(g, b, 'TEXT', '""')})\n`; };
  F.iq_clear = (b, g) => { base(g); return 'brain.screen.clear_screen()\nbrain.screen.set_cursor(1, 1)\n'; };
  F.iq_cursor = (b, g) => { base(g); return `brain.screen.set_cursor(${num(g, b, 'ROW', '1')}, ${num(g, b, 'COL', '1')})\n`; };
  F.iq_wait = (b, g) => { base(g); return `wait(${num(g, b, 'SECS', '1')}, SECONDS)\n`; };
  F.iq_motor_setup = (b, g) => {
    base(g);
    const port = b.getFieldValue('PORT');
    g.definitions_['motor_' + port] = `motor_${port} = Motor(Ports.PORT${port}, ${b.getFieldValue('REV') === 'TRUE' ? 'True' : 'False'})`;
    return '';
  };
  F.iq_motor_spin = (b, g) => `${motor(g, b.getFieldValue('PORT'))}.spin(${b.getFieldValue('DIR')}, ${num(g, b, 'SPEED', '50')}, PERCENT)\n`;
  F.iq_motor_spin_for = (b, g) => `${motor(g, b.getFieldValue('PORT'))}.spin_for(${b.getFieldValue('DIR')}, ${num(g, b, 'DEG', '360')}, DEGREES)\n`;
  F.iq_motor_stop = (b, g) => `${motor(g, b.getFieldValue('PORT'))}.stop()\n`;
  F.iq_axis = (b, g) => { base(g); g.definitions_.controller = 'controller = Controller()'; return [`controller.axis${b.getFieldValue('AXIS')}.position()`, g.ORDER_FUNCTION_CALL]; };
  F.iq_button = (b, g) => { base(g); g.definitions_.controller = 'controller = Controller()'; return [`controller.button${b.getFieldValue('BTN')}.pressing()`, g.ORDER_FUNCTION_CALL]; };
  // one device object per kind and port, e.g. touchled_3 = Touchled(Ports.PORT3)
  const device = (g, cls, port) => {
    base(g);
    const name = `${cls.toLowerCase()}_${port}`;
    if (!g.definitions_[name]) g.definitions_[name] = `${name} = ${cls}(Ports.PORT${port}${cls === 'Motor' ? ', False' : ''})`;
    return name;
  };
  F.iq_port_volts = (b, g) => `${motor(g, b.getFieldValue('PORT'))}.spin(${b.getFieldValue('DIR')}, ${num(g, b, 'VOLTS', '6')}, VOLT)\n`;
  F.iq_port_led = (b, g) => `${device(g, 'Touchled', b.getFieldValue('PORT'))}.set_color(Color.${b.getFieldValue('COLOR')})\n`;
  F.iq_port_bumper = (b, g) => [`${device(g, 'Bumper', b.getFieldValue('PORT'))}.pressing()`, g.ORDER_FUNCTION_CALL];
  F.iq_port_distance = (b, g) => [`${device(g, 'Distance', b.getFieldValue('PORT'))}.object_distance(MM)`, g.ORDER_FUNCTION_CALL];
  F.iq_port_write = (b, g) => {
    const dev = b.getFieldValue('DEV');
    const name = dev === 'Motor' ? motor(g, b.getFieldValue('PORT')) : device(g, dev, b.getFieldValue('PORT'));
    return `${name}.${b.getFieldValue('CALL').replace(/^\./, '')}\n`;
  };
  // pins exist only in the C++ SDK; in Python mode the block leaves a comment so the program still runs
  const pinNote = (g) => { base(g); return '# pin blocks need C++ mode\n'; };
  F.iq_prong_write = (b, g) => pinNote(g);
  F.iq_pin_enable = (b, g) => pinNote(g);
  F.iq_pin_write = (b, g) => pinNote(g);
  F.iq_pin_read = (b, g) => { base(g); return ['0', g.ORDER_ATOMIC]; };
  F.iq_pin_digital = F.iq_pin_read;
  F.iq_pin_analog = F.iq_pin_read;
  const body = (g, b) => g.statementToCode(b, 'DO') || g.PASS;
  F.iq_raw_if = (b, g) => { base(g); return `if ${b.getFieldValue('COND') || 'True'}:\n${body(g, b)}`; };
  F.iq_raw_while = (b, g) => { base(g); return `while ${b.getFieldValue('COND') || 'True'}:\n${body(g, b)}`; };
  F.iq_bitop = (b, g) => {
    const op = b.getFieldValue('OP');
    return [`${g.valueToCode(b, 'A', g.ORDER_BITWISE_OR) || '0'} ${op} ${g.valueToCode(b, 'B', g.ORDER_BITWISE_OR) || '0'}`, g.ORDER_BITWISE_OR];
  };
  F.iq_raw_stmt = (b, g) => { base(g); return `${b.getFieldValue('CODE')}\n`; };
  F.iq_raw_value = (b, g) => { base(g); return [b.getFieldValue('CODE') || '0', g.ORDER_ATOMIC]; };

  Blockly.IQ_TOOLBOX = {
    kind: 'categoryToolbox',
    contents: [
      { kind: 'category', name: 'Events', colour: '45', contents: [
        { kind: 'block', type: 'iq_when_started' },
      ] },
      { kind: 'category', name: 'Brain', colour: String(COLOUR.brain), contents: [
        { kind: 'block', type: 'iq_print', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hello IQ' } } } } },
        { kind: 'block', type: 'iq_clear' },
        { kind: 'block', type: 'iq_cursor', inputs: { ROW: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, COL: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'iq_wait', inputs: { SECS: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
      ] },
      { kind: 'category', name: 'Motors', colour: String(COLOUR.motor), contents: [
        { kind: 'block', type: 'iq_motor_setup' },
        { kind: 'block', type: 'iq_motor_spin', inputs: { SPEED: { shadow: { type: 'math_number', fields: { NUM: 50 } } } } },
        { kind: 'block', type: 'iq_motor_spin_for', inputs: { DEG: { shadow: { type: 'math_number', fields: { NUM: 360 } } } } },
        { kind: 'block', type: 'iq_motor_stop' },
      ] },
      { kind: 'category', name: 'Ports', colour: String(COLOUR.port), contents: [
        { kind: 'block', type: 'iq_port_volts', inputs: { VOLTS: { shadow: { type: 'math_number', fields: { NUM: 6 } } } } },
        { kind: 'block', type: 'iq_port_led' },
        { kind: 'block', type: 'iq_port_write' },
        { kind: 'block', type: 'iq_port_bumper' },
        { kind: 'block', type: 'iq_port_distance' },
      ] },
      { kind: 'category', name: 'Pins (C++)', colour: String(COLOUR.pin), contents: [
        { kind: 'block', type: 'iq_prong_write' }, { kind: 'block', type: 'iq_pin_enable' }, { kind: 'block', type: 'iq_pin_write' }, { kind: 'block', type: 'iq_pin_read' },
        { kind: 'block', type: 'iq_pin_digital' }, { kind: 'block', type: 'iq_pin_analog' },
      ] },
      { kind: 'category', name: 'Controller', colour: String(COLOUR.control), contents: [{ kind: 'block', type: 'iq_axis' }, { kind: 'block', type: 'iq_button' }] },
      { kind: 'category', name: 'Loops', colour: '120', contents: [
        { kind: 'block', type: 'controls_whileUntil', fields: { MODE: 'WHILE' }, inputs: { BOOL: { shadow: { type: 'logic_boolean', fields: { BOOL: 'TRUE' } } } } },
        { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 4 } } } } },
        { kind: 'block', type: 'controls_flow_statements' },
      ] },
      { kind: 'category', name: 'Logic', colour: '210', contents: [
        { kind: 'block', type: 'controls_if' }, { kind: 'block', type: 'logic_compare' }, { kind: 'block', type: 'logic_operation' }, { kind: 'block', type: 'logic_negate' }, { kind: 'block', type: 'logic_boolean' },
      ] },
      { kind: 'category', name: 'Math', colour: '230', contents: [
        { kind: 'block', type: 'math_number' }, { kind: 'block', type: 'math_arithmetic' }, { kind: 'block', type: 'math_single' }, { kind: 'block', type: 'math_random_int' },
      ] },
      { kind: 'category', name: 'Text', colour: '160', contents: [{ kind: 'block', type: 'text' }, { kind: 'block', type: 'text_join' }] },
      { kind: 'category', name: 'Variables', colour: '330', custom: 'VARIABLE' },
      { kind: 'category', name: 'Raw Python', colour: String(COLOUR.raw), contents: [
        { kind: 'block', type: 'iq_raw_stmt' }, { kind: 'block', type: 'iq_raw_value' },
        { kind: 'block', type: 'iq_raw_if' }, { kind: 'block', type: 'iq_raw_while' }, { kind: 'block', type: 'iq_bitop' },
      ] },
    ],
  };
})();
