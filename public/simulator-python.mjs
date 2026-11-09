export async function runPython(source,{emit,buttons,readLine,onButtons}){
  emit({type:'status',text:'Loading Python runtime…'});
  const {loadPyodide}=await import('/vendor/preview/python/pyodide.mjs');
  const py=await loadPyodide({indexURL:'/vendor/preview/python/'});
  py.registerJsModule('iqraw_host',{
    send:message=>emit(JSON.parse(message)),now:()=>performance.now(),button:name=>Boolean(buttons[name]),
    sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms)),read:readLine,
  });
  const response=await fetch('/simulator-vex-async.py');if(!response.ok)throw Error('Could not load the Python brain API.');
  await py.runPythonAsync(await response.text());
  const buttonEvent=py.globals.get('_iq_button_event');onButtons?.((name,down)=>buttonEvent(name,down));
  py.globals.set('_iq_source',source);emit({type:'status',text:'Running Python locally…'});
  await py.runPythonAsync('await _iq_execute(_iq_source)');
  emit({type:'finished',interactive:true});
}
