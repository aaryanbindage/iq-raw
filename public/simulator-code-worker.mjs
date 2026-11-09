// This worker is served with a restrictive CSP: code cannot call app APIs/network.
import * as Asyncify from '/vendor/preview/asyncify/asyncify.mjs';
import {WASI,File,OpenFile,ConsoleStdout} from '/vendor/preview/wasi/index.js';
import {runCpp} from './simulator-cpp.mjs';
const buttons={check:false,left:false,right:false};let inputResolve,draws=[],started=false,buttonEvent;
function flush(){if(draws.length){postMessage({type:'draw-batch',commands:draws});draws=[];}}
function emit(event){if(event.type==='draw'){draws.push(event);if(draws.length>=64)flush();}else{flush();postMessage(event);}}
const readLine=()=>new Promise(resolve=>{inputResolve=resolve;emit({type:'input-request'});});
setInterval(flush,16);
self.onmessage=async({data})=>{
  if(data.type==='button'){const down=Boolean(data.down),changed=buttons[data.name]!==down;buttons[data.name]=down;if(changed)buttonEvent?.(data.name,down);return;}
  if(data.type==='input'){inputResolve?.(String(data.text)+'\n');inputResolve=null;return;}
  if(data.type!=='run-code'||started)return;started=true;
  try{
    if(data.language==='cpp')await runCpp(data.wasm,{WASI,File,OpenFile,ConsoleStdout,Asyncify,emit,buttons,readLine});
    else{
      const {runPython}=await import('./simulator-python.mjs');
      await runPython(data.code,{emit,buttons,readLine,onButtons:callback=>{buttonEvent=callback;}});
    }
  }catch(error){emit({type:'error',message:String(error.message||error)});}
};
