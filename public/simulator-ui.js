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
  function attach(ws,{isManual,language,code}){
    const dialog=$('brainPreview'),status=$('simStatus'),log=$('simLog'),motorList=$('simMotors');let worker,screen,shared,buttonState;
    const audio=new IQSimulatorAudio.Audio(),motors=new Map();let frame=0;
    const MOTOR_SVG='<svg viewBox="-20 -20 40 40" aria-hidden="true"><g class="wheel"><circle r="17" fill="none" stroke="currentColor" stroke-width="3"/><path d="M0-17V17M-17 0H17M-12-12L12 12M-12 12L12-12" stroke="currentColor" stroke-width="2"/><circle r="4" fill="currentColor"/><circle cx="12" cy="0" r="2.5" fill="var(--accent)"/></g></svg>';
    const motorAngle=(m,at)=>{let p=m.position+m.rate*(at-m.t0)/1000;if(m.limit!==null&&m.limit!==undefined&&m.rate!==0&&(m.rate>0?p>m.limit:p<m.limit))p=m.limit;return p;};
    function paintMotors(){
      const at=performance.now();let moving=false;
      for(const [port,m] of motors){
        const p=motorAngle(m,at),li=m.el;
        if(m.rate!==0&&!(m.limit!==null&&m.limit!==undefined&&(m.rate>0?p>=m.limit:p<=m.limit)))moving=true;
        li.querySelector('.wheel').style.transform=`rotate(${p*(m.reversed?-1:1)}deg)`;
        li.querySelector('.motor-state').textContent=`${Math.round(p)}° · ${m.rate===0?'stopped':Math.abs(Math.round(m.velocity))+'% '+(m.rate>0?'forward':'reverse')}${m.reversed?' · reversed':''}`;
      }
      frame=moving?requestAnimationFrame(paintMotors):0;
    }
    function updateMotor(data){
      let m=motors.get(data.port);
      if(!m){
        const li=document.createElement('li');li.innerHTML=MOTOR_SVG+'<span class="motor-name"></span><span class="motor-state"></span>';
        li.querySelector('.motor-name').textContent='Motor on port '+data.port;
        m={el:li};motors.set(data.port,m);
        motorList.replaceChildren(...[...motors.entries()].sort((a,b)=>a[0]-b[0]).map(([,v])=>v.el));
        $('simNoMotors').hidden=true;
      }
      Object.assign(m,{position:data.position,rate:data.rate,limit:data.limit,velocity:data.velocity,reversed:data.reversed,t0:performance.now()});
      if(!frame)frame=requestAnimationFrame(paintMotors);
    }
    const clearMotors=()=>{motors.clear();motorList.replaceChildren();$('simNoMotors').hidden=false;cancelAnimationFrame(frame);frame=0;};
    $('simSound').onchange=()=>{audio.muted=!$('simSound').checked;};
    const write=text=>{log.append(document.createTextNode(text));while(log.textContent.length>64000&&log.firstChild)log.firstChild.remove();log.scrollTop=log.scrollHeight;};
    const setStatus=text=>status.textContent=text;
    const stop=()=>{worker?.terminate();worker=null;$('simStop').disabled=true;ws.highlightBlock(null);audio.reset();setStatus('Stopped');for(const m of motors.values())m.rate=0;paintMotors();};
    const reset=()=>{stop();screen?.reset();log.replaceChildren();clearMotors();setStatus('Ready · no brain needed');};
    const button=(name,down)=>{
      worker?.postMessage({type:'button',name,down});
      if(buttonState)Atomics.store(buttonState,({check:0,left:1,right:2})[name],down?1:0);
      $('sim'+name[0].toUpperCase()+name.slice(1)).classList.toggle('pressed',down);
    };
    // message: what to send the worker. Hand-edited Python goes to the Python engine, blocks to the block interpreter.
    function start(message,label){
      stop();screen.reset();log.replaceChildren();clearMotors();audio.unlock();
      if(!window.Worker){setStatus('This browser does not support the offline simulator.');return;}
      if(message.type==='run-python'&&window.crossOriginIsolated&&window.SharedArrayBuffer){shared=new SharedArrayBuffer(32);buttonState=new Int32Array(shared,0,4);message={...message,shared};}
      else{shared=null;buttonState=null;}
      const python=message.type==='run-python';
      const instance=python?new Worker('/simulator-python-worker.js',{type:'module'}):new Worker('/simulator-worker.js');worker=instance;$('simStop').disabled=false;setStatus(label);
      instance.onmessage=({data})=>{
        if(worker!==instance)return;
        if(data.type==='draw-batch')for(const command of data.commands)screen.draw(command);
        if(data.type==='motor')updateMotor(data);
        if(data.type==='sound')audio.play(data);
        if(data.type==='status')setStatus(data.text);
        if(data.type==='console')write(data.text);
        if(data.type==='console-clear')log.replaceChildren();
        if(data.type==='error'){setStatus('Preview stopped');write(data.message+'\n');if(data.blockId)ws.highlightBlock(data.blockId);instance.terminate();worker=null;$('simStop').disabled=true;}
        if(data.type==='finished')setStatus(data.interactive?'Finished · Check button events are active':'Finished');
        if(data.type==='stopped')stop();
      };
      instance.onerror=event=>{stop();setStatus('Preview error');write(event.message+'\n');};
      instance.postMessage(message);
    }
    const startBlocks=(state,isDemo=false)=>start({type:'run',state,language:language()},isDemo?'Running drawing demo…':'Running blocks locally…');
    const refreshRunLabel=()=>{$('simRun').textContent=isManual()?'Run code':'Run blocks';};
    function run(){
      if(!isManual())return startBlocks(Blockly.serialization.workspaces.save(ws));
      if(language()!=='python'){stop();setStatus('The preview runs Python, not C++. Switch Language to Python to preview hand-edited code.');return;}
      start({type:'run-python',code:code()},'Starting Python…');
    }
    $('previewToggle').onclick=()=>{
      refreshRunLabel();dialog.showModal();$('previewToggle').setAttribute('aria-expanded','true');
      screen ||=new IQSimulatorScreen.Screen($('simScreen'));if(!worker)setStatus('Ready · no brain needed');
    };
    $('simClose').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{stop();$('previewToggle').setAttribute('aria-expanded','false');});
    $('simRun').onclick=run;
    $('simDemo').onclick=()=>startBlocks(demo(),true);
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
