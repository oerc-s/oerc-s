/**
 * OERC-S Kernel Types
 * TypeScript types matching OERC-S schemas
 */

// =============================================================================
// Primitive Types
// =============================================================================

/** Hex-encoded string (lowercase, with optional 0x prefix) */
export type HexString = string;

/** ISO 8601 timestamp string */
export type Timestamp = string;

/** Semantic version string (e.g., "1.0.0") */
export type SemVer = string;

/** Object ID - blake3 hash of canonical form */
export type ObjectId = HexString;

/** Cryptographic suite identifier */
export type SuiteId = 'ed25519-blake3' | 'secp256k1-keccak256';

// =============================================================================
// Signature Types
// =============================================================================

/** Single signature with metadata */
export interface Signature {
  /** Public key of signer (hex-encoded) */
  pubkey: HexString;
  /** Signature bytes (hex-encoded) */
  sig: HexString;
  /** Cryptographic suite used */
  suite_id: SuiteId;
  /** Optional timestamp of signing */
  signed_at?: Timestamp;
}

/** Signature set with threshold */
export interface Sigset {
  /** Required number of valid signatures */
  threshold: number;
  /** Array of signatures */
  signatures: Signature[];
}

// =============================================================================
// Intent Types
// =============================================================================

/** Authorized signer for an intent */
export interface AuthorizedSigner {
  /** Public key (hex-encoded) */
  pubkey: HexString;
  /** Weight for threshold calculation */
  weight: number;
  /** Optional human-readable label */
  label?: string;
}

/** Policy governing intent execution */
export interface IntentPolicy {
  /** Minimum signers required */
  min_signers: number;
  /** Total weight required */
  threshold_weight: number;
  /** Authorized signers */
  authorized_signers: AuthorizedSigner[];
  /** Optional expiration timestamp */
  expires_at?: Timestamp;
}

/** Constraint on intent execution */
export interface IntentConstraint {
  /** Constraint type */
  type: 'temporal' | 'spatial' | 'resource' | 'dependency' | 'custom';
  /** Constraint parameters */
  params: Record<string, unknown>;
}

/** Intent body containing the actual intent data */
export interface IntentBody {
  /** Schema version */
  version: SemVer;
  /** Unique intent ID */
  id: ObjectId;
  /** Human-readable description */
  description: string;
  /** Intent policy */
  policy: IntentPolicy;
  /** Constraints on execution */
  constraints: IntentConstraint[];
  /** Domain-specific payload */
  payload: Record<string, unknown>;
  /** Creation timestamp */
  created_at: Timestamp;
}

/** Complete signed intent */
export interface Intent {
  /** Object type discriminator */
  object_type: 'intent';
  /** Intent body */
  body: IntentBody;
  /** Signatures authorizing the intent */
  sigset: Sigset;
}

// =============================================================================
// Frame Types
// =============================================================================

/** Metric captured during frame execution */
export interface FrameMetric {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Metric type */
  type: 'counter' | 'gauge' | 'histogram';
}

/** Frame body containing execution data */
export interface FrameBody {
  /** Schema version */
  version: SemVer;
  /** Unique frame ID */
  id: ObjectId;
  /** Reference to parent intent */
  intent_id: ObjectId;
  /** Sequence number within intent */
  sequence: number;
  /** Previous frame ID (null for first frame) */
  prev_frame_id: ObjectId | null;
  /** Executor public key */
  executor: HexString;
  /** Execution timestamp */
  executed_at: Timestamp;
  /** Frame status */
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'reverted';
  /** Captured metrics */
  metrics: FrameMetric[];
  /** Domain-specific payload */
  payload: Record<string, unknown>;
}

/** Complete signed frame */
export interface Frame {
  /** Object type discriminator */
  object_type: 'frame';
  /** Frame body */
  body: FrameBody;
  /** Executor signature */
  signature: Signature;
}

// =============================================================================
// Collapse Types
// =============================================================================

