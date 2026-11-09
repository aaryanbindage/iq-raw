// Decode VEXcom's newline-delimited JSON without assuming pipe chunk boundaries.
function progressParser(emit){
  let pending='';
  const line=text=>{
    let item;try{item=JSON.parse(text.trim());}catch{return;}
    if(item.phase!=='program'||item.action!=='download'||typeof item.percent!=='number'||!Number.isFinite(item.percent))return;
    emit({phase:'download',percent:Math.max(0,Math.min(100,item.percent))});
  };
  return {
    write(chunk){
      pending+=String(chunk);
      let end;while((end=pending.search(/[\r\n]/))>=0){line(pending.slice(0,end));pending=pending.slice(end+1);}
      if(pending.length>65536)pending='';
    },
    end(){if(pending)line(pending);pending='';},
  };
}
module.exports={progressParser};
