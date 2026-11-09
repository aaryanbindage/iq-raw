import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{run}=require('../public/simulator-python'),{loadPyodide}=require('pyodide');
const vexSource=fs.readFileSync(new URL('../public/simulator-vex.py',import.meta.url),'utf8');
async function program(source){
  const events=[];
  const message=await run({loadPyodide,vexSource,source,post:e=>e.type==='draw-batch'?events.push(...e.commands):events.push(e)});
  return {events,message};
}
let r=await program(`from vex import *
brain = Brain()
motor = Motor(Ports.PORT3, True)
brain.screen.print("Hello", 1.5)
motor.spin_for(FORWARD, 90, DEGREES)
brain.play_note(4, 9, 100)
brain.play_sound(SoundType.TADA)
print("pos", motor.position(DEGREES))
`);
assert.equal(r.message,'');
assert.ok(r.events.some(e=>e.type==='motor'&&e.port===3&&e.reversed===true),'a motor that is only constructed must be announced');
assert.ok(r.events.some(e=>e.type==='motor'&&e.port===3&&e.rate>0&&e.limit===90));
assert.ok(r.events.some(e=>e.op==='text'&&e.text==='Hello 1.50'));
assert.ok(r.events.some(e=>e.type==='sound'&&e.kind==='note'&&e.name==='A4'));
assert.ok(r.events.some(e=>e.type==='sound'&&e.kind==='sound'&&e.name==='TADA'));
assert.ok(r.events.some(e=>e.type==='console'&&e.text==='pos 90.0\n'),'spin_for waits until the motor arrives: '+JSON.stringify(r.events.filter(e=>e.type==='console')));
r=await program(`from vex import *
x = 1
y = undefined_name
`);
assert.equal(r.message,"Line 3: NameError: name 'undefined_name' is not defined");
r=await program('def broken(:\n');
assert.match(r.message,/^Line 1: SyntaxError/);
r=await program(`from vex import *
brain = Brain()
left = Motor(Ports.PORT1, False)
right = Motor(Ports.PORT6, True)
drivetrain = DriveTrain(left, right, 200, 173, 76, MM, 1)
drivetrain.drive_for(FORWARD, 200, MM)
print(round(left.position(DEGREES)), round(right.position(DEGREES)))
drivetrain.turn_for(RIGHT, 90, DEGREES)
print(round(drivetrain.heading(DEGREES)))
bumper = Bumper(Ports.PORT2)
print(bumper.pressing())
`);
assert.equal(r.message,'');
const out=r.events.filter(e=>e.type==='console').map(e=>e.text).join('');
assert.equal(out,'360 360\n90\nNote: Bumper.pressing is not simulated; it reads as 0 or False.\nFalse\n',out);
console.log('ok - Python preview: real Python, motors announced and timed, sound events, screen, drivetrain, errors with line numbers');
