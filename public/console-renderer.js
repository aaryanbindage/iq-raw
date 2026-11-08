(() => {
  // A small ANSI subset used by VEX console blocks. All output remains text nodes.
  function create(root,monitors) {
    let pending='',wire='',colour='';
    const values=new Map();
    function monitor(line){
      const match=line.match(/^\x1eIQRAW_(MONITOR|HIDE)\t([^\t\r\n]*)(?:\t([^\r\n]*))?\r?$/);
      if(!match||!monitors)return false;
      const [,kind,name,value]=match;
      if(kind==='HIDE')values.delete(name);
      else if(values.has(name)||values.size<32)values.set(name,(value||'').slice(0,256));
      monitors.replaceChildren();
      for(const [name,value] of values){
        const row=document.createElement('div'),label=document.createElement('dt'),reading=document.createElement('dd');
        label.textContent=name;reading.textContent=value;row.append(label,reading);monitors.append(row);
      }
      monitors.hidden=values.size===0;return true;
    }
    const palette=['#111827','#ff7b72','#7ee787','#e3b341','#79c0ff','#d2a8ff','#76e3ea','#f0f6fc'];
    function text(value){
      if(!value)return;
      const span=document.createElement('span');span.className='serial';span.textContent=value.replace(/\r/g,'');
      if(colour)span.style.color=colour;
      root.append(span);
    }
    function appendText(chunk){
        pending+=chunk;
        while(pending){
          const pos=pending.indexOf('\x1b');
          if(pos<0){text(pending);pending='';break;}
          text(pending.slice(0,pos));pending=pending.slice(pos);
          const match=pending.match(/^\x1b\[([0-9;]*)([A-Za-z])/);
          if(!match){if(pending.length<64&&/^\x1b(?:\[[0-9;]*)?$/.test(pending))break;pending=pending.slice(1);continue;}
          const [,args,cmd]=match;pending=pending.slice(match[0].length);
          if(cmd==='J'&&args==='2')root.replaceChildren();
          if(cmd==='m'){
            const codes=(args||'0').split(';').map(Number);
            for(let i=0;i<codes.length;i++){
              const n=codes[i];
              if(n===0||n===39)colour='';
              else if(n>=30&&n<=37)colour=palette[n-30];
              else if(n>=90&&n<=97)colour=palette[n-90];
              else if(n===38&&codes[i+1]===2&&codes.length>=i+5){colour=`rgb(${codes.slice(i+2,i+5).map(v=>Math.max(0,Math.min(255,v))).join(',')})`;i+=4;}
            }
          }
        }
        while(root.textContent.length>200000&&root.firstChild)root.firstChild.remove();
        root.scrollTop=root.scrollHeight;
    }
    return {
      clear(){root.replaceChildren();pending='';wire='';colour='';values.clear();if(monitors){monitors.replaceChildren();monitors.hidden=true;}},
      append(chunk){
        wire+=chunk;
        while(wire){
          const start=wire.indexOf('\x1e');
          if(start<0){appendText(wire);wire='';break;}
          appendText(wire.slice(0,start));wire=wire.slice(start);
          const newline=wire.indexOf('\n');
          if(newline<0&&wire.length<=600)break;
          if(newline<0){appendText(wire);wire='';break;}
          const line=wire.slice(0,newline);wire=wire.slice(newline+1);
          if(!monitor(line))appendText(line+'\n');
        }
      },
    };
  }
  window.IQConsole={create};
})();