/** Summary of collapsed frames */
export interface CollapseSummary {
  /** Total frames collapsed */
  frame_count: number;
  /** Aggregated metrics */
  aggregated_metrics: Record<string, number>;
  /** Final status */
  final_status: 'success' | 'partial' | 'failed';
}

/** Collapse body containing finalization data */
export interface CollapseBody {
  /** Schema version */
  version: SemVer;
  /** Unique collapse ID */
  id: ObjectId;
  /** Reference to parent intent */
  intent_id: ObjectId;
  /** IDs of collapsed frames */
  frame_ids: ObjectId[];
  /** Collapse summary */
  summary: CollapseSummary;
  /** Collapse timestamp */
  collapsed_at: Timestamp;
  /** Domain-specific payload */
  payload: Record<string, unknown>;
}

/** Complete signed collapse */
export interface Collapse {
  /** Object type discriminator */
  object_type: 'collapse';
  /** Collapse body */
  body: CollapseBody;
  /** Signatures authorizing collapse */
  sigset: Sigset;
}

// =============================================================================
// Segment Types
// =============================================================================

/** Segment body containing chain data */
export interface SegmentBody {
  /** Schema version */
  version: SemVer;
  /** Unique segment ID */
  id: ObjectId;
  /** Previous segment ID (null for genesis) */
  prev_segment_id: ObjectId | null;
  /** Segment height in chain */
  height: number;
  /** Merkle root of contained objects */
  merkle_root: HexString;
  /** Object IDs in this segment */
  object_ids: ObjectId[];
  /** Segment timestamp */
  created_at: Timestamp;
}

/** Complete signed segment */
export interface Segment {
  /** Object type discriminator */
  object_type: 'segment';
  /** Segment body */
  body: SegmentBody;
  /** Validator signatures */
  sigset: Sigset;
}

// =============================================================================
// Verification Types
// =============================================================================

/** Verification result */
export interface VerificationResult {
  /** Whether verification passed */
  valid: boolean;
  /** Error messages if invalid */
  errors: string[];
  /** Warning messages */
  warnings?: string[];
}

// =============================================================================
// Conformance Types
// =============================================================================

/** Test vector for conformance testing */
export interface TestVector {
  /** Vector name */
  name: string;
  /** Vector description */
  description: string;
  /** Input data */
  input: unknown;
  /** Expected output */
  expected: unknown;
  /** Vector type */
  type: 'crypto' | 'canonical' | 'verify' | 'integration';
}

/** Conformance test result */
export interface ConformanceResult {
  /** Vector name */
  name: string;
  /** Whether test passed */
  passed: boolean;
  /** Error message if failed */
  error?: string;
  /** Actual output */
  actual?: unknown;
  /** Expected output */
  expected?: unknown;
}

/** Conformance report */
export interface ConformanceReport {
  /** Timestamp of report generation */
  generated_at: Timestamp;
  /** Total tests run */
  total: number;
  /** Tests passed */
  passed: number;
  /** Tests failed */
  failed: number;
  /** Individual results */
  results: ConformanceResult[];
}

// =============================================================================
// Union Types
// =============================================================================

/** Any signed object in the system */
export type SignedObject = Intent | Frame | Collapse | Segment;

/** Object type discriminator values */
export type ObjectType = 'intent' | 'frame' | 'collapse' | 'segment';

// =============================================================================
// Type Guards
// =============================================================================

export function isIntent(obj: unknown): obj is Intent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'object_type' in obj &&
    (obj as Intent).object_type === 'intent'
  );
}

export function isFrame(obj: unknown): obj is Frame {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'object_type' in obj &&
    (obj as Frame).object_type === 'frame'
  );
}

export function isCollapse(obj: unknown): obj is Collapse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'object_type' in obj &&
    (obj as Collapse).object_type === 'collapse'
  );
}

export function isSegment(obj: unknown): obj is Segment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'object_type' in obj &&
    (obj as Segment).object_type === 'segment'
  );
}

export function isSignedObject(obj: unknown): obj is SignedObject {
  return isIntent(obj) || isFrame(obj) || isCollapse(obj) || isSegment(obj);
}
