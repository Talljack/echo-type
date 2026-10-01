/*
 * Canonicalization + collision-resistant hashing for the Next For You
 * decision engine (mission 008C, spec §2).
 *
 * The experiment prototype hashed with node:crypto — not acceptable in
 * the learner-facing browser bundle, and the selection path is
 * synchronous so WebCrypto's async digest is not usable here. This
 * module therefore carries a small, dependency-free SHA-256
 * implementation (FIPS 180-4) verified against the standard known
 * answer vectors in tests/vnext-next-for-you-runtime.test.mjs.
 *
 *   canon(v)   — canonical JSON: object keys sorted recursively, so
 *                equal semantic content serializes identically
 *                regardless of field order.
 *   sha256(v)  — hex digest over the canonical form. "Collision-
 *                resistant", not "impossible" — provenance identity
 *                only, never a trust decision by itself.
 *
 * Pure ES2020: no Node builtins, no WebCrypto, no async.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

const W = new Uint32Array(64);

/* FIPS 180-4 compression over one 64-byte block. */
function compress(h, block, off) {
  for (let t = 0; t < 16; t++) {
    const i = off + t * 4;
    W[t] = (block[i] << 24) | (block[i + 1] << 16) | (block[i + 2] << 8) | block[i + 3];
  }
  for (let t = 16; t < 64; t++) {
    const a = W[t - 15], b = W[t - 2];
    const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
    const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
    W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
  }
  let [A, B, C, D, E, F, G, H] = h;
  for (let t = 0; t < 64; t++) {
    const S1 = ((E >>> 6) | (E << 26)) ^ ((E >>> 11) | (E << 21)) ^ ((E >>> 25) | (E << 7));
    const ch = (E & F) ^ (~E & G);
    const t1 = (H + S1 + ch + K[t] + W[t]) >>> 0;
    const S0 = ((A >>> 2) | (A << 30)) ^ ((A >>> 13) | (A << 19)) ^ ((A >>> 22) | (A << 10));
    const maj = (A & B) ^ (A & C) ^ (B & C);
    const t2 = (S0 + maj) >>> 0;
    H = G; G = F; F = E; E = (D + t1) >>> 0;
    D = C; C = B; B = A; A = (t1 + t2) >>> 0;
  }
  h[0] = (h[0] + A) >>> 0; h[1] = (h[1] + B) >>> 0; h[2] = (h[2] + C) >>> 0; h[3] = (h[3] + D) >>> 0;
  h[4] = (h[4] + E) >>> 0; h[5] = (h[5] + F) >>> 0; h[6] = (h[6] + G) >>> 0; h[7] = (h[7] + H) >>> 0;
}

export function sha256Bytes(bytes) {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const bitLen = bytes.length * 8;
  /* pad: 0x80, zeros to 56 mod 64, 64-bit big-endian bit length */
  const paddedLen = (((bytes.length + 8) >> 6) + 1) << 6;
  const msg = new Uint8Array(paddedLen);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const dv = new DataView(msg.buffer);
  dv.setUint32(paddedLen - 4, bitLen >>> 0, false);
  dv.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  for (let off = 0; off < paddedLen; off += 64) compress(h, msg, off);
  return h;
}

const utf8 = new TextEncoder();

export function sha256HexOfString(s) {
  const h = sha256Bytes(utf8.encode(s));
  let out = '';
  for (const w of h) out += w.toString(16).padStart(8, '0');
  return out;
}

/* Canonical JSON: object keys sorted recursively so equal semantic
 * content always serializes identically regardless of field order.
 * Byte-identical to the approved 008B form — including its edge case
 * that a top-level undefined serializes as `undefined` — so digests
 * over the same state match the experiment corpus exactly. */
export function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
}

/* Always canonicalize first (a string input is JSON-quoted like the
 * 008B original) — digests stay byte-identical to the approved corpus. */
export const sha256 = (v) => sha256HexOfString(canon(v));

export function deepFreezeShallow(o) {
  if (o && typeof o === 'object') Object.freeze(o);
  return o;
}

/* Deep freeze — for append-only log records. */
export function deepFreezeAll(o) {
  if (o && typeof o === 'object') {
    for (const v of Object.values(o)) deepFreezeAll(v);
    Object.freeze(o);
  }
  return o;
}
