// WASI has only virtual stdin/stdout. No filesystem preopens or network imports.
export async function runCpp(bytes,{WASI,File,OpenFile,ConsoleStdout,Asyncify,emit,buttons,readLine,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
  const output=new TextDecoder(),errorOutput=new TextDecoder(),decoder=new TextDecoder();let instance,input=new Uint8Array();
  const wasi=new WASI(['preview'],[],[
    new OpenFile(new File([])),
    new ConsoleStdout(data=>emit({type:'console',text:output.decode(data,{stream:true})})),
    new ConsoleStdout(data=>emit({type:'console',text:errorOutput.decode(data,{stream:true})})),
  ]);
  const read=wasi.wasiImport.fd_read;
  wasi.wasiImport.fd_read=async(fd,iovs,len,nread)=>{
    if(fd!==0)return read(fd,iovs,len,nread);
    if(!input.length)input=new TextEncoder().encode(await readLine());
    const memory=instance.exports.memory,view=new DataView(memory.buffer),buffer=new Uint8Array(memory.buffer);let count=0;
    for(let i=0;i<len&&input.length;i++){
      const address=view.getUint32(iovs+i*8,true),size=view.getUint32(iovs+i*8+4,true),n=Math.min(size,input.length);
      buffer.set(input.subarray(0,n),address);input=input.subarray(n);count+=n;
    }
    view.setUint32(nread,count,true);return 0;
  };
  const start=performance.now();
  const imports={wasi_snapshot_preview1:wasi.wasiImport,iqraw:{
    emit(ptr,len){if(len<0||len>65536)throw Error('Preview message exceeds its size limit.');const data=new Uint8Array(instance.exports.memory.buffer,ptr,len);emit(JSON.parse(decoder.decode(data)));},
    sleep:ms=>sleep(Math.max(0,Math.min(3600000,Number(ms)||0))),
    clock:()=>performance.now()-start,
    button:id=>Number(Boolean(buttons[['left','right','check'][id]])),
  }};
  const result=await Asyncify.instantiate(bytes,imports);instance=result.instance||result;wasi.inst=instance;
  // Reserve an independent 1 MB Asyncify stack, away from WASI data and the heap.
  const stack=await instance.exports.malloc(1048576);
  if(!stack)throw Error('Could not allocate the preview stack.');
  new Int32Array(instance.exports.memory.buffer,16,2).set([stack,stack+1048576]);
  try{await instance.exports._start();}catch(error){if(error.constructor?.name!=='WASIProcExit'||error.code!==0)throw error;}
  const tail=output.decode()+errorOutput.decode();if(tail)emit({type:'console',text:tail});
  emit({type:'finished',interactive:false});
}
