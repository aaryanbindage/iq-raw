// Installs the WASI SDK that compiles C++ previews, for this OS and CPU, into ~/.iq-raw/preview.
// The archive is checked against GitHub's SHA-256 before anything is extracted.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {createRequire} from 'node:module';
const {wasiSdk}=createRequire(import.meta.url)('./wasi-sdk.js');
const sdk=wasiSdk();
if(!sdk)throw Error(`No C++ preview compiler is published for ${process.platform} on ${process.arch}. Supported: macOS, Windows and Linux on x64 or arm64.`);
fs.mkdirSync(sdk.root,{recursive:true});
if(fs.existsSync(sdk.clang)){console.log('Browser preview compiler is already installed.');process.exit(0);}
const archive=path.join(sdk.root,sdk.archive),partial=archive+'.part';
// An archive left by an earlier run (for example, one whose extraction failed) is reused if its checksum matches.
const sha256=file=>new Promise((resolve,reject)=>{const h=crypto.createHash('sha256');fs.createReadStream(file).on('data',d=>h.update(d)).on('error',reject).on('end',()=>resolve(h.digest('hex')));});
if(fs.existsSync(archive)&&await sha256(archive)===sdk.sha256)console.log('Using the already downloaded '+sdk.archive);
else await download();
// Windows 10+ ships bsdtar as System32\tar.exe; prefer it over a GNU tar from Git, which misreads C:\ paths.
const windowsTar=path.join(process.env.SystemRoot||'C:\\Windows','System32','tar.exe');
const tar=process.platform==='win32'&&fs.existsSync(windowsTar)?windowsTar:'tar';
const unpack=spawnSync(tar,['-xzf',archive,'-C',sdk.root],{stdio:'inherit'});
if(unpack.status!==0||!fs.existsSync(sdk.clang))throw Error('WASI SDK extraction failed.');
fs.unlinkSync(archive);console.log('Installed browser-preview compiler: '+sdk.folder);

async function download(){
  console.log(`Downloading ${sdk.url}`);
  const response=await fetch(sdk.url);
  if(!response.ok)throw Error(`WASI SDK download failed: HTTP ${response.status}.`);
  const total=Number(response.headers.get('content-length'))||0,hash=crypto.createHash('sha256'),out=fs.createWriteStream(partial);
  let received=0,shown=-1;
  for await(const chunk of response.body){
    hash.update(chunk);received+=chunk.length;
    if(!out.write(chunk))await new Promise(resolve=>out.once('drain',resolve));
    const percent=total?Math.floor(received*100/total):-1;
    if(percent!==shown&&percent%5===0){shown=percent;process.stdout.write(`\r${percent}% of ${Math.round(total/1048576)} MB`);}
  }
  await new Promise((resolve,reject)=>out.end(error=>error?reject(error):resolve()));
  process.stdout.write('\n');
  if(hash.digest('hex')!==sdk.sha256){fs.rmSync(partial,{force:true});throw Error('WASI SDK checksum did not match. The archive was deleted, not extracted.');}
  fs.renameSync(partial,archive);
}
