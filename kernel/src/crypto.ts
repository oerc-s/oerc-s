/**
 * OERC-S Kernel Cryptographic Operations
 * Implements signing, verification, and hashing using @noble libraries
 */

import { blake3 } from '@noble/hashes/blake3';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { ed25519 } from '@noble/curves/ed25519';
import type { SuiteId, HexString } from './types.js';
import { toCanonical } from './canonical.js';

// =============================================================================
// Constants
// =============================================================================

/** Domain separation prefix for OERC-S signatures */
const OERC_S_DOMAIN = 'OERC-S:v1:';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize hex string (remove 0x prefix, lowercase)
 */
export function normalizeHex(hex: HexString): string {
  return hex.toLowerCase().replace(/^0x/, '');
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToUint8Array(hex: HexString): Uint8Array {
  return hexToBytes(normalizeHex(hex));
}

/**
 * Convert Uint8Array to hex string (lowercase, no prefix)
 */
export function uint8ArrayToHex(bytes: Uint8Array): HexString {
  return bytesToHex(bytes);
}

/**
 * Create domain-separated message for signing
 */
function createSigningMessage(message: Uint8Array, suiteId: SuiteId): Uint8Array {
  const prefix = new TextEncoder().encode(`${OERC_S_DOMAIN}${suiteId}:`);
  const combined = new Uint8Array(prefix.length + message.length);
  combined.set(prefix, 0);
  combined.set(message, prefix.length);
  return combined;
}

// =============================================================================
// Hashing Functions
// =============================================================================

/**
 * Compute BLAKE3 hash of data
 * @param data - Data to hash (string or Uint8Array)
 * @returns Hex-encoded hash
 */
export function computeBlake3(data: string | Uint8Array): HexString {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = blake3(bytes);
  return uint8ArrayToHex(hash);
}

/**
 * Compute canonical object ID (blake3 of canonical JSON)
 * @param obj - Object to compute ID for
 * @returns Hex-encoded object ID
 */
export function computeCanonicalId(obj: unknown): HexString {
  const canonical = toCanonical(obj);
  return computeBlake3(canonical);
}

// =============================================================================
// Ed25519 Operations
// =============================================================================

/**
 * Sign a message using Ed25519
 * @param privateKey - Private key (hex-encoded, 32 bytes)
 * @param message - Message to sign (string or Uint8Array)
 * @param suiteId - Cryptographic suite identifier
 * @returns Hex-encoded signature
 */
export function signMessage(
  privateKey: HexString,
  message: string | Uint8Array,
  suiteId: SuiteId = 'ed25519-blake3'
): HexString {
  if (suiteId !== 'ed25519-blake3') {
    throw new Error(`Unsupported suite: ${suiteId}. Only ed25519-blake3 is currently supported.`);
  }

  const privKeyBytes = hexToUint8Array(privateKey);
  if (privKeyBytes.length !== 32) {
    throw new Error(`Invalid private key length: expected 32 bytes, got ${privKeyBytes.length}`);
  }

  const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const signingMessage = createSigningMessage(messageBytes, suiteId);

  // Hash the message before signing (Ed25519 with pre-hashing)
  const messageHash = blake3(signingMessage);
  const signature = ed25519.sign(messageHash, privKeyBytes);

  return uint8ArrayToHex(signature);
}

/**
 * Verify a signature using Ed25519
 * @param pubkey - Public key (hex-encoded, 32 bytes)
 * @param message - Original message (string or Uint8Array)
 * @param sig - Signature to verify (hex-encoded)
 * @param suiteId - Cryptographic suite identifier
 * @returns True if signature is valid
 */
export function verifySignature(
  pubkey: HexString,
  message: string | Uint8Array,
  sig: HexString,
  suiteId: SuiteId = 'ed25519-blake3'
): boolean {
  if (suiteId !== 'ed25519-blake3') {
    throw new Error(`Unsupported suite: ${suiteId}. Only ed25519-blake3 is currently supported.`);
  }

  try {
    const pubKeyBytes = hexToUint8Array(pubkey);
    if (pubKeyBytes.length !== 32) {
      return false;
    }

    const sigBytes = hexToUint8Array(sig);
    if (sigBytes.length !== 64) {
      return false;
    }

    const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    const signingMessage = createSigningMessage(messageBytes, suiteId);

    // Hash the message (must match signing)
    const messageHash = blake3(signingMessage);

    return ed25519.verify(sigBytes, messageHash, pubKeyBytes);
  } catch {
    return false;
  }
}

/**
 * Generate a new Ed25519 key pair
 * @returns Object with privateKey and publicKey (both hex-encoded)
 */
export function generateKeyPair(): { privateKey: HexString; publicKey: HexString } {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);

  return {
    privateKey: uint8ArrayToHex(privateKey),
    publicKey: uint8ArrayToHex(publicKey),
  };
}

/**
 * Derive public key from private key
 * @param privateKey - Private key (hex-encoded)
 * @returns Public key (hex-encoded)
 */
export function derivePublicKey(privateKey: HexString): HexString {
  const privKeyBytes = hexToUint8Array(privateKey);
  const publicKey = ed25519.getPublicKey(privKeyBytes);
  return uint8ArrayToHex(publicKey);
}

// =============================================================================
// Batch Verification
// =============================================================================

/**
 * Verify multiple signatures efficiently
 * @param items - Array of {pubkey, message, sig, suiteId} to verify
 * @returns Array of booleans indicating validity
 */
export function verifySignatureBatch(
  items: Array<{
    pubkey: HexString;
    message: string | Uint8Array;
    sig: HexString;
    suiteId: SuiteId;
  }>
): boolean[] {
  return items.map(({ pubkey, message, sig, suiteId }) =>
    verifySignature(pubkey, message, sig, suiteId)
  );
}
