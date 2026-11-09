(function(){
  let worker;
  function compile(code,onProgress=()=>{}){
    if(worker)return Promise.reject(Error('Another C++ build is running.'));
    return new Promise((resolve,reject)=>{
      worker=new Worker('/compiler-worker.mjs',{type:'module'});const current=worker;
      const finish=()=>{clearTimeout(timer);current.terminate();if(worker===current)worker=null;};
      const timer=setTimeout(()=>{finish();reject(Error('Browser compilation timed out after two minutes. Try a smaller program.'));},120000);
      current.onmessage=({data})=>{if(data.type==='progress')onProgress(data);if(data.type==='result'){finish();resolve(data);}};
      current.onerror=event=>{finish();reject(Error(event.message||'Browser compiler could not load.'));};
      current.postMessage({type:'compile',code});
    });
  }
  window.IQBrowserCompiler={compile};
})();
