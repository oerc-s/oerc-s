/**
 * OERC-S Kernel
 * Main export file
 */

// Types
export * from './types.js';

// Cryptographic operations
export {
  signMessage,
  verifySignature,
  computeBlake3,
  computeCanonicalId,
  generateKeyPair,
  derivePublicKey,
  normalizeHex,
  hexToUint8Array,
  uint8ArrayToHex,
} from './crypto.js';

// Canonical encoding
export {
  toCanonical,
  computeObjectId,
  normalizeJson,
  canonicalEqual,
  canonicalClone,
  extractBodyForSigning,
  computeBodyHash,
} from './canonical.js';

// Verification
export {
  verify,
  verifyIntent,
  verifyFrame,
  verifyCollapse,
  verifySingleSignature,
} from './verify.js';

// Conformance testing
export {
  loadVectors,
  runVector,
  generateReport,
  runConformanceCheck,
} from './conformance.js';
