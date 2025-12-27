# OERC-S Errata

**Version:** v0.1.0-errata-1
**Applies to:** OERC-S v0.1
**Date:** 2025-01-01
**Status:** DRAFT

---

## Overview

This document lists known issues, ambiguities, and required patches for OERC-S v0.1. Each erratum is assigned a unique identifier and priority level.

**Priority Levels:**
- **P1 (Critical):** Security vulnerability or specification inconsistency that blocks conformant implementation
- **P2 (High):** Significant ambiguity that may cause interoperability issues
- **P3 (Medium):** Minor clarification needed
- **P4 (Low):** Editorial or cosmetic issue

---

## 1. Schema Errata

### E001: Inconsistent Crypto Suite IDs Between Schemas

**Priority:** P1 (Critical)

**Affected Files:**
- `schemas/intent.json`
- `schemas/frame.json`
- `schemas/collapse.json`
- `schemas/crypto_suites.json`
- `schemas/sigset.json`

**Issue:**
The `crypto_suite_id` enum values differ between schema files:

| File | Enum Values |
|------|-------------|
| intent.json | `ed25519-blake3`, `secp256k1-sha256`, `dilithium3-sha3`, `sphincs-sha256` |
| crypto_suites.json | `ed25519-v1`, `ml-dsa-65-v1`, `hybrid-sig-v1`, etc. |
| sigset.json | `ed25519-v1`, `ml-dsa-65-v1` |

**Impact:**
Implementations cannot determine which suite IDs are canonical. Signatures may be rejected due to unknown suite_id.

**Proposed Patch:**
Unify all schemas to use versioned format from `crypto_suites.json`:
```json
"crypto_suite_id": {
  "type": "string",
  "enum": [
    "ed25519-v1",
    "ml-dsa-65-v1",
    "hybrid-sig-v1"
  ]
}
```

**Affected Lines:**
- `intent.json`: lines 81-86, 107-112
- `frame.json`: lines 110-115, 136-141
- `collapse.json`: lines 133-138, 159-164

---

### E002: Missing Maximum Bounds on Arrays

**Priority:** P2 (High)

**Affected Files:**
- `schemas/frame.json` (segments array)
- `schemas/collapse.json` (signer_set array)
- All schemas (sigset array)

**Issue:**
Arrays specify `minItems` but not `maxItems`, allowing unbounded growth and potential DoS.

**Current State:**
```json
"segments": {
  "type": "array",
  "minItems": 1
  // No maxItems
}
```

**Proposed Patch:**
```json
"segments": {
  "type": "array",
  "minItems": 1,
  "maxItems": 256
}
```

```json
"signer_set": {
  "type": "array",
  "minItems": 1,
  "maxItems": 128
}
```

```json
"sigset": {
  "type": "array",
  "minItems": 1,
  "maxItems": 16
}
```

---

### E003: Floating Point in loss_estimate

**Priority:** P1 (Critical)

**Affected Files:**
- `schemas/frame.json`

**Issue:**
`loss_estimate.min` and `loss_estimate.max` use JSON number type (floating-point), which causes:
1. IEEE 754 precision issues
2. Non-deterministic canonicalization
3. Cross-platform verification failures

**Current State (lines 55-74):**
```json
"loss_estimate": {
  "type": "object",
  "properties": {
    "min": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "max": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  }
}
```

**Proposed Patch:**
```json
"loss_estimate_bps": {
  "type": "object",
  "description": "Estimated energy loss range in basis points (1 bps = 0.01%)",
  "properties": {
    "min_bps": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10000,
      "description": "Minimum estimated loss in basis points"
    },
    "max_bps": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10000,
      "description": "Maximum estimated loss in basis points"
    }
  },
  "required": ["min_bps", "max_bps"],
  "additionalProperties": false
}
```

---

### E004: Timestamp Format Allows Non-UTC

**Priority:** P2 (High)

**Affected Files:**
- `schemas/intent.json`
- `schemas/frame.json`
- `schemas/collapse.json`
- `schemas/sigset.json`

**Issue:**
ISO8601 `format: "date-time"` allows timezone offsets and local times. This causes canonicalization issues.

**Current State:**
```json
"t_start": {
  "type": "string",
  "format": "date-time"
}
```

**Proposed Patch:**
```json
"t_start": {
  "type": "string",
  "format": "date-time",
  "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$",
  "description": "Start time in ISO8601 UTC format (must end with Z)"
}
```

---

### E005: window_id Lacks Format Constraint

**Priority:** P2 (High)

**Affected Files:**
- `schemas/collapse.json`

**Issue:**
`window_id` is an unconstrained string, leading to interoperability issues.

**Current State (lines 18-20):**
```json
"window_id": {
  "type": "string",
  "description": "Identifier for the settlement window"
}
```

