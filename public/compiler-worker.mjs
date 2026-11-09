import {createSession} from '/vendor/compiler/bundle.js';
import {buildProgram} from './browser-compiler.mjs';
let started=false;
self.onmessage=async({data})=>{
  if(started||data.type!=='compile')return;started=true;
  const progress=event=>postMessage({type:'progress',...event});
  try{
    progress({phase:'build',percent:null,text:'Loading browser ARM compiler (first use downloads about 95 MB)…'});
    const response=await fetch('/compiler/iq2-sdk.json.gz');if(!response.ok)throw Error('Could not load the IQ2 compiler SDK.');
    const sdk=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
    const result=await buildProgram(data.code,{session:createSession(),sdk,onProgress:progress});postMessage({type:'result',...result},result.bytes?[result.bytes.buffer]:[]);
  }catch(error){postMessage({type:'result',ok:false,out:error.message||String(error)});}
};
