/**
 * M06: Perception Fusion — Canonical Deterministic Target ID Generation
 * Author: AI005 (Perception Fusion Engineer)
 * Authority: ADR 004, MODULES.md, docs/system-design/SYSTEM-DESIGN.md, INTERFACES.md
 */

import { BoundingBox } from './types';
import { TargetIdGenerationError } from './errors';

// Round constants K for SHA-256 (first 32 bits of the fractional parts of cube roots of first 64 primes)
const K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/**
 * Standard FIPS PUB 180-4 compliant SHA-256 implementation in pure TypeScript.
 * Deterministic, zero-dependency, and functions identically in Node.js and Chrome MV3 Service Worker.
 */
export function sha256(input: string): string {
  if (typeof input !== 'string') {
    throw new TargetIdGenerationError(`Expected string input for sha256, received: ${typeof input}`);
  }

  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  const bitLength = bytes.length * 8;

  // Calculate padded buffer size: must be a multiple of 64 bytes (512 bits)
  // [message bytes] + [0x80 byte] + [k zero bytes] + [8 length bytes]
  const remainder = (bytes.length + 1 + 8) % 64;
  const paddingZeroBytes = remainder === 0 ? 0 : 64 - remainder;
  const totalLength = bytes.length + 1 + paddingZeroBytes + 8;

  const buffer = new Uint8Array(totalLength);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;

  // Append length as 64-bit big-endian integer
  const view = new DataView(buffer.buffer);
  // High 32 bits of bitLength
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  view.setUint32(totalLength - 8, highBits, false);
  view.setUint32(totalLength - 4, lowBits, false);

  // Initial hash values (first 32 bits of fractional parts of square roots of first 8 primes)
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  // Process 512-bit (64-byte) blocks
  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }

    for (let i = 16; i < 64; i++) {
      const s0 =
        ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
        ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^
        (w[i - 15] >>> 3);

      const s1 =
        ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
        ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^
        (w[i - 2] >>> 10);

      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 =
        ((e >>> 6) | (e << 26)) ^
        ((e >>> 11) | (e << 21)) ^
        ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;

      const S0 =
        ((a >>> 2) | (a << 30)) ^
        ((a >>> 13) | (a << 19)) ^
        ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (n: number) => n.toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
}

/**
 * Generates canonical, deterministic target_id as SHA-256(DOM_XPath + BackendNodeId).
 * Enforces SYSTEM-DESIGN.md, MODULES.md, and ADR 004 specifications.
 */
export function generateDeterministicTargetId(xpath: string, backendNodeId: number | string): string {
  if (!xpath || typeof xpath !== 'string') {
    throw new TargetIdGenerationError('Invalid or empty XPath provided for target_id generation');
  }
  if (backendNodeId === undefined || backendNodeId === null || String(backendNodeId).trim() === '') {
    throw new TargetIdGenerationError('Invalid or empty backendNodeId provided for target_id generation');
  }

  // Canonical format: SHA-256(DOM_XPath + BackendNodeId)
  const canonicalPayload = `${xpath.trim()}+${String(backendNodeId).trim()}`;
  return sha256(canonicalPayload);
}

/**
 * Generates a deterministic synthetic target_id for non-DOM elements (e.g. Visual/Canvas/OCR elements).
 */
export function generateSyntheticTargetId(source: 'visual' | 'ocr' | 'synthetic', descriptor: string): string {
  if (!descriptor || typeof descriptor !== 'string') {
    throw new TargetIdGenerationError('Invalid descriptor for synthetic target_id generation');
  }
  const canonicalPayload = `synthetic:${source}:${descriptor.trim()}`;
  return sha256(canonicalPayload);
}

/**
 * Ensures an element has a canonical target ID.
 * If xpath & backendNodeId exist, generates SHA-256(DOM_XPath + BackendNodeId).
 * If target_id is already provided and valid (e.g. 64-char hex or pre-computed), preserves it.
 * Otherwise generates a deterministic fallback based on coordinates and metadata.
 */
export function ensureCanonicalTargetId(element: {
  target_id?: string;
  xpath?: string;
  backendNodeId?: number;
  bbox: BoundingBox;
  role?: string;
}): string {
  if (element.xpath && element.backendNodeId !== undefined) {
    return generateDeterministicTargetId(element.xpath, element.backendNodeId);
  }

  if (element.target_id && element.target_id.trim().length > 0) {
    return element.target_id.trim();
  }

  // Fallback deterministic ID based on spatial coordinates and role
  const spatialDescriptor = `${element.role || 'element'}@${element.bbox.x},${element.bbox.y},${element.bbox.width},${element.bbox.height}`;
  return generateSyntheticTargetId('synthetic', spatialDescriptor);
}
