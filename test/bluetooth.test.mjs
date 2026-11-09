import assert from 'node:assert/strict';import {createRequire}from'node:module';const require=createRequire(import.meta.url);
const {Transport,UUID,crc16,crc32,packet,responseLength,decode}=require('../public/bluetooth');
const text=new TextEncoder().encode('123456789');assert.equal(crc16(text),0x31c3);assert.equal(crc32(text),0x89a1897f);
function reply(command,data=new Uint8Array(),ack=0x76){const payload=Uint8Array.from([command,ack,...data,0,0]),size=payload.length,bytes=Uint8Array.from([0xaa,0x55,0x56,...(size<128?[size]:[128|(size>>8),size&255]),...payload]);const crc=crc16(bytes.subarray(0,-2));bytes[bytes.length-2]=crc>>8;bytes[bytes.length-1]=crc&255;return bytes;}
assert.equal(crc16(packet(0x12,Uint8Array.of(3))),0);assert.equal(responseLength(reply(0x13)),8);assert.equal(decode(reply(0x13),0x13).length,0);
assert.throws(()=>decode(reply(0x13),0x12),/Unexpected/);assert.throws(()=>decode(reply(0x13,new Uint8Array(),0xd2),0x13),/rejected/);
const bad=reply(0x13);bad[5]^=1;assert.throws(()=>decode(bad,0x13),/checksum/);
function mock(){
 const handlers={},requests=[],written=[],state=[];let disconnected,filters,corrupt=false,deny=false,drop=false;
 const chars=Object.fromEntries(Object.entries(UUID).filter(([k])=>k!=='service').map(([key,id])=>[id,{async startNotifications(){},addEventListener(name,callback){handlers[key]=callback;},async readValue(){return new DataView(Uint8Array.of(0,1,2,3).buffer);},async writeValueWithResponse(bytes){written.push({key,bytes:new Uint8Array(bytes)});if(key!=='rx')return;
 const large=bytes[6]&128,start=large?8:7,cmd=bytes[5],data=bytes.subarray(start,-2);requests.push({cmd,data:new Uint8Array(data)});if(drop)return;
 let payload=new Uint8Array();if(cmd===0x11)payload=Uint8Array.of(16,0,...new Uint8Array(8));if(cmd===0x19){payload=new Uint8Array(25);new DataView(payload.buffer).setUint32(1,100,true);}
 const result=reply(cmd,payload,deny?0xd2:0x76);if(corrupt)result[result.length-1]^=1;
 queueMicrotask(()=>{for(const part of [result.subarray(0,3),result.subarray(3)])handlers.tx?.({target:{value:new DataView(part.buffer,part.byteOffset,part.byteLength)}});});
 }}]));
 const device={name:'Mock IQ2',addEventListener(name,callback){disconnected=callback;},gatt:{connected:false,async connect(){this.connected=true;return {getPrimaryService:async id=>{assert.equal(id,UUID.service);return {getCharacteristic:async id=>chars[id]};}};},disconnect(){this.connected=false;disconnected?.();}}};
 const transport=new Transport({bluetooth:{requestDevice:async f=>{filters=f;return device;}},onState:s=>state.push(s),timeoutMs:25});
 return {transport,requests,written,state,device,filters:()=>filters,setCorrupt:()=>corrupt=true,setDeny:()=>deny=true,setDrop:()=>drop=true};
}
const m=mock();await m.transport.connect(async()=> '0123');assert.equal(m.transport.ready,true);assert.deepEqual(m.filters().filters,[{services:[0x0620]}]);assert.deepEqual([...m.written.find(w=>w.key==='pin').bytes],[255,255,255,255]);
const progress=[];await m.transport.download({slot:8,name:'test',lang:'python',bytes:new TextEncoder().encode('print("hi")\n'),run:false},p=>progress.push(p.percent));
assert.equal(progress.at(-1),100);assert.ok(progress.slice(0,-1).every(p=>p<100));assert.equal(m.requests.filter(r=>r.cmd===0x15).length,1);assert.ok(m.requests.filter(r=>r.cmd===0x12).every(r=>r.data[0]===3),'Download only must never autorun');
const init=m.requests.filter(r=>r.cmd===0x11);assert.match(new TextDecoder().decode(init[0].data.subarray(28)),/slot_8.ini/);assert.match(new TextDecoder().decode(init[1].data.subarray(28)),/slot_8.bin/);assert.equal(new DataView(init[1].data.buffer).getUint32(8,true),0x10300000);assert.equal(init[1].data[19],97);
await m.transport.download({slot:1,lang:'cpp',bytes:Uint8Array.of(1,2,3,4),run:true});assert.equal(m.requests.at(-1).data[0],1);
await m.transport.run(8);await m.transport.stop();assert.equal(m.requests.at(-1).data[1],128);
await assert.rejects(m.transport.run(9),/Slot/);
let release;const busy=m.transport.exclusive(()=>new Promise(r=>release=r));await assert.rejects(m.transport.stop(),/already running/);release();await busy;
m.transport.disconnect();await assert.rejects(m.transport.stop(),/pair/);
const cancelled=mock();await assert.rejects(cancelled.transport.connect(async()=>null),/cancelled/);assert.equal(cancelled.device.gatt.connected,false);
for(const [setter,pattern]of [['setCorrupt',/checksum/],['setDeny',/rejected/],['setDrop',/timed out/]]){const test=mock();await test.transport.connect(async()=> '0123');test[setter]();await assert.rejects(test.transport.run(1),pattern);if(setter!=='setDeny')assert.equal(test.device.gatt.connected,false);}
console.log('ok - BLE pairing/filtering, fragmented ACKs/checksums, VM check, IQ2 files/addresses, word alignment, run/halt, concurrency, cancellation, corruption and timeout');
