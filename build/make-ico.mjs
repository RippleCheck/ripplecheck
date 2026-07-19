// Builds a multi-resolution .ico from build/icon.png. Each entry embeds a PNG
// (valid since Vista) so no BMP encoding is needed. Regenerate after changing
// the source artwork:  node build/make-ico.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SIZES = [16, 32, 48, 64, 128, 256];
const here = path.dirname(new URL(import.meta.url).pathname);
const src = path.join(here, "icon.png");
const out = path.join(here, "icon.ico");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ico-"));

const images = SIZES.map((size) => {
  const file = path.join(tmp, `${size}.png`);
  execFileSync("sips", ["-z", String(size), String(size), src, "--out", file], { stdio: "ignore" });
  return { size, data: fs.readFileSync(file) };
});

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);          // reserved
header.writeUInt16LE(1, 2);          // type: 1 = icon
header.writeUInt16LE(images.length, 4);

let offset = 6 + images.length * 16; // image data follows all 16-byte entries
const entries = images.map(({ size, data }) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(size >= 256 ? 0 : size, 0); // 0 encodes 256
  e.writeUInt8(size >= 256 ? 0 : size, 1);
  e.writeUInt16LE(1, 4);   // colour planes
  e.writeUInt16LE(32, 6);  // bits per pixel
  e.writeUInt32LE(data.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += data.length;
  return e;
});

fs.writeFileSync(out, Buffer.concat([header, ...entries, ...images.map((i) => i.data)]));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`icon.ico: ${fs.statSync(out).size} bytes, sizes ${SIZES.join(", ")}`);
