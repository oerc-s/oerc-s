/**
 * OERC-S Kernel Canonical Encoding
 * Implements deterministic JSON serialization for consistent hashing
 */

import { computeBlake3 } from './crypto.js';
import type { HexString } from './types.js';

// =============================================================================
// Canonical JSON Encoding
// =============================================================================

/**
 * Convert an object to canonical (deterministic) JSON string
 * Rules:
 * - Keys sorted lexicographically (Unicode code point order)
 * - No whitespace (compact format)
 * - UTF-8 encoding
 * - Numbers as-is (no scientific notation normalization needed in JSON.stringify)
 * - Null values preserved
 * - Undefined values omitted
 *
 * @param obj - Object to serialize
 * @returns Canonical JSON string
 */
export function toCanonical(obj: unknown): string {
  return JSON.stringify(obj, sortedReplacer);
}

/**
 * Custom replacer that sorts object keys
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  // Handle null and primitives
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Handle arrays (preserve order, but process elements)
  if (Array.isArray(value)) {
    return value;
  }

  // Handle objects - sort keys
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(value as Record<string, unknown>).sort();

  for (const k of keys) {
    const v = (value as Record<string, unknown>)[k];
    // Skip undefined values
    if (v !== undefined) {
      sorted[k] = v;
    }
  }

  return sorted;
}

/**
 * Compute object ID from canonical JSON representation
 * @param obj - Object to compute ID for
 * @returns Hex-encoded BLAKE3 hash
 */
export function computeObjectId(obj: unknown): HexString {
  const canonical = toCanonical(obj);
  return computeBlake3(canonical);
}

/**
 * Parse JSON and return canonical form
 * @param json - JSON string to parse
 * @returns Canonical JSON string
 */
export function normalizeJson(json: string): string {
  const parsed = JSON.parse(json) as unknown;
  return toCanonical(parsed);
}

/**
 * Check if two objects are canonically equal
 * @param a - First object
 * @param b - Second object
 * @returns True if canonical representations match
 */
export function canonicalEqual(a: unknown, b: unknown): boolean {
  return toCanonical(a) === toCanonical(b);
}

/**
 * Deep clone an object through canonical serialization
 * @param obj - Object to clone
 * @returns Deep-cloned object
 */
export function canonicalClone<T>(obj: T): T {
  return JSON.parse(toCanonical(obj)) as T;
}

// =============================================================================
// Body Extraction for Signing
// =============================================================================

/**
 * Extract the body portion of a signed object for signature verification
 * This is what gets signed - the body in canonical form
 *
 * @param obj - Signed object (Intent, Frame, Collapse, Segment)
 * @returns Canonical JSON of the body
 */
export function extractBodyForSigning(obj: { body: unknown }): string {
  return toCanonical(obj.body);
}

/**
 * Compute the signing hash for an object's body
 * @param obj - Signed object
 * @returns Hex-encoded BLAKE3 hash of canonical body
 */
export function computeBodyHash(obj: { body: unknown }): HexString {
  const bodyCanonical = extractBodyForSigning(obj);
  return computeBlake3(bodyCanonical);
}
