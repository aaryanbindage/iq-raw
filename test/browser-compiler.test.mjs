import assert from'node:assert/strict';import fs from'node:fs';import zlib from'node:zlib';import{spawnSync}from'node:child_process';import{createSession,setAssetLoader}from'microbit-clang-wasm';import{buildProgram,elfToBinary}from'../public/browser-compiler.mjs';
assert.throws(()=>elfToBinary(new Uint8Array(60)),/ARM/);
const archive='public/compiler/iq2-sdk.json.gz';if(!fs.existsSync(archive)){console.log('skip - run npm run setup-web-compiler to test ARM browser compilation');process.exit(0);}
setAssetLoader(name=>fs.readFileSync('node_modules/microbit-clang-wasm/gen/'+name));const sdk=JSON.parse(zlib.gunzipSync(fs.readFileSync(archive))),session=createSession(),events=[];
const source='#include "vex.h"\n#include <cmath>\nusing namespace vex; brain Brain; struct Note {int pitch; int ms;}; const Note notes[]={{0,20},{2,20},{4,20}}; int main(){ Brain.Screen.print("Web compile"); for(const auto &n:notes){Brain.playNote(3,n.pitch,n.ms);} printf("done\\n"); return 0; }';
const result=await buildProgram(source,{sdk,session,onProgress:e=>events.push(e)});assert.equal(result.ok,true,result.out);assert.ok(result.bytes.length>1000);assert.equal(events.at(-1).percent,100);
const elf=await session.readFile('program.elf');assert.equal(new DataView(elf.buffer,elf.byteOffset).getUint16(18,true),40,'Compiled artifact must target ARM');
const tmp=fs.mkdtempSync('/private/tmp/iqraw-arm-test-');try{
 fs.writeFileSync(tmp+'/test.elf',elf);
 const tool='/Users/tristan/.iq-raw/toolchains/toolchain_osxarm64/gcc/bin/arm-none-eabi-objcopy';
 if(fs.existsSync(tool)){const native=spawnSync(tool,['-O','binary',tmp+'/test.elf',tmp+'/test.bin'],{encoding:'utf8'});assert.equal(native.status,0,native.stderr);assert.deepEqual(Buffer.from(result.bytes),fs.readFileSync(tmp+'/test.bin'),'Browser ELF conversion must exactly match GNU objcopy');}
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const invalidEvents=[],invalid=await buildProgram('#include "vex.h"\nint main() { this is invalid C++; }',{sdk,session:createSession(),onProgress:e=>invalidEvents.push(e)});assert.equal(invalid.ok,false);assert.match(invalid.out,/error:/);assert.ok(invalidEvents.every(e=>e.percent<100));
console.log('ok - real browser ARM compile/link, IQ2 SDK/math/notes, executable architecture, binary conversion and C++ diagnostics');
