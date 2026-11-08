importScripts('/simulator-core.js');
let runtime,draws=[];
function flush(){if(draws.length){postMessage({type:'draw-batch',commands:draws});draws=[];}}
function emit(message){if(message.type==='draw'){draws.push(message);if(draws.length>=64)flush();}else{flush();postMessage(message);}}
setInterval(flush,16);
self.onmessage=({data})=>{
  if(data.type==='run'){runtime?.stop();runtime=new IQSimulatorCore.Runtime(emit,{language:data.language});runtime.run(data.state);}
  if(data.type==='button')runtime?.press(data.name,data.down);
  if(data.type==='stop'){runtime?.stop();flush();}
};
