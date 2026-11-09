// Extracts a plain ZIP (stored or deflated entries, no ZIP64 or encryption) with Node's own zlib, so C++ builds need no
// unzip program. That matters on Windows, which has none. Entry names that would escape the target folder are refused.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function extractZip(file, dest) {
  const zip = fs.readFileSync(file);
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) if (zip.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error(`${file} is not a ZIP file (or it is incomplete).`);
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const root = path.resolve(dest);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error(`${file} has a damaged directory.`);
    const flags = zip.readUInt16LE(at + 8), method = zip.readUInt16LE(at + 10), size = zip.readUInt32LE(at + 20);
    const nameLen = zip.readUInt16LE(at + 28), extraLen = zip.readUInt16LE(at + 30), commentLen = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString(flags & 0x800 ? 'utf8' : 'latin1', at + 46, at + 46 + nameLen);
    at += 46 + nameLen + extraLen + commentLen;
    const out = path.resolve(root, name);
    if (out !== root && !out.startsWith(root + path.sep)) throw new Error(`${file} has an entry outside its folder: ${name}`);
    if (name.endsWith('/')) { fs.mkdirSync(out, { recursive: true }); continue; }
    if (flags & 1) throw new Error(`${file} is encrypted.`);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(start, start + size);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (method === 0) fs.writeFileSync(out, data);
    else if (method === 8) fs.writeFileSync(out, zlib.inflateRawSync(data));
    else throw new Error(`${file} uses unsupported compression (method ${method}) for ${name}.`);
  }
}

module.exports = { extractZip };
