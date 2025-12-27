/**
 * OERC-S Kernel Verification Logic
 * Implements verification for Intent, Frame, and Collapse objects
 */

import type {
  Intent,
  Frame,
  Collapse,
  Sigset,
  Signature,
  VerificationResult,
  SignedObject,
} from './types.js';
import { isIntent, isFrame, isCollapse, isSegment } from './types.js';
import { verifySignature } from './crypto.js';
import { extractBodyForSigning, computeObjectId } from './canonical.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a successful verification result
 */
function success(warnings?: string[]): VerificationResult {
  return { valid: true, errors: [], warnings };
}

/**
 * Create a failed verification result
 */
function failure(errors: string[]): VerificationResult {
  return { valid: false, errors };
}

/**
 * Verify a signature set against message bytes
 */
function verifySigset(
  sigset: Sigset,
  message: string,
  authorizedPubkeys?: Set<string>
): { valid: boolean; validCount: number; errors: string[] } {
  const errors: string[] = [];
  let validCount = 0;

  for (let i = 0; i < sigset.signatures.length; i++) {
    const sig = sigset.signatures[i];
    if (!sig) continue;

    // Check if signer is authorized (if list provided)
    if (authorizedPubkeys && !authorizedPubkeys.has(sig.pubkey.toLowerCase())) {
      errors.push(`Signature ${i}: signer ${sig.pubkey} is not authorized`);
      continue;
    }

    // Verify the signature
    const isValid = verifySignature(sig.pubkey, message, sig.sig, sig.suite_id);
    if (isValid) {
      validCount++;
    } else {
      errors.push(`Signature ${i}: invalid signature from ${sig.pubkey}`);
    }
  }

  const valid = validCount >= sigset.threshold;
  if (!valid && validCount < sigset.threshold) {
    errors.push(
      `Threshold not met: ${validCount} valid signatures, need ${sigset.threshold}`
    );
  }

  return { valid, validCount, errors };
}

// =============================================================================
// Intent Verification
// =============================================================================

/**
 * Verify an Intent object
 * Checks:
 * - Object structure
 * - ID matches canonical body hash
 * - Signature validity
 * - Threshold met
 *
 * @param intent - Intent to verify
 * @returns Verification result
 */
export function verifyIntent(intent: Intent): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check object type
  if (intent.object_type !== 'intent') {
    errors.push(`Invalid object_type: expected 'intent', got '${intent.object_type}'`);
    return failure(errors);
  }

  // Check required body fields
  const body = intent.body;
  if (!body) {
    errors.push('Missing body');
    return failure(errors);
  }

  if (!body.id) {
    errors.push('Missing body.id');
  }

  if (!body.version) {
    errors.push('Missing body.version');
  }

  if (!body.policy) {
    errors.push('Missing body.policy');
  }

  if (errors.length > 0) {
    return failure(errors);
  }

  // Verify ID matches canonical hash
  const computedId = computeObjectId(body);
  if (body.id !== computedId) {
    errors.push(
      `ID mismatch: body.id is ${body.id}, computed ID is ${computedId}`
    );
  }

  // Build set of authorized signers
  const authorizedPubkeys = new Set<string>();
  if (body.policy.authorized_signers) {
    for (const signer of body.policy.authorized_signers) {
      authorizedPubkeys.add(signer.pubkey.toLowerCase());
    }
  }

  // Check sigset
  if (!intent.sigset) {
    errors.push('Missing sigset');
    return failure(errors);
  }

  // Verify signatures
  const bodyCanonical = extractBodyForSigning(intent);
  const sigResult = verifySigset(intent.sigset, bodyCanonical, authorizedPubkeys);

  if (!sigResult.valid) {
    errors.push(...sigResult.errors);
  }

  // Check policy threshold
  if (body.policy.min_signers && sigResult.validCount < body.policy.min_signers) {
    errors.push(
      `Policy min_signers not met: ${sigResult.validCount} valid, need ${body.policy.min_signers}`
    );
  }

  // Check expiration
  if (body.policy.expires_at) {
    const expiresAt = new Date(body.policy.expires_at);
    if (expiresAt < new Date()) {
      warnings.push(`Intent has expired at ${body.policy.expires_at}`);
    }
  }

  if (errors.length > 0) {
    return failure(errors);
  }

  return success(warnings.length > 0 ? warnings : undefined);
}

