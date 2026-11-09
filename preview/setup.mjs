import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
if(process.platform!=='darwin')throw Error('C++ code preview setup currently supports macOS.');
const arch=process.arch==='arm64'?'arm64':'x86_64',name=`wasi-sdk-34.0-${arch}-macos`,root=path.join(os.homedir(),'.iq-raw','preview');
const hashes={arm64:'9c59398106b417f8f14913380fdf0097a8cc0ff4af9eb3ce0065a859e88d49e9',x86_64:'87d27fa8adc68dee59bfbf2e22a6d34ef717c34d6bf1d8af2a56fc929d9ce0eb'};
fs.mkdirSync(root,{recursive:true});
if(fs.existsSync(path.join(root,name,'bin','clang++'))){console.log('Browser preview compiler is already installed.');process.exit(0);}
const archive=path.join(root,name+'.tar.gz');
const download=spawnSync('/usr/bin/curl',['-fL',`https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-34/${name}.tar.gz`,'-o',archive],{stdio:'inherit'});
if(download.status!==0)throw Error('WASI SDK download failed.');
const hash=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');if(hash!==hashes[arch])throw Error('WASI SDK checksum did not match. The archive was not extracted.');
const unpack=spawnSync('/usr/bin/tar',['-xzf',archive,'-C',root],{stdio:'inherit'});if(unpack.status!==0)throw Error('WASI SDK extraction failed.');
fs.unlinkSync(archive);console.log('Installed browser-preview compiler: '+path.join(root,name));