**Proposed Patch:**
```json
"window_id": {
  "type": "string",
  "description": "Canonical settlement window identifier",
  "pattern": "^[0-9]{4}-W[0-9]{2}-[0-9]{4}$",
  "examples": ["2025-W01-0000", "2025-W52-2359"]
}
```

Format: `YYYY-Www-HHMM` where:
- `YYYY` = Year
- `Www` = ISO week number
- `HHMM` = Window start time within week (0000-2359)

---

## 2. Specification Errata

### E006: Missing Segment Path Continuity Requirement

**Priority:** P1 (Critical)

**Affected Files:**
- `schemas/frame.json`
- (implied) OERC-S_v0.1.md

**Issue:**
No explicit requirement that segments form a connected path from `tx_node_pubkey` to `rx_node_pubkey`.

**Impact:**
Invalid routing paths may be accepted. Energy could be "lost" to disconnected segments.

**Proposed Patch:**
Add validation rules section to `frame.json`:
```json
"validation_rules": {
  "path_continuity": {
    "description": "Segments MUST form a continuous path",
    "rules": [
      "segments[0].from_pubkey MUST equal parent intent.tx_node_pubkey",
      "segments[n-1].to_pubkey MUST equal parent intent.rx_node_pubkey",
      "For all i in [0, n-2]: segments[i].to_pubkey MUST equal segments[i+1].from_pubkey"
    ]
  }
}
```

---

### E007: Missing Energy Sum Constraint

**Priority:** P1 (Critical)

**Affected Files:**
- `schemas/frame.json`
- (implied) OERC-S_v0.1.md

**Issue:**
No constraint preventing sum of `energy_j_partial` across segments from exceeding parent intent's `max_energy_j`.

**Proposed Patch:**
Add to validation rules:
```json
"energy_constraints": {
  "description": "Energy accounting rules",
  "rules": [
    "SUM(segments[*].energy_j_partial) MUST be <= referenced intent.max_energy_j",
    "Each segment.energy_j_partial MUST be > 0"
  ]
}
```

---

### E008: Missing Timebox Containment Rule

**Priority:** P2 (High)

**Affected Files:**
- `schemas/frame.json`

**Issue:**
No requirement that `segment_timebox` falls within parent INTENT's `timebox`.

**Proposed Patch:**
Add to validation rules:
```json
"timebox_containment": {
  "description": "Segment timing constraints",
  "rules": [
    "All segment_timebox.t_start MUST be >= referenced intent.timebox.t_start",
    "All segment_timebox.t_end MUST be <= referenced intent.timebox.t_end",
    "segment_timebox.t_start MUST be < segment_timebox.t_end"
  ]
}
```

---

### E009: Missing Nonce/Replay Protection

**Priority:** P1 (Critical)

**Affected Files:**
- `schemas/intent.json`
- `schemas/frame.json`

**Issue:**
No nonce or monotonic counter to prevent signature replay attacks.

**Proposed Patch for intent.json:**
```json
"nonce": {
  "type": "string",
  "description": "Unique nonce to prevent replay (32 bytes hex)",
  "pattern": "^[0-9a-f]{64}$"
}
```
Add `"nonce"` to required fields array.

**Proposed Patch for frame.json:**
```json
"intent_nonce": {
  "type": "string",
  "description": "Nonce from referenced intent (for replay binding)",
  "pattern": "^[0-9a-f]{64}$"
}
```

---

### E010: Sigset Property Name Inconsistency

**Priority:** P3 (Medium)

**Affected Files:**
- `schemas/intent.json`
- `schemas/frame.json`
- `schemas/collapse.json`
- `schemas/sigset.json`

**Issue:**
Signature field is named `sig` in intent/frame/collapse schemas but `signature` in sigset.json.

**Current State:**
- `intent.json`: `"sig": "..."`
- `sigset.json`: `"signature": "..."`

**Proposed Patch:**
Standardize on `signature` everywhere for consistency with sigset.json schema:
```json
{
  "pubkey": "...",
  "signature": "...",
  "suite_id": "..."
}
```

---

### E011: Missing Signature Preimage Specification

**Priority:** P1 (Critical)

**Affected Files:**
- All schema files
- (missing) Canonicalization specification

**Issue:**
No specification of what bytes are signed. Without this, implementations cannot verify signatures.

**Proposed Patch:**
Add new section to spec:
```markdown
## Signature Preimage

The signature preimage for each object type is computed as:

### Intent
preimage = JCS_CANONICALIZE(intent_object_without_sigset)

### Frame
preimage = JCS_CANONICALIZE(frame_object_without_sigset)

### Collapse
preimage = JCS_CANONICALIZE(collapse_object_without_sigset)

Where JCS_CANONICALIZE follows RFC 8785 (JSON Canonicalization Scheme).
```