// =============================================================================
// Frame Verification
// =============================================================================

/**
 * Verify a Frame object
 * Checks:
 * - Object structure
 * - ID matches canonical body hash
 * - Executor signature validity
 * - Optionally: executor is authorized by intent
 *
 * @param frame - Frame to verify
 * @param intent - Optional parent intent for authorization check
 * @returns Verification result
 */
export function verifyFrame(frame: Frame, intent?: Intent): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check object type
  if (frame.object_type !== 'frame') {
    errors.push(`Invalid object_type: expected 'frame', got '${frame.object_type}'`);
    return failure(errors);
  }

  // Check required body fields
  const body = frame.body;
  if (!body) {
    errors.push('Missing body');
    return failure(errors);
  }

  if (!body.id) {
    errors.push('Missing body.id');
  }

  if (!body.intent_id) {
    errors.push('Missing body.intent_id');
  }

  if (typeof body.sequence !== 'number') {
    errors.push('Missing or invalid body.sequence');
  }

  if (!body.executor) {
    errors.push('Missing body.executor');
  }

  if (errors.length > 0) {
    return failure(errors);
  }

  // Verify ID matches canonical hash
  const computedId = computeObjectId(body);
  if (body.id !== computedId) {
    errors.push(
      `ID mismatch: body.id is ${body.id}, computed ID is ${computedId}`
    );
  }

  // Check signature
  if (!frame.signature) {
    errors.push('Missing signature');
    return failure(errors);
  }

  // Verify executor signature
  const bodyCanonical = extractBodyForSigning(frame);
  const sigValid = verifySignature(
    frame.signature.pubkey,
    bodyCanonical,
    frame.signature.sig,
    frame.signature.suite_id
  );

  if (!sigValid) {
    errors.push('Invalid executor signature');
  }

  // Check signature is from declared executor
  if (frame.signature.pubkey.toLowerCase() !== body.executor.toLowerCase()) {
    errors.push(
      `Signature pubkey ${frame.signature.pubkey} does not match executor ${body.executor}`
    );
  }

  // If intent provided, check authorization
  if (intent) {
    // Check intent_id matches
    if (body.intent_id !== intent.body.id) {
      errors.push(
        `Frame intent_id ${body.intent_id} does not match intent ${intent.body.id}`
      );
    }

    // Check executor is authorized
    const authorizedPubkeys = new Set<string>();
    if (intent.body.policy.authorized_signers) {
      for (const signer of intent.body.policy.authorized_signers) {
        authorizedPubkeys.add(signer.pubkey.toLowerCase());
      }
    }

    if (!authorizedPubkeys.has(body.executor.toLowerCase())) {
      warnings.push(`Executor ${body.executor} is not in intent's authorized_signers`);
    }
  }

  if (errors.length > 0) {
    return failure(errors);
  }

  return success(warnings.length > 0 ? warnings : undefined);
}

// =============================================================================
// Collapse Verification
// =============================================================================

/**
 * Verify a Collapse object
 * Checks:
 * - Object structure
 * - ID matches canonical body hash
 * - Signature validity
 * - Optionally: all frame_ids exist and belong to same intent
 *
 * @param collapse - Collapse to verify
 * @param frames - Optional frames for cross-reference check
 * @returns Verification result
 */
