/** EchoType emits classic, uncompressed ZIPs. Strict parsing before JSZip prevents
 * compressed bombs (including forged size fields), path rewriting and ZIP64 allocations. */
export function preflightBackupZip(bytes: Uint8Array, maxBytes: number): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fail = (message: string): never => {
    throw new Error(`Invalid backup ZIP: ${message}`);
  };
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (u32(i) === 0x06054b50 && i + 22 + u16(i + 20) === bytes.length) {
      end = i;
      break;
    }
  }
  if (end < 0) fail('missing end directory');
  const entries = u16(end + 10);
  if (entries === 0 || entries > 10000) fail('entry count exceeds limit');
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== entries) fail('split archives are unsupported');
  const directorySize = u32(end + 12),
    directoryOffset = u32(end + 16);
  if (directoryOffset + directorySize !== end) fail('invalid directory bounds or ZIP64');
  let position = directoryOffset,
    expanded = 0;
  const names = new Set<string>();
  const ranges: Array<[number, number]> = [];
  const decode = (start: number, length: number) =>
    new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(start, start + length));
  for (let i = 0; i < entries; i++) {
    if (position + 46 > end || u32(position) !== 0x02014b50) fail('corrupt central directory');
    const flags = u16(position + 8),
      method = u16(position + 10);
    const compressed = u32(position + 20),
      size = u32(position + 24);
    expanded += size;
    if (expanded > maxBytes) fail('expanded size exceeds restore limit');
    // Do not trust declared lengths for DEFLATE. Official backups never compress.
    if (method !== 0 || compressed !== size) fail('compressed backups are unsupported; use the original EchoType ZIP');
    if (flags & ~0x800) fail('encryption or streaming descriptors are unsupported');
    const nameSize = u16(position + 28),
      extraSize = u16(position + 30),
      commentSize = u16(position + 32);
    if (extraSize || u16(position + 34)) fail('ZIP extensions and split archives are unsupported');
    if (position + 46 + nameSize + extraSize + commentSize > end) fail('truncated directory entry');
    const name = decode(position + 46, nameSize);
    if (!/^(manifest\.json|blobs\/|blobs\/\d+)$/.test(name)) fail('unsafe or unsupported entry path');
    if (names.has(name)) fail('duplicate entry path');
    names.add(name);
    if (name.endsWith('/') && size !== 0) fail('nonempty directory');
    const local = u32(position + 42);
    if (local + 30 > directoryOffset || u32(local) !== 0x04034b50) fail('invalid local header');
    if (u16(local + 6) !== flags || u16(local + 8) !== method || u16(local + 28) !== 0)
      fail('inconsistent local header');
    if (u32(local + 18) !== compressed || u32(local + 22) !== size || u32(local + 14) !== u32(position + 16))
      fail('inconsistent entry sizes or checksum');
    const localNameSize = u16(local + 26);
    const dataStart = local + 30 + localNameSize;
    if (dataStart + size > directoryOffset || decode(local + 30, localNameSize) !== name)
      fail('invalid local entry path or bounds');
    ranges.push([local, dataStart + size]);
    position += 46 + nameSize + extraSize + commentSize;
  }
  if (position !== end || !names.has('manifest.json')) fail('missing manifest or trailing directory data');
  ranges.sort(([a], [b]) => a - b);
  let boundary = 0;
  for (const [start, finish] of ranges) {
    if (start !== boundary) fail('overlapping or hidden ZIP entries');
    boundary = finish;
  }
  if (boundary !== directoryOffset) fail('unexpected data before directory');
}
