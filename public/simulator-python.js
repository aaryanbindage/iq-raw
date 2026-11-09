// Runs hand-edited Python in the preview, using real Python (Pyodide) plus the stand-in `vex` module in simulator-vex.py.
// The Python runs in a worker, so wait() really waits (through shared memory when the page allows it) and the page stays responsive.
(function(root){
  const {Devices}=typeof require!=='undefined'&&typeof module!=='undefined'?require('./simulator-devices'):root.IQSimulatorDevices;
  const BUTTONS={check:0,left:1,right:2};
  // Runs the program; returns an error message, or '' when it ended normally.
  const WRAPPER=`
def _run_user(source):
    import vex
    try:
        exec(compile(source, "<program>", "exec"), {"__name__": "__main__"})
        while vex._has_handlers():
            vex._sleep_ms(20)
    except SystemExit:
        return ""
    except BaseException as error:
        return vex._describe(error)
    return ""
`;
  const live={check:0,left:0,right:0};
  // Brain button state sent as messages; it is read while the program waits and other Threads run (stack switching).
  const setButton=(name,down)=>{if(name in live)live[name]=down?1:0;};
  const canSwitchStacks=()=>typeof WebAssembly!=='undefined'&&typeof WebAssembly.promising==='function';
  async function run({loadPyodide,pyodideOptions,vexSource,source,post,shared,now=()=>Date.now(),switching=canSwitchStacks()}){
    let draws=[];
    const flush=()=>{if(draws.length){post({type:'draw-batch',commands:draws});draws=[];}};
    const emit=message=>{
      if(message.type==='draw'){draws.push(message);if(draws.length>=64)flush();}
      else if(message.type==='flush')flush();
      else{flush();post(message);}
    };
    const devices=new Devices(emit,now);
    const nap=shared?ms=>{Atomics.wait(shared.sleep,0,0,Math.max(1,ms));}:ms=>{const end=now()+ms;while(now()<end);};
    const bridge={
      send:json=>emit(JSON.parse(json)),
      now,nap,
      button:name=>(shared&&Atomics.load(shared.buttons,BUTTONS[name]??0))||live[name]||0,
      // Each Thread or event callback is its own stack-switching call, so a wait in one lets the others run.
      startThread:body=>{body.callPromising().catch(error=>emit({type:'error',message:'Thread failed: '+(error?.message||error)})).finally(()=>body.destroy());},
    };
    for(const name of Object.getOwnPropertyNames(Devices.prototype)){
      if(name!=='constructor'&&typeof Devices.prototype[name]==='function'&&!['scan','statement','expression','sync','announce','motor'].includes(name))bridge[name]=(...args)=>devices[name](...args);
    }
    bridge.motorAttach=(port,reversed)=>{devices.motor(port,reversed);};
    root.simBridge=bridge;
    post({type:'status',text:'Loading Python…'});
    const py=await loadPyodide(pyodideOptions);
    py.setStdout({batched:line=>emit({type:'console',text:line+'\n'})});
    py.setStderr({batched:line=>emit({type:'console',text:line+'\n'})});
    py.FS.writeFile('/home/pyodide/vex.py',vexSource);
    py.runPython(WRAPPER);
    post({type:'status',text:'Running Python locally…'});
    live.check=live.left=live.right=0;
    const runner=py.globals.get('_run_user');
    const message=switching?await runner.callPromising(source):runner(source);
    flush();
    return message;
  }
  const api={run,setButton,BUTTONS};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IQSimulatorPython=api;
})(typeof self!=='undefined'?self:globalThis);
