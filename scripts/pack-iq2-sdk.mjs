import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import zlib from 'node:zlib';import {execFileSync} from 'node:child_process';
const base=path.join(os.homedir(),'Library/Application Support/Code/User/globalStorage/vexrobotics.vexcode/sdk/cpp/IQ2');
const version=fs.readdirSync(base).filter(n=>fs.existsSync(path.join(base,n,'vexiq2/libviq2rt.a'))).sort().at(-1);if(!version)throw Error('Install the IQ2 C++ SDK with the VEX VS Code extension first.');
const sdk=path.join(base,version,'vexiq2'),files={};
function walk(from,prefix){for(const entry of fs.readdirSync(from,{withFileTypes:true})){if(entry.isDirectory())walk(path.join(from,entry.name),prefix+'/'+entry.name);else files[prefix+'/'+entry.name]=fs.readFileSync(path.join(from,entry.name)).toString('base64');}}
walk(path.join(sdk,'include'),'sdk/include');walk(path.join(sdk,'gcc/include'),'sdk/gcc/include');
for(const name of ['libviq2rt.a','lscript.ld','license.pdf'])files['sdk/'+name]=fs.readFileSync(path.join(sdk,name)).toString('base64');
for(const name of ['libc_nano.a','libstdc++_nano.a','libm.a','libgcc.a'])files['sdk/gcc/libs/'+name]=fs.readFileSync(path.join(sdk,'gcc/libs',name)).toString('base64');
const ext=path.join(os.homedir(),'.vscode/extensions'),template=fs.readdirSync(ext).map(n=>path.join(ext,n,'resources/templates/projects/IQ2/cpp_iq2_vsc_empty.zip')).find(n=>fs.existsSync(n));
files['include/vex.h']=execFileSync('/usr/bin/unzip',['-p',template,'include/vex.h']).toString('base64');
const target=path.resolve(process.argv[2]||'public/compiler/iq2-sdk.json.gz');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,zlib.gzipSync(JSON.stringify({version,files}),{level:9}));console.log('Packed '+Object.keys(files).length+' IQ2 SDK files: '+fs.statSync(target).size+' bytes');
