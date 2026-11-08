import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{Runtime}=require('../public/simulator-core'),{Screen}=require('../public/simulator-screen');
const n=value=>({block:{type:'math_number',fields:{NUM:value}}}),txt=value=>({block:{type:'text',fields:{TEXT:value}}});
const chain=list=>list.reduceRight((next,b)=>next?{...b,next:{block:next}}:b,null);
const state=list=>({blocks:{languageVersion:0,blocks:[chain(list)]}});
let events=[];const rt=new Runtime(event=>events.push(event));
const power={type:'iqm_power',inputs:{A:{block:{type:'iqm_x'}},B:n(2)}};
assert.ok(Math.abs(rt.expr({type:'iqm_integral',inputs:{F:{block:power},A:n(0),B:n(1),N:n(128)}})-1/3)<1e-10);
assert.ok(Math.abs(rt.expr({type:'iqm_derivative',fields:{ORDER:'1'},inputs:{F:{block:power},X:n(3),H:n(.001)}})-6)<1e-8);
assert.equal(rt.expr({type:'iqm_root',inputs:{X:n(-8),N:n(3)}}),-2);
assert.equal(rt.expr({type:'iqm_round',fields:{MODE:'0'},inputs:{X:n(-2.5),DIGITS:n(0)}}),-3);
assert.equal(rt.expr({type:'iqm_trig',fields:{OP:'acot'},inputs:{X:n(0)}}),Math.PI/2);
assert.deepEqual(rt.expr({type:'iqm_complex_op',fields:{OP:'2'},inputs:{A:{block:{type:'iqm_i'}},B:{block:{type:'iqm_i'}}}}),{re:-1,im:0});
assert.deepEqual(rt.expr({type:'iqm_complex_fn',fields:{OP:'0'},inputs:{Z:n(0)}}),{re:0,im:0});

await rt.run(state([
  {type:'iq_when_started'},{type:'iq_clear'},
  {type:'variables_set',fields:{VAR:{id:'a'}},inputs:{VALUE:n(4)}},
  {type:'controls_repeat_ext',inputs:{TIMES:n(3),DO:{block:{type:'math_change',fields:{VAR:{id:'a'}},inputs:{DELTA:n(2)}}}}},
  {type:'iq_print',inputs:{TEXT:{block:{type:'variables_get',fields:{VAR:{id:'a'}}}}}},
  {type:'iqm_axes',inputs:{XMIN:n(-1),XMAX:n(1),YMIN:n(-1),YMAX:n(1)}},
  {type:'iqm_graph',inputs:{F:{block:{type:'iqm_x'}},XMIN:n(-1),XMAX:n(1),YMIN:n(-1),YMAX:n(1)}},
  {type:'iqv_table_create2',fields:{NAME:'matrix'},inputs:{ROWS:n(2),COLS:n(2),FILL:n(0)}},
  {type:'iqv_table_set2',fields:{NAME:'matrix'},inputs:{ROW:n(2),COL:n(2),VALUE:txt('hello')}}
]));
assert.ok(events.some(e=>e.op==='text'&&e.text==='10'));
assert.equal(rt.expr({type:'iqv_table_get2_text',fields:{NAME:'matrix'},inputs:{ROW:n(2),COL:n(2)}}),'hello');
const lines=events.filter(e=>e.op==='line');
assert.ok(lines.some(e=>e.x===79&&e.x2===79));
assert.ok(lines.some(e=>e.x===0&&e.y===107&&e.x2===1),'Graph should map mathematical coordinates onto the 160×108 display');
assert.ok(lines.some(e=>e.x2===159&&e.y2===0));

events=[];
const gap=new Runtime(e=>events.push(e));
await gap.run(state([{type:'iqm_graph',inputs:{F:{block:{type:'math_arithmetic',fields:{OP:'DIVIDE'},inputs:{A:n(1),B:{block:{type:'iqm_x'}}}}},XMIN:n(-1),XMAX:n(1),YMIN:n(-10),YMAX:n(10)}}]));
assert.ok(events.filter(e=>e.op==='line').every(e=>!(e.x<80&&e.x2>=80)),'Graph must not join a discontinuity');

events=[];const interactive=new Runtime(e=>events.push(e));
await interactive.run({blocks:{blocks:[{type:'iq_when_started'},{type:'iq_ev_brain_pressed',inputs:{DO:{block:{type:'iq_print',inputs:{TEXT:txt('Pressed')}}}}}]}});
interactive.press('check',true);await new Promise(r=>setImmediate(r));
assert.ok(events.some(e=>e.op==='text'&&e.text==='Pressed'));
interactive.press('check',true);await new Promise(r=>setImmediate(r));
assert.equal(events.filter(e=>e.op==='text').length,1,'Holding Check must not repeatedly trigger pressed events');interactive.stop();

events=[];const unsupported=new Runtime(e=>events.push(e));
await unsupported.run(state([{type:'iq_raw_stmt',id:'raw',fields:{CODE:'globalThis.previewEscaped=true'}}]));
assert.equal(globalThis.previewEscaped,undefined);assert.equal(events.at(-1).type,'error');assert.equal(events.at(-1).blockId,'raw');
events=[];const forever=new Runtime(e=>events.push(e));
const running=forever.run(state([{type:'iqv_forever'}]));setTimeout(()=>forever.stop(),15);await running;
assert.equal(events.at(-1).type,'stopped');

// Screen commands preserve clipping/origin and ignore non-finite geometry.
const calls=[];const ctx=new Proxy({},{get:(_,name)=>(...args)=>calls.push([name,...args]),set:(_,name,value)=>(calls.push(['set',name,value]),true)});
const screen=new Screen({getContext:()=>ctx});
screen.draw({op:'origin',x:5,y:10});screen.draw({op:'clip',x:0,y:0,w:80,h:54});screen.draw({op:'pen',colour:'Color.RED'});screen.draw({op:'line',x:0,y:0,x2:20,y2:20});
assert.ok(calls.some(c=>c[0]==='translate'&&c[1]===5&&c[2]===10));
assert.ok(calls.some(c=>c[0]==='rect'&&c[3]===80&&c[4]===54));
const before=calls.length;screen.draw({op:'circle',x:Infinity,y:0,r:10});assert.equal(calls.length,before);
console.log('ok - offline math/calculus/complex values, control flow, screen graph coordinates/gaps, lists, Check events, cancellation, raw-code rejection and clipping');
