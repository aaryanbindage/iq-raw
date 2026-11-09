// Compile only: the result is an ARM IQ2 program, never executed by this worker.
export async function buildProgram(source,{session,sdk,onProgress=()=>{}}){
  if(typeof source!=='string'||!source.trim()||source.length>200000)throw Error('C++ source must be nonempty and under 200000 characters.');
  let output='';const decoder=new TextDecoder(),options={stdout:bytes=>{if(bytes)output=(output+decoder.decode(bytes,{stream:true})).slice(-64000);},stderr:bytes=>{if(bytes)output=(output+decoder.decode(bytes,{stream:true})).slice(-64000);}};
  for(const [name,base64]of Object.entries(sdk.files))await session.writeFile(name,Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));
  // LLD interprets the SDK's section-relative GNU ld assignment as absolute.
  const script=atob(sdk.files['sdk/lscript.ld']).replace(/\. = 0x20;/, '. = ORIGIN(SRAM_1_2_3) + 0x20;');
  await session.writeFile('sdk/lscript.ld',script);
  await session.writeFile('main.cpp',source);
  onProgress({phase:'build',percent:35,text:'Compiling C++ for IQ2…'});
  const flags=['clang++','--target=thumbv7-none-eabi','-mcpu=cortex-m4','-mthumb','-mfpu=fpv4-sp-d16','-mfloat-abi=hard','-fshort-enums','-fno-rtti','-fno-threadsafe-statics','-fno-exceptions','-std=gnu++11','-Os','-ffunction-sections','-fdata-sections','-Wno-unknown-attributes','-Wno-builtin-macro-redefined','-Werror=return-type','-U__INT32_TYPE__','-U__UINT32_TYPE__','-D__INT32_TYPE__=long','-D__UINT32_TYPE__=unsigned long','-DVexIQ2','-nostdinc++','-Iinclude','-Isdk/include','-Isdk/gcc/include/c++/7.3.1','-Isdk/gcc/include/c++/7.3.1/arm-none-eabi','-Isdk/gcc/include','-c','main.cpp','-o','main.o'];
  let status=await session.clang(flags,options);if(status!==0)return {ok:false,out:output||'C++ compilation failed.'};
  onProgress({phase:'build',percent:75,text:'Linking IQ2 program…'});
  status=await session.exec(['ld.lld','-z','norelro','-nostdlib','-u_printf_float','-T','sdk/lscript.ld','--gc-sections','-Lsdk','-Lsdk/gcc/libs','-o','program.elf','main.o','--start-group','-lviq2rt','-lc_nano','-lstdc++_nano','-lm','-lgcc','--end-group'],options);
  if(status!==0)return {ok:false,out:output||'IQ2 linking failed.'};
  const elf=await session.readFile('program.elf');const bytes=elfToBinary(elf);
  onProgress({phase:'build',percent:100,text:'C++ build complete'});return {ok:true,out:output+'Build OK · compiled in your browser with IQ2 SDK '+sdk.version+'.',bytes};
}

// Match objcopy -O binary: allocated, file-backed sections at their load addresses.
export function elfToBinary(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<52)throw Error('Invalid ARM executable.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint32(0,false)!==0x7f454c46||bytes[4]!==1||bytes[5]!==1||view.getUint16(18,true)!==40)throw Error('Expected a little-endian 32-bit ARM ELF executable.');
  const phoff=view.getUint32(28,true),phsize=view.getUint16(42,true),phnum=view.getUint16(44,true),shoff=view.getUint32(32,true),shsize=view.getUint16(46,true),shnum=view.getUint16(48,true),segments=[],sections=[];
  if(phsize<32||shsize<40||phoff+phsize*phnum>bytes.length||shoff+shsize*shnum>bytes.length)throw Error('Invalid ARM executable tables.');
  for(let i=0;i<phnum;i++){const p=phoff+i*phsize;if(view.getUint32(p,true)===1)segments.push({offset:view.getUint32(p+4,true),address:view.getUint32(p+12,true),size:view.getUint32(p+16,true)});}
  for(let i=0;i<shnum;i++){const p=shoff+i*shsize,type=view.getUint32(p+4,true),flags=view.getUint32(p+8,true),offset=view.getUint32(p+16,true),size=view.getUint32(p+20,true);if(!(flags&2)||type===8||!size)continue;if(offset+size>bytes.length)throw Error('Invalid ARM executable section.');const segment=segments.find(s=>offset>=s.offset&&offset+size<=s.offset+s.size);if(!segment)throw Error('Allocated section has no load segment.');sections.push({offset,size,address:segment.address+offset-segment.offset});}
  if(!sections.length)throw Error('ARM executable has no loadable data.');
  const first=Math.min(...sections.map(s=>s.address)),last=Math.max(...sections.map(s=>s.address+s.size));if(last-first>2*1024*1024)throw Error('IQ2 binary exceeds 2 MB.');const result=new Uint8Array(last-first);for(const s of sections)result.set(bytes.subarray(s.offset,s.offset+s.size),s.address-first);return result;
}