export function verifyCollapse(
  collapse: Collapse,
  frames?: Frame[]
): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check object type
  if (collapse.object_type !== 'collapse') {
    errors.push(`Invalid object_type: expected 'collapse', got '${collapse.object_type}'`);
    return failure(errors);
  }

  // Check required body fields
  const body = collapse.body;
  if (!body) {
    errors.push('Missing body');
    return failure(errors);
  }

  if (!body.id) {
    errors.push('Missing body.id');
  }

  if (!body.intent_id) {
    errors.push('Missing body.intent_id');
  }

  if (!Array.isArray(body.frame_ids)) {
    errors.push('Missing or invalid body.frame_ids');
  }

  if (errors.length > 0) {
    return failure(errors);
  }

  // Verify ID matches canonical hash
  const computedId = computeObjectId(body);
  if (body.id !== computedId) {
    errors.push(
      `ID mismatch: body.id is ${body.id}, computed ID is ${computedId}`
    );
  }

  // Check sigset
  if (!collapse.sigset) {
    errors.push('Missing sigset');
    return failure(errors);
  }

  // Verify signatures
  const bodyCanonical = extractBodyForSigning(collapse);
  const sigResult = verifySigset(collapse.sigset, bodyCanonical);

  if (!sigResult.valid) {
    errors.push(...sigResult.errors);
  }

  // Check summary
  if (!body.summary) {
    warnings.push('Missing body.summary');
  } else {
    if (body.summary.frame_count !== body.frame_ids.length) {
      warnings.push(
        `Summary frame_count (${body.summary.frame_count}) does not match frame_ids length (${body.frame_ids.length})`
      );
    }
  }

  // If frames provided, verify cross-references
  if (frames && frames.length > 0) {
    const frameIdSet = new Set(frames.map((f) => f.body.id));

    for (const frameId of body.frame_ids) {
      if (!frameIdSet.has(frameId)) {
        warnings.push(`Frame ${frameId} referenced in collapse but not provided`);
      }
    }

    // Check all frames belong to same intent
    for (const frame of frames) {
      if (frame.body.intent_id !== body.intent_id) {
        errors.push(
          `Frame ${frame.body.id} has intent_id ${frame.body.intent_id}, expected ${body.intent_id}`
        );
      }
    }
  }

  if (errors.length > 0) {
    return failure(errors);
  }

  return success(warnings.length > 0 ? warnings : undefined);
}

// =============================================================================
// Generic Verification
// =============================================================================

/**
 * Verify any signed object
 * @param obj - Signed object to verify
 * @returns Verification result
 */
export function verify(obj: SignedObject): VerificationResult {
  if (isIntent(obj)) {
    return verifyIntent(obj);
  }

  if (isFrame(obj)) {
    return verifyFrame(obj);
  }

  if (isCollapse(obj)) {
    return verifyCollapse(obj);
  }

  if (isSegment(obj)) {
    // Segment verification - similar to collapse
    return verifySegment(obj);
  }

  return failure(['Unknown object type']);
}

/**
 * Verify a Segment object
 */
function verifySegment(segment: { object_type: string; body: unknown; sigset: Sigset }): VerificationResult {
  const errors: string[] = [];

  if (segment.object_type !== 'segment') {
    errors.push(`Invalid object_type: expected 'segment', got '${segment.object_type}'`);
    return failure(errors);
  }

  const body = segment.body as Record<string, unknown>;
  if (!body) {
    errors.push('Missing body');
    return failure(errors);
  }

  // Verify ID matches canonical hash
  const computedId = computeObjectId(body);
  if (body['id'] !== computedId) {
    errors.push(
      `ID mismatch: body.id is ${body['id'] as string}, computed ID is ${computedId}`
    );
  }

  // Check sigset
  if (!segment.sigset) {
    errors.push('Missing sigset');
    return failure(errors);
  }

  // Verify signatures
  const bodyCanonical = extractBodyForSigning(segment);
  const sigResult = verifySigset(segment.sigset, bodyCanonical);

  if (!sigResult.valid) {
    errors.push(...sigResult.errors);
  }

  if (errors.length > 0) {
    return failure(errors);
  }

  return success();
}

/**
 * Verify a single signature against a message
 */
export function verifySingleSignature(
  signature: Signature,
  message: string
): VerificationResult {
  const valid = verifySignature(
    signature.pubkey,
    message,
    signature.sig,
    signature.suite_id
  );

  if (valid) {
    return success();
  }

  return failure(['Invalid signature']);
}
