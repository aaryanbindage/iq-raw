(() => {
  const $=id=>document.getElementById(id);
  function withoutProgress(out){return String(out||'').split(/\r?\n/).filter(line=>{
    try{const p=JSON.parse(line);return !(p.phase==='program'&&p.action==='download'&&typeof p.percent==='number');}catch{return true;}
  }).join('\n');}
  async function transfer(body,buildOnly=false,wireless=null){
    const root=$('log'),bar=document.createElement('span');
    bar.className='transfer-progress';bar.setAttribute('role','progressbar');
    bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
    let last=null,phase=buildOnly||body.lang==='cpp'?'build':'prepare',result;
    document.dispatchEvent(new Event('iqraw-transfer-start'));
    const show=message=>{
      const filled=last===null?0:Math.floor(last*40/100);
      bar.textContent=`${message} [${'█'.repeat(filled)}${'░'.repeat(40-filled)}] ${last===null?'…':Math.floor(last)+'%'}\n`;
      bar.setAttribute('aria-label',message);
      bar.setAttribute('aria-valuetext',message+(last===null?'':` ${Math.floor(last)}%`));
      if(!root.contains(bar))root.append(bar);
      root.scrollTop=root.scrollHeight;
    };
    const paint=event=>{
      phase=event.phase;
      last=typeof event.percent==='number'&&Number.isFinite(event.percent)?Math.max(0,Math.min(100,event.percent)):null;
      bar.classList.toggle('indeterminate',last===null);
      if(last===null)bar.removeAttribute('aria-valuenow');else bar.setAttribute('aria-valuenow',String(last));
      show(event.text||({build:`${buildOnly?'':'1/2 · '}Building C++…`,console:'Connecting console before startup…',prepare:'Preparing download…',download:`${body.lang==='cpp'?'2/2 · ':''}Downloading to slot ${body.slot}…`})[phase]||'Downloading…');
    };
    paint({phase,percent:null});
    try{
      if(wireless){result=await wireless(body,paint);}
      else {
      const response=await fetch(buildOnly?'/api/build':'/api/download',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,stream:true})});
      if(!response.ok){const error=await response.json();throw Error(error.error||response.statusText);}
      if(!response.body)throw Error('This browser cannot stream download progress.');
      const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
      const consume=line=>{
        if(!line.trim())return;
        const event=JSON.parse(line);
        if(event.type==='progress')paint(event);
        if(event.type==='result')result=event;
      };
      while(true){
        const {value,done}=await reader.read();pending+=decoder.decode(value,{stream:!done});
        let newline;while((newline=pending.indexOf('\n'))>=0){consume(pending.slice(0,newline));pending=pending.slice(newline+1);}
        if(done){if(pending)consume(pending);break;}
      }
      }
      if(!result)throw Error('The connection ended before the download result arrived. Check the console and brain before retrying.');
      if(result.ok){paint({phase:buildOnly?'build':'download',percent:100});show((buildOnly?'Build complete':body.run?'Download and run complete':'Download complete')+(result.warning?' · console unavailable':''));bar.classList.add('complete');}
      else{show(phase==='build'?'Build failed':'Download failed');bar.classList.add('failed');}
      return result;
    }catch(error){show(buildOnly?'Build interrupted':'Download interrupted');bar.classList.add('failed');throw error;}
    finally{bar.classList.remove('indeterminate');}
  }
  window.IQTransfer={download:(body,wireless)=>transfer(body,false,wireless),build:(body,compile)=>transfer(body,true,compile),withoutProgress};
})();
