(function(){
  function attach({api,log,language,code}){
    const $=id=>document.getElementById(id);let binary,resolvePin,connecting=false;
    const mode=()=>$('transferMode').value==='bluetooth';
    const transport=new IQBluetooth.Transport({onData:text=>document.dispatchEvent(new CustomEvent('iqraw-bluetooth-data',{detail:text})),onState:state=>{
      $('bluetoothStatus').textContent=state.text+(state.connected?' · '+state.name:'');$('bluetoothConnect').textContent=state.connected?'Disconnect Bluetooth':'Connect Bluetooth';
      if($('bluetoothPinDialog').open&&!state.connected&&state.text.startsWith('Incorrect'))$('bluetoothPinStatus').textContent=state.text;
      document.dispatchEvent(new CustomEvent('iqraw-bluetooth-state',{detail:state}));paint();
    }});
    const getPin=()=>new Promise(resolve=>{resolvePin=resolve;$('bluetoothPin').value='';$('bluetoothPinDialog').showModal();$('bluetoothPin').focus();});
    $('bluetoothPinForm').onsubmit=event=>{event.preventDefault();if(!/^\d{4}$/.test($('bluetoothPin').value))return;const value=$('bluetoothPin').value;resolvePin?.(value);resolvePin=null;$('bluetoothPinDialog').close();};
    $('bluetoothPinCancel').onclick=()=>{$('bluetoothPinDialog').close();};
    $('bluetoothPinDialog').addEventListener('close',()=>{resolvePin?.(null);resolvePin=null;});
    $('bluetoothConnect').onclick=async()=>{
      if(transport.ready){transport.disconnect();return;}
      connecting=true;$('bluetoothConnect').disabled=true;
      try{await transport.connect(getPin);log('Bluetooth paired with '+transport.device.name+'.');}
      catch(error){log(error.name==='NotFoundError'?'Bluetooth device selection cancelled.':error.message,'err');}
      finally{connecting=false;$('bluetoothConnect').disabled=false;paint();}
    };
    function paint(){
      const bluetooth=mode();$('bluetoothControls').hidden=!bluetooth;
      const unsupported=!navigator.bluetooth;$('bluetoothSupport').hidden=!unsupported;$('bluetoothConnect').disabled=unsupported||connecting;
      for(const id of ['send','sendOnly','run','stop']){const el=$(id);if(el)el.disabled=bluetooth?!transport.ready:Boolean(window.IQHosted);}
      $('consoleConnect').disabled=!bluetooth&&Boolean(window.IQHosted);
      $('build').disabled=false;
      for(const id of ['vm','refresh','programs','probe']){const el=$(id);if(el)el.disabled=bluetooth||Boolean(window.IQHosted);}
      document.dispatchEvent(new CustomEvent('iqraw-transport-change',{detail:{bluetooth,connected:transport.ready}}));
    }
    $('transferMode').onchange=()=>{if(!mode())transport.disconnect();paint();};
    $('bluetoothBinary').onchange=async()=>{const file=$('bluetoothBinary').files[0];if(!file)return;binary=null;if(!file.size||file.size>2*1024*1024){log('Choose a compiled IQ2 .bin under 2 MB.','err');return;}binary={name:file.name,bytes:new Uint8Array(await file.arrayBuffer())};$('bluetoothBinaryName').textContent=binary.name;};
    $('bluetoothBinaryClear').onclick=()=>{binary=null;$('bluetoothBinary').value='';$('bluetoothBinaryName').textContent='No binary selected · use editor code';};
    async function download(body,progress){
      let bytes;
      if(body.lang==='cpp'){
        if(binary)bytes=binary.bytes;
        else{
          progress({phase:'build',percent:null});const compiled=window.IQHosted?await IQBrowserCompiler.compile(body.code,progress):await api('bluetooth/build',{code:body.code});
          if(!compiled.ok)throw Error(compiled.out||compiled.error||'C++ build failed. On the hosted site, choose an IQ2 .bin built in the local app.');
          if(compiled.out)log(compiled.out.trim(),'okk');bytes=compiled.bytes||Uint8Array.from(atob(compiled.binary),c=>c.charCodeAt(0));
        }
      }else bytes=new TextEncoder().encode(body.code.replace(/\r\n/g,'\n'));
      return transport.download({...body,bytes},progress);
    }
    paint();
    document.addEventListener('iqraw-idle',paint);
    window.addEventListener('pagehide',()=>transport.disconnect());
    return {mode,download,run:slot=>transport.run(slot),stop:()=>transport.stop(),input:text=>transport.input(text),connected:()=>transport.ready,connect:()=>$('bluetoothConnect').click(),disconnect:()=>transport.disconnect()};
  }
  window.IQBluetoothUI={attach};
})();
