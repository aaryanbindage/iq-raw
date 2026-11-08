(function(root){
  const COLOURS={red:'#ff3030',green:'#32d75b',blue:'#347bff',yellow:'#ffe73b',orange:'#ff9e2b',purple:'#a864ee',cyan:'#42e5ed',white:'#fff',black:'#000',transparent:null,red_violet:'#c71585',violet:'#8a2be2',blue_violet:'#4b0082',blue_green:'#008b8b',yellow_green:'#9acd32',yellow_orange:'#ffbe00',red_orange:'#ff4500'};
  const colour=value=>{const key=String(value).replace(/^Color\./,'').toLowerCase();return Object.hasOwn(COLOURS,key)?COLOURS[key]:/^rgb\(\d+,\d+,\d+\)$/.test(key)?key:'#fff';};
  class Screen{
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.reset();}
    reset(){this.pen='#fff';this.fill=null;this.width=1;this.font=12;this.proportional=false;this.origin=[0,0];this.clip=[0,0,160,108];this.ctx.fillStyle='#000';this.ctx.fillRect(0,0,160,108);}
    draw(c){
      const ctx=this.ctx;
      if(c.op==='pen'||c.op==='fill'){this[c.op]=colour(c.colour);return;}
      if(c.op==='width'){this.width=Math.max(1,Math.min(100,Number(c.value)||1));return;}
      if(c.op==='font'){this.font=Math.max(1,Math.min(100,c.height));this.proportional=c.proportional;return;}
      if(c.op==='origin'){if([c.x,c.y].every(Number.isFinite))this.origin=[c.x,c.y];return;}
      if(c.op==='clip'){if([c.x,c.y,c.w,c.h].every(Number.isFinite))this.clip=[c.x,c.y,Math.max(0,c.w),Math.max(0,c.h)];return;}
      if(c.op==='clear'){ctx.fillStyle='#000';ctx.fillRect(0,0,160,108);return;}
      if(c.op==='clearRow'){ctx.fillStyle='#000';ctx.fillRect(0,c.y,160,c.h);return;}
      const numbers=Object.values(c).filter(value=>typeof value==='number');
      if(numbers.some(n=>!Number.isFinite(n)||Math.abs(n)>32000))return;
      if(c.points?.some(p=>p.some(n=>!Number.isFinite(n)||Math.abs(n)>32000)))return;
      ctx.save();ctx.beginPath();ctx.rect(...this.clip);ctx.clip();ctx.translate(...this.origin);
      ctx.strokeStyle=this.pen||'transparent';ctx.fillStyle=this.fill||'transparent';ctx.lineWidth=this.width;ctx.font=`${this.font}px ${this.proportional?'sans-serif':'monospace'}`;ctx.textBaseline='alphabetic';
      if(c.op==='pixel'){if(this.pen){ctx.fillStyle=this.pen;ctx.fillRect(c.x,c.y,1,1);}}
      else if(c.op==='text'){if(this.pen){ctx.fillStyle=this.pen;ctx.fillText(c.text,c.x,c.y);}}
      else{
        ctx.beginPath();
        if(c.op==='line'){ctx.moveTo(c.x,c.y);ctx.lineTo(c.x2,c.y2);}
        if(c.op==='rect')ctx.rect(c.x,c.y,c.w,c.h);
        if(c.op==='circle')ctx.arc(c.x,c.y,Math.abs(c.r),0,Math.PI*2);
        if(c.op==='path')c.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
        if(['rect','circle'].includes(c.op)&&this.fill)ctx.fill();
        if(this.pen)ctx.stroke();
      }
      ctx.restore();
    }
  }
  const api={Screen,colour};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IQSimulatorScreen=api;
})(typeof self!=='undefined'?self:globalThis);