---

### E012: ML-DSA-65 Signature Length Mismatch

**Priority:** P2 (High)

**Affected Files:**
- `schemas/sigset.json`
- `schemas/crypto_suites.json`

**Issue:**
Signature length for ML-DSA-65 differs between files:
- `sigset.json`: hex_length: 6586, byte_length: 3293
- `crypto_suites.json`: sig_bytes: 3293

6586 hex characters would be 3293 bytes, but `6586 / 2 = 3293` suggests a calculation error or the values are inconsistent.

Actual ML-DSA-65 (Dilithium3) signature size per FIPS 204 is 3309 bytes.

**Proposed Patch:**
Update both files to use FIPS 204 correct values:
```json
"ml-dsa-65-v1": {
  "sig_bytes": 3309,
  "hex_length": 6618
}
```

---

## 3. Conformance Errata

### E013: Missing Negative Test Vectors

**Priority:** P2 (High)

**Affected Files:**
- `conformance/vectors/` (directory not yet populated)

**Issue:**
Conformance testing requires negative test vectors to ensure implementations correctly reject invalid inputs.

**Proposed Patch:**
Add the following negative vector categories:
1. `V_NEG_01`: Invalid signature (wrong key)
2. `V_NEG_02`: Expired intent (t_end in past)
3. `V_NEG_03`: Energy overflow (sum > max)
4. `V_NEG_04`: Path discontinuity
5. `V_NEG_05`: Unknown crypto_suite_id
6. `V_NEG_06`: Duplicate frame_id
7. `V_NEG_07`: Cross-window frame reference
8. `V_NEG_08`: Hybrid signature order violation
9. `V_NEG_09`: Self-transfer (tx == rx)
10. `V_NEG_10`: Timebox escape (segment outside intent)

---

### E014: Missing Hybrid Signature Test Vector

**Priority:** P2 (High)

**Affected Files:**
- `conformance/vectors/`

**Issue:**
No test vector validating hybrid-sig-v1 (Ed25519 + ML-DSA-65) combined verification.

**Proposed Patch:**
Add `V_HYBRID_01` vector with:
- Valid Ed25519 signature
- Valid ML-DSA-65 signature
- Both from same logical identity
- Correct ordering (classical first)

---

## 4. Editorial Errata

### E015: README Structure Path Incorrect

**Priority:** P4 (Low)

**Affected Files:**
- `README.md`

**Issue:**
README references `spec/OERC-S_v0.1.md` but no spec file exists in that location.

**Proposed Patch:**
Either create the spec document or update README to reflect actual structure.

---

### E016: Schema $id URLs Not Resolvable

**Priority:** P3 (Medium)

**Affected Files:**
- All schema files

**Issue:**
Schema `$id` values reference `https://oerc-s.energy/schemas/...` which is not a registered domain.

**Proposed Patch:**
Either:
1. Register the domain and host schemas
2. Use relative file references
3. Use a placeholder that clearly indicates non-resolution: `urn:oerc-s:schemas:...`

---

### E017: Mixed JSON Schema Versions

**Priority:** P3 (Medium)

**Affected Files:**
- `schemas/intent.json`: draft-07
- `schemas/frame.json`: draft-07
- `schemas/collapse.json`: draft-07
- `schemas/crypto_suites.json`: 2020-12
- `schemas/sigset.json`: 2020-12

**Issue:**
Inconsistent JSON Schema versions may cause validator compatibility issues.

**Proposed Patch:**
Standardize all schemas on JSON Schema 2020-12:
```json
"$schema": "https://json-schema.org/draft/2020-12/schema"
```

---

## 5. Patch Application Order

For implementations updating from v0.1.0 to v0.1.0-errata-1, apply patches in the following order:

1. **E001** - Crypto suite ID unification (breaking change)
2. **E003** - loss_estimate to fixed-point (breaking change)
3. **E009** - Add nonce fields (breaking change)
4. **E010** - Sigset property names (breaking change)
5. **E011** - Signature preimage specification (required for verification)
6. **E012** - ML-DSA-65 signature length correction
7. **E002** - Add maxItems constraints
8. **E004** - Timestamp pattern constraints
9. **E005** - window_id format
10. **E006** - Path continuity rules
11. **E007** - Energy sum constraint
12. **E008** - Timebox containment
13. **E013-E014** - Test vectors
14. **E015-E017** - Editorial cleanup

---

## 6. Version History

| Version | Date | Changes |
|---------|------|---------|
| v0.1.0-errata-1 | 2025-01-01 | Initial errata document |

---

## 7. Acknowledgments

Issues identified through security analysis by REDTEAM_QA (Agent I).

---

*End of Errata Document*
