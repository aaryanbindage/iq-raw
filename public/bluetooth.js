// IQ2 BLE/CDC protocol. Independent implementation; protocol references in README.
(function(root){
  const UUID={service:'08590f7e-db05-467e-8757-72f6faeb13d5',tx:'08590f7e-db05-467e-8757-72f6faeb1306',rx:'08590f7e-db05-467e-8757-72f6faeb13f5',userTx:'08590f7e-db05-467e-8757-72f6faeb1316',userRx:'08590f7e-db05-467e-8757-72f6faeb1326',pin:'08590f7e-db05-467e-8757-72f6faeb13e5'};
  const encoder=new TextEncoder(),pause=ms=>new Promise(r=>setTimeout(r,ms));
  function crc16(bytes){let crc=0;for(const byte of bytes){crc^=byte<<8;for(let bit=0;bit<8;bit++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&0xffff;}return crc;}
  function crc32(bytes){let crc=0;for(const byte of bytes){crc^=byte<<24;for(let bit=0;bit<8;bit++)crc=((crc<<1)^((crc&0x80000000)?0x04c11db7:0))>>>0;}return crc;}
  function packet(command,data=new Uint8Array()){
    if(data.length>32767)throw Error('Bluetooth packet is too large.');
    const length=data.length<128?[data.length]:[0x80|(data.length>>8),data.length&255];
    const bytes=Uint8Array.from([0xc9,0x36,0xb8,0x47,0x56,command,...length,...data,0,0]);
    const crc=crc16(bytes.subarray(0,-2));bytes[bytes.length-2]=crc>>8;bytes[bytes.length-1]=crc&255;return bytes;
  }
  function responseLength(bytes){if(bytes.length<4)return null;if(bytes[0]!==0xaa||bytes[1]!==0x55||bytes[2]!==0x56)throw Error('Unexpected Bluetooth response header.');if(bytes[3]&128)return bytes.length<5?null:5+((bytes[3]&127)<<8)+bytes[4];return 4+bytes[3];}
  function decode(bytes,command){
    if(responseLength(bytes)!==bytes.length||crc16(bytes)!==0)throw Error('Bluetooth response failed its length or checksum check.');
    const offset=bytes[3]&128?5:4;if(bytes[offset]!==command)throw Error('Unexpected Bluetooth command response.');
    const ack=bytes[offset+1];if(ack!==0x76)throw Error(`Brain rejected Bluetooth command 0x${command.toString(16)} (0x${ack.toString(16)}).`);
    return bytes.subarray(offset+2,-2);
  }
  function named(vid,option,name){const data=new Uint8Array(26);data.set([vid,option]);data.set(encoder.encode(name).subarray(0,23),2);return data;}
  function initialize(name,bytes,address,ext=0){
    const data=new Uint8Array(52),view=new DataView(data.buffer);data.set([1,1,1,1]);view.setUint32(4,bytes.length,true);view.setUint32(8,address,true);view.setUint32(12,crc32(bytes),true);
    data.set(encoder.encode(name.split('.').pop()).subarray(0,3),16);data[19]=ext;view.setUint32(20,Math.floor(Date.now()/1000)-946684800,true);view.setUint32(24,1,true);data.set(encoder.encode(name).subarray(0,23),28);return data;
  }
  class Transport{
    constructor({bluetooth=root.navigator?.bluetooth,onData=()=>{},onState=()=>{},timeoutMs=10000}={}){this.timeoutMs=timeoutMs;this.bluetooth=bluetooth;this.onData=onData;this.onState=onState;this.ready=false;this.busy=false;this.pending=null;}
    state(text){this.onState({connected:this.ready,name:this.device?.name||'IQ2',text});}
    disconnected(){this.ready=false;this.pending?.reject(Error('Bluetooth disconnected. The transfer was interrupted; completion was not confirmed.'));this.pending=null;this.state('Disconnected');}
    disconnect(){this.device?.gatt?.disconnect();this.disconnected();}
    async connect(getPin){
      if(!this.bluetooth)throw Error('Bluetooth requires Chrome or Edge with Web Bluetooth support. Open this page in one of those browsers.');
      if(this.device?.gatt?.connected)this.disconnect();
      // Must remain directly in the button gesture, before any awaited operation.
      this.device=await this.bluetooth.requestDevice({filters:[{services:[0x0620]}],optionalServices:[UUID.service]});
      const selected=this.device;selected.addEventListener('gattserverdisconnected',()=>{if(this.device===selected)this.disconnected();});this.state('Connecting…');
      try{
        const gatt=await selected.gatt.connect(),service=await gatt.getPrimaryService(UUID.service);
        for(const key of ['tx','rx','pin','userTx','userRx'])this[key]=await service.getCharacteristic(UUID[key]);
        this.tx.addEventListener('characteristicvaluechanged',event=>this.receive(new Uint8Array(event.target.value.buffer,event.target.value.byteOffset,event.target.value.byteLength)));
        this.decoder=new TextDecoder();this.userTx.addEventListener('characteristicvaluechanged',event=>{const data=event.target.value;this.onData(this.decoder.decode(new Uint8Array(data.buffer,data.byteOffset,data.byteLength),{stream:true}));});
        await this.tx.startNotifications();await this.userTx.startNotifications();
        // Request that the brain display its connection code. PINs are never stored.
        await this.write(this.pin,Uint8Array.of(255,255,255,255));
        let unlocked=false;
        while(!unlocked){
          const pin=await getPin();if(pin===null)throw Error('Bluetooth pairing cancelled.');
          if(!/^\d{4}$/.test(pin))throw Error('Enter the four-digit code shown on the IQ2 brain.');
          const digits=Uint8Array.from(pin,c=>Number(c));await this.write(this.pin,digits);await pause(500);
          const reply=await this.pin.readValue();unlocked=reply.byteLength===4&&digits.every((n,i)=>reply.getUint8(i)===n);
          if(!unlocked)this.state('Incorrect code. Try the code on the brain again.');
        }
        this.ready=true;this.state('Connected');return {ok:true};
      }catch(error){this.disconnect();throw error;}
    }
    write(characteristic,bytes){return characteristic.writeValueWithResponse?characteristic.writeValueWithResponse(bytes):characteristic.writeValue(bytes);}
    receive(bytes){
      const pending=this.pending;if(!pending)return;
      try{
        const combined=new Uint8Array(pending.bytes.length+bytes.length);combined.set(pending.bytes);combined.set(bytes,pending.bytes.length);pending.bytes=combined;
        const length=pending.rawLength||responseLength(combined);if(length!==null&&combined.length>=length){if(combined.length!==length)throw Error('Unexpected extra Bluetooth response data.');this.pending=null;pending.resolve(pending.rawLength?combined:decode(combined,pending.command));}
      }catch(error){this.pending=null;pending.reject(error);this.disconnect();}
    }
    request(command,data,rawLength=0){
      if(!this.device?.gatt?.connected)return Promise.reject(Error('Connect and pair an IQ2 brain first.'));
      if(this.pending)return Promise.reject(Error('Another Bluetooth request is running.'));
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{this.pending=null;this.ready=false;this.device?.gatt?.disconnect();reject(Error('Bluetooth response timed out. Transfer completion was not confirmed. Reconnect before retrying.'));},this.timeoutMs);
        this.pending={command,rawLength,bytes:new Uint8Array(),resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}};
        this.write(this.rx,rawLength?Uint8Array.of(0xc9,0x36,0xb8,0x47,command):packet(command,data)).catch(error=>{const p=this.pending;this.pending=null;p?.reject(error);this.disconnect();});
      });
    }
    async exclusive(work){if(!this.ready)throw Error('Connect and pair an IQ2 brain first.');if(this.busy)throw Error('A Bluetooth operation is already running.');this.busy=true;try{return await work();}finally{this.busy=false;}}
    async save(name,bytes,{address=0x03800000,ext=0,link=false,run=false,onProgress=()=>{}}={}){
      const reply=await this.request(0x11,initialize(name,bytes,address,ext));if(reply.length<2)throw Error('Brain did not provide a file-transfer packet size.');
      const offered=new DataView(reply.buffer,reply.byteOffset,reply.byteLength).getUint16(0,true),size=Math.floor(Math.min(offered,128)/4)*4;if(size<4)throw Error('Invalid Bluetooth file-transfer packet size.');
      for(let offset=0;offset<bytes.length;offset+=size){
        const part=bytes.subarray(offset,offset+size),data=new Uint8Array(4+Math.ceil(part.length/4)*4);new DataView(data.buffer).setUint32(0,address+offset,true);data.set(part,4);
        await this.request(0x13,data);onProgress(Math.min(bytes.length,offset+part.length));
      }
      if(link)await this.request(0x15,named(64,0,'python_vm.bin'));
      await this.request(0x12,Uint8Array.of(run?1:3));
    }
    async download({slot,name,lang,bytes,run},onProgress=()=>{}){
      return this.exclusive(async()=>{
        if(!Number.isInteger(slot)||slot<1||slot>8)throw Error('Slot must be between 1 and 8.');
        if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>2*1024*1024)throw Error('Choose a nonempty program smaller than 2 MB.');
        if(lang==='python'){
          try{const vm=await this.request(0x19,named(64,0,'python_vm.bin'));if(vm.length<9||new DataView(vm.buffer,vm.byteOffset,vm.byteLength).getUint32(1,true)===0)throw Error('No usable Python VM found.');}catch(error){throw Error('Python VM could not be verified. Install it once using the local app’s USB “Install Python VM” control, then reconnect Bluetooth. '+error.message);}
        }
        await this.request(0x18,named(1,128,'null'));
        const safeName=String(name||'iq-raw').replace(/[^\w .-]/g,'').slice(0,32)||'iq-raw';
        const ini=encoder.encode(`[project]\nversion = "1"\nide = "IQ Raw"\n[program]\nversion = "1"\nname = "${safeName}"\nslot = "${slot-1}"\nicon = "${lang==='cpp'?'USER926x.bmp':'USER925x.bmp'}"\ndescription = ""\n[config]\n`);
        const total=ini.length+bytes.length;onProgress({phase:'download',percent:0});
        await this.save(`slot_${slot}.ini`,ini,{onProgress:n=>onProgress({phase:'download',percent:n/total*99})});
        await this.save(`slot_${slot}.bin`,bytes,{address:lang==='python'?0x10300000:0x03800000,ext:lang==='python'?97:0,link:lang==='python',run,onProgress:n=>onProgress({phase:'download',percent:(ini.length+n)/total*99})});
        onProgress({phase:'download',percent:100});return {ok:true,out:`Bluetooth download to slot ${slot}${run?' and run':''} confirmed by brain.`};
      });
    }
    run(slot){return this.exclusive(async()=>{if(!Number.isInteger(slot)||slot<1||slot>8)throw Error('Slot must be between 1 and 8.');await this.request(0x18,named(1,0,`slot_${slot}.bin`));return {ok:true,out:'Bluetooth run confirmed by brain.'};});}
    stop(){return this.exclusive(async()=>{await this.request(0x18,named(1,128,'null'));return {ok:true,out:'Bluetooth stop confirmed by brain.'};});}
    input(text){return this.exclusive(async()=>{const bytes=encoder.encode(text);if(bytes.length>1000)throw Error('Console input must be under 1000 bytes.');for(let i=0;i<bytes.length;i+=128)await this.write(this.userRx,bytes.subarray(i,i+128));return {ok:true};});}
  }
  const api={Transport,UUID,packet,crc16,crc32,responseLength,decode,initialize,named};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IQBluetooth=api;
})(typeof window!=='undefined'?window:globalThis);
