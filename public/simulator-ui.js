(() => {
  const $=id=>document.getElementById(id);
  const number=n=>({block:{type:'math_number',fields:{NUM:n}}});
  const chain=list=>list.reduceRight((next,b)=>next?{...b,next:{block:next}}:b,null);
  const demo=()=>({blocks:{languageVersion:0,blocks:[chain([
    {type:'iq_when_started'},{type:'iq_clear'},
    {type:'iq_l_pen',fields:{C:'Color.WHITE'}},
    {type:'iqm_axes',inputs:{XMIN:number(-Math.PI*2),XMAX:number(Math.PI*2),YMIN:number(-1.5),YMAX:number(1.5)}},
    {type:'iqm_rgb',fields:{TARGET:'pen'},inputs:{R:number(70),G:number(210),B:number(255)}},
    {type:'iqm_graph',inputs:{F:{block:{type:'iqm_trig',fields:{OP:'sin'},inputs:{X:{block:{type:'iqm_x'}}}}},XMIN:number(-Math.PI*2),XMAX:number(Math.PI*2),YMIN:number(-1.5),YMAX:number(1.5)}},
    {type:'iqm_rgb',fields:{TARGET:'pen'},inputs:{R:number(90),G:number(240),B:number(150)}},
    {type:'iqm_text',inputs:{TEXT:{block:{type:'text',fields:{TEXT:'IQ Raw offline'}}},X:number(5),Y:number(15)}}
  ])]}});
  function attach(ws,{isManual,language}){
    const dialog=$('brainPreview'),status=$('simStatus'),log=$('simLog');let worker,screen;
    const write=text=>{log.append(document.createTextNode(text));while(log.textContent.length>64000&&log.firstChild)log.firstChild.remove();log.scrollTop=log.scrollHeight;};
    const setStatus=text=>status.textContent=text;
    const stop=()=>{worker?.terminate();worker=null;$('simStop').disabled=true;ws.highlightBlock(null);setStatus('Stopped');};
    const reset=()=>{stop();screen?.reset();log.replaceChildren();setStatus('Ready · no brain needed');};
    const button=(name,down)=>{worker?.postMessage({type:'button',name,down});$('sim'+name[0].toUpperCase()+name.slice(1)).classList.toggle('pressed',down);};
    function start(state,isDemo=false){
      stop();screen.reset();log.replaceChildren();
      if(!window.Worker){setStatus('This browser does not support the offline simulator.');return;}
      if(!isDemo&&isManual()){setStatus('Preview runs blocks. Turn off “Edit code by hand” to preview your program.');return;}
      const instance=new Worker('/simulator-worker.js');worker=instance;$('simStop').disabled=false;setStatus(isDemo?'Running drawing demo…':'Running blocks locally…');
      instance.onmessage=({data})=>{
        if(worker!==instance)return;
        if(data.type==='draw-batch')for(const command of data.commands)screen.draw(command);
        if(data.type==='console')write(data.text);
        if(data.type==='console-clear')log.replaceChildren();
        if(data.type==='error'){setStatus('Preview stopped');write(data.message+'\n');if(data.blockId)ws.highlightBlock(data.blockId);instance.terminate();worker=null;$('simStop').disabled=true;}
        if(data.type==='finished')setStatus(data.interactive?'Finished · Check button events are active':'Finished');
        if(data.type==='stopped')stop();
      };
      instance.onerror=event=>{stop();setStatus('Preview error');write(event.message+'\n');};
      instance.postMessage({type:'run',state,language:language()});
    }
    $('previewToggle').onclick=()=>{
      dialog.showModal();$('previewToggle').setAttribute('aria-expanded','true');
      screen ||=new IQSimulatorScreen.Screen($('simScreen'));if(!worker)setStatus('Ready · no brain needed');
    };
    $('simClose').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{stop();$('previewToggle').setAttribute('aria-expanded','false');});
    $('simRun').onclick=()=>start(Blockly.serialization.workspaces.save(ws));
    $('simDemo').onclick=()=>start(demo(),true);
    $('simStop').onclick=stop;$('simReset').onclick=reset;
    $('simEnlarge').onclick=()=>{const on=$('simDevice').classList.toggle('screen-only');$('simEnlarge').setAttribute('aria-pressed',String(on));$('simEnlarge').textContent=on?'Show brain':'Enlarge screen';};
    $('simSave').onclick=()=>{$('simScreen').toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='iq-raw-simulated-screen.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});};
    for(const name of ['check','left','right']){
      const key=$('sim'+name[0].toUpperCase()+name.slice(1));
      key.onpointerdown=event=>{key.setPointerCapture?.(event.pointerId);button(name,true);};
      for(const type of ['pointerup','pointercancel','lostpointercapture','blur'])key.addEventListener(type,()=>button(name,false));
      key.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();button(name,true);}};
      key.onkeyup=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();button(name,false);}};
    }
    $('simCancel').onclick=stop;
  }
  window.IQSimulator={attach,demo};
})();
