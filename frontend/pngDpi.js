const PNG_SIGNATURE_LENGTH = 8;
const METERS_PER_INCH = 0.0254;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunkType(bytes, offset) {
  return String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
}

function phys(dpi) {
  const perMeter = Math.round(dpi / METERS_PER_INCH);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, perMeter);
  view.setUint32(12, perMeter);
  chunk[16] = 1; // unit: meter
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  return chunk;
}

/** Returns a copy of a PNG (Uint8Array) with its pHYs (pixels per meter) chunk set to `dpi`. */
export function setPngDpi(bytes, dpi) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts = [bytes.subarray(0, PNG_SIGNATURE_LENGTH)];
  let offset = PNG_SIGNATURE_LENGTH;

  while (offset < bytes.length) {
    const end = offset + 12 + view.getUint32(offset);
    const type = chunkType(bytes, offset);
    if (type !== "pHYs") parts.push(bytes.subarray(offset, end));
    if (type === "IHDR") parts.push(phys(dpi));
    offset = end;
  }

  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let position = 0;
  for (const part of parts) {
    result.set(part, position);
    position += part.length;
  }
  return result;
}
