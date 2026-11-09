import fs from 'node:fs';
import binaryen from 'binaryen';
const module=binaryen.readBinary(fs.readFileSync(process.argv[2]));
binaryen.setPassArgument('asyncify-imports','iqraw.sleep,wasi_snapshot_preview1.fd_read');
module.runPasses(['asyncify']);
fs.writeFileSync(process.argv[3],module.emitBinary());module.dispose();
