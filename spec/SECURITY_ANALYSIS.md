# OERC-S Security Analysis

**Document Version:** v0.1.0-security-1
**Prepared by:** REDTEAM_QA (Agent I)
**Date:** 2025-01-01
**Spec Version Analyzed:** OERC-S v0.1

---

## 1. Attack Surface Analysis

### 1.1 Signature Replay Attacks

**Attack Description:**
An adversary captures a valid signed INTENT, FRAME, or COLLAPSE object and resubmits it to extract unauthorized value or disrupt protocol state.

**Attack Vectors:**

1. **Cross-Intent Replay:** Reusing a FRAME signature from Intent A in the context of Intent B.
2. **Cross-Window Replay:** Resubmitting a COLLAPSE from window W1 into window W2.
3. **Cross-Chain Replay:** If OERC-S operates across multiple settlement layers, replaying objects across chains.

**Current Spec Vulnerabilities:**
- `frame_id` is not explicitly bound to the signing context
- No nonce or epoch counter in INTENT prevents replay of entire intent declarations
- `collapse_id` derivation method is unspecified; if predictable, enables pre-computation attacks

**Severity:** CRITICAL

---

### 1.2 Timebox Manipulation

**Attack Description:**
Manipulating time-based constraints to gain unfair advantage in energy routing or settlement.

**Attack Vectors:**

1. **Timebox Extension:** Modifying `t_end` after signatures are collected to extend transfer window.
2. **Retroactive Intent:** Backdating `t_start` to claim priority over competing intents.
3. **Segment Timebox Overlap Abuse:** Creating segments with overlapping timeboxes to double-count energy at boundaries.
4. **Timezone Ambiguity:** Exploiting lack of explicit UTC requirement for time manipulation.

**Current Spec Vulnerabilities:**
- No explicit validation that `segment_timebox` must fall within parent INTENT `timebox`
- ISO8601 format allows timezone offsets; no canonicalization to UTC required
- No minimum timebox duration specified; allows infinitesimally small windows

**Severity:** HIGH

---

### 1.3 Window Boundary Attacks

**Attack Description:**
Exploiting settlement window boundaries to manipulate finality or double-spend energy credits.

**Attack Vectors:**

1. **Cross-Window Frame Submission:** Submitting frames that straddle `window_start` and `window_end` boundaries.
2. **Late Frame Injection:** Submitting frames just before `window_end` when validation time is limited.
3. **Window Skip:** Intentionally missing a window to accumulate energy debt across windows.
4. **Epoch Desync:** If `epoch` in `window_params` is optional, attackers may omit it to avoid ordering.

**Current Spec Vulnerabilities:**
- `window_id` format is unspecified (string with no pattern constraint)
- Relationship between `window_params` and frame timeboxes is undefined
- No maximum window duration specified
- `block_height` and `epoch` are optional, allowing ambiguous ordering

**Severity:** HIGH

---

### 1.4 Energy Accounting Manipulation

**Attack Description:**
Falsifying or manipulating energy measurements to extract more value than physically transferred.

**Attack Vectors:**

1. **Loss Estimate Gaming:** Setting artificially high `loss_estimate.max` to justify discrepancies.
2. **Partial Energy Inflation:** Inflating `energy_j_partial` beyond what parent INTENT authorizes.
3. **Confidence Interval Abuse:** Exploiting `net_energy_confidence` range to claim more than measured.
4. **Segment Sum Overflow:** Creating segments where sum of `energy_j_partial` exceeds `max_energy_j`.
5. **Basis Point Manipulation:** Using `basis_points` instead of `absolute_j` to hide fee inflation.

**Current Spec Vulnerabilities:**
- No constraint that `SUM(energy_j_partial)` across segments <= `max_energy_j`
- `loss_estimate` uses floating-point (0.0-1.0) with no precision requirement
- No merkle proof linking individual frames to `finality_proof.merkle_root`
- Uint64 overflow handling unspecified (max: 18446744073709551615)

**Severity:** CRITICAL

---

### 1.5 Segment Ordering Attacks

**Attack Description:**
Manipulating the order of segments within a FRAME to alter routing or fee calculations.

**Attack Vectors:**

1. **Segment Reordering:** Rearranging segment order to route through preferred nodes.
2. **Sequence Number Hijacking:** Using duplicate or invalid `seq_no` values.
3. **Path Discontinuity:** Creating segments where `to_pubkey[i]` != `from_pubkey[i+1]`.
4. **Circular Routing:** Creating segments that form a cycle to artificially inflate energy metrics.
5. **Orphan Segments:** Including segments that don't connect to tx_node or rx_node of intent.

**Current Spec Vulnerabilities:**
- No validation that segments form a connected path from `tx_node_pubkey` to `rx_node_pubkey`
- `seq_no` uniqueness not enforced across frames for same intent
- Segment array ordering is implicit; no index field
- No cycle detection requirement

**Severity:** MEDIUM

---

## 2. Ambiguity Report

### 2.1 Intent Expiration Mid-Frame Stream

**Question:** What happens if an INTENT expires (t_end passes) while FRAME objects are still being streamed?

**Current Spec State:** UNDEFINED

**Ambiguity Analysis:**
- Schema allows frames referencing expired intents
- No state machine for intent lifecycle (active -> expired -> settled)
- Unclear if in-flight frames are honored or rejected

**Proposed Resolution Options:**
1. **Strict Cutoff:** All frames must be received before `t_end`
2. **Grace Period:** Allow configurable grace period for in-flight frames
3. **Frame Timestamp:** Use frame creation timestamp, not receipt time

**Recommendation:** STRICT CUTOFF with 60-second tolerance for clock skew

---

### 2.2 Collapse Referencing Frames from Multiple Windows

**Question:** What if a COLLAPSE references frames that span multiple settlement windows?

**Current Spec State:** UNDEFINED

**Ambiguity Analysis:**
- `collapse.intent_id` references one intent
- `collapse.window_id` references one window
- No explicit list of `frame_ids` included in collapse
- `finality_proof.merkle_root` presumably covers frames, but frame selection undefined

**Proposed Resolution Options:**
1. **Single Window Constraint:** All frames in a collapse must share same `window_id`
2. **Multi-Window Accumulation:** Allow cross-window aggregation with chain of custody proof
3. **Window Batching:** Frames auto-group by window, multiple collapses per intent

**Recommendation:** SINGLE WINDOW CONSTRAINT for v0.1; consider multi-window in v0.2

---

### 2.3 Clock Skew Between Nodes

**Question:** How should implementations handle clock differences between nodes?

**Current Spec State:** UNDEFINED

**Ambiguity Analysis:**
- ISO8601 timestamps used throughout
- No NTP or time sync requirements
- No acceptable skew tolerance specified
- Signatures don't include timestamp of signing

**Impacts:**
- Timebox validation inconsistent across nodes
- Window boundary disputes
- Frame ordering disagreements

**Proposed Resolution Options:**
1. **Strict NTP Requirement:** Mandate NTP sync with maximum 1-second drift
2. **Logical Clocks:** Use Lamport timestamps or vector clocks
3. **Tolerance Parameter:** Protocol parameter for acceptable skew (e.g., 5 seconds)

**Recommendation:** NTP REQUIRED with 5-second tolerance parameter; include signing timestamp in sigset

---

### 2.4 Maximum Segments Per Frame

**Question:** What is the maximum number of segments allowed in a single FRAME?

**Current Spec State:** UNDEFINED (`minItems: 1` only)

**Ambiguity Analysis:**
- No `maxItems` constraint in schema
- Unbounded segment arrays enable DoS attacks
- Signature verification cost scales with segment count
- Memory exhaustion possible with very large frames

**Proposed Resolution Options:**
1. **Hard Limit:** Set `maxItems: 256` in schema
2. **Soft Limit:** Warn but accept up to 1024
3. **Dynamic Limit:** Based on `max_energy_j` (e.g., 1 segment per 1MJ)

**Recommendation:** HARD LIMIT of 256 segments per frame

---

### 2.5 Maximum Frames Per Collapse

**Question:** What is the maximum number of frames that can be collapsed in a single settlement?

**Current Spec State:** UNDEFINED

**Ambiguity Analysis:**
- No frame count in collapse schema
- `merkle_root` implies multiple items but count unspecified
- Settlement gas/compute costs unbounded
- Verification time unpredictable

**Proposed Resolution Options:**
1. **Hard Limit:** Maximum 1024 frames per collapse
2. **Energy-Based Limit:** Maximum based on net_energy_j
3. **Configurable:** Per-window parameter in window_params

**Recommendation:** HARD LIMIT of 1024 frames; add `frame_count` field to collapse

---

## 3. Mitigations Required

### 3.1 Signature Replay Mitigations

| Mitigation | Priority | Description |
|------------|----------|-------------|
| Domain separation | MUST | Include `intent_id` in frame signature preimage |
| Nonce requirement | MUST | Add monotonic nonce to INTENT and FRAME |
| Window binding | MUST | Include `window_id` in collapse signature context |
| Signature timestamp | SHOULD | Add `signed_at` field to sigset entries |
| Cross-chain binding | MAY | Add `chain_id` for multi-chain deployments |

### 3.2 Timebox Manipulation Mitigations

| Mitigation | Priority | Description |
|------------|----------|-------------|
| UTC canonicalization | MUST | Require all timestamps in UTC (Z suffix) |
| Segment containment | MUST | Validate `segment_timebox` within parent `timebox` |
| Minimum duration | SHOULD | Enforce minimum 60-second timebox duration |
| Signature coverage | MUST | Timebox fields must be signed, not mutable |
| Overlap detection | SHOULD | Detect and reject overlapping segment timeboxes |

### 3.3 Window Boundary Mitigations

| Mitigation | Priority | Description |
|------------|----------|-------------|
| Window ID format | MUST | Define canonical format: `YYYY-WWWW-HHMM` |
| Frame deadline | MUST | Frames must arrive before `window_end - grace_period` |
| Epoch requirement | SHOULD | Make `epoch` required, not optional |
| Window duration limits | SHOULD | Min: 5 minutes, Max: 24 hours |
| Late frame policy | MUST | Define explicit rejection criteria |

### 3.4 Energy Accounting Mitigations

| Mitigation | Priority | Description |
|------------|----------|-------------|
| Segment sum validation | MUST | Enforce `SUM(energy_j_partial) <= max_energy_j` |
| Fixed-point loss | MUST | Use fixed-point (e.g., basis points) for loss_estimate |
| Merkle inclusion proof | SHOULD | Include per-frame merkle proofs in collapse |
| Overflow protection | MUST | Specify saturating arithmetic for uint64 |
| Audit trail | MAY | Include frame_ids list in collapse |

### 3.5 Segment Ordering Mitigations

| Mitigation | Priority | Description |
|------------|----------|-------------|
| Path continuity | MUST | Validate `to_pubkey[i] == from_pubkey[i+1]` |
| Endpoint validation | MUST | First segment `from_pubkey == tx_node_pubkey` |
| Cycle detection | SHOULD | Reject frames with cyclic segment paths |
| Segment indexing | SHOULD | Add explicit `segment_index` field |
| Seq_no uniqueness | MUST | Unique `seq_no` per intent across all frames |

---

## 4. Conformance Gaps

### 4.1 Edge Cases Not Covered by Current 10 Vectors

1. **Zero-energy intent:** What if `max_energy_j = 0`?
2. **Self-transfer:** What if `tx_node_pubkey == rx_node_pubkey`?
3. **Single-segment frame:** Minimum viable routing path
4. **Empty modality intersection:** Intent and frame modality mismatch
5. **Signature with wrong suite:** `crypto_suite_id` mismatch with `sigset.suite_id`
6. **Future-dated intent:** `t_start` > current_time + 1 year
7. **Stale intent:** `t_end` < current_time (already expired)
8. **Duplicate frame_id:** Same ID submitted twice
9. **Orphan collapse:** Collapse for non-existent intent_id
10. **Merkle root collision:** Two collapses with same merkle_root

### 4.2 Proposed Additional Vectors for v0.2

**Vector 11: SEGMENT_PATH_DISCONTINUITY**
```json
{
  "vector_id": "V11_PATH_DISCONTINUITY",
  "description": "Frame with segments that don't form connected path",
  "category": "FRAME_INVALID",
  "input": {
    "segments": [
      {"from_pubkey": "A", "to_pubkey": "B"},
      {"from_pubkey": "C", "to_pubkey": "D"}
    ]
  },
  "expected": "REJECT: path discontinuity at segment 1"
}
```

**Vector 12: ENERGY_SUM_OVERFLOW**
```json
{
  "vector_id": "V12_ENERGY_OVERFLOW",
  "description": "Frame with segment energies exceeding intent max",
  "category": "FRAME_INVALID",
  "input": {
    "intent.max_energy_j": 1000000,
    "segments.sum(energy_j_partial)": 1500000
  },
  "expected": "REJECT: energy sum exceeds intent maximum"
}
```

**Vector 13: TIMEBOX_CONTAINMENT**
```json
{
  "vector_id": "V13_TIMEBOX_ESCAPE",
  "description": "Segment timebox extends beyond intent timebox",
  "category": "FRAME_INVALID",
  "input": {
    "intent.timebox": {"t_start": "2025-01-01T00:00:00Z", "t_end": "2025-01-01T01:00:00Z"},
    "segment.segment_timebox": {"t_start": "2025-01-01T00:30:00Z", "t_end": "2025-01-01T02:00:00Z"}
  },
  "expected": "REJECT: segment timebox exceeds intent timebox"
}
```

**Vector 14: HYBRID_SIGNATURE_ORDER**
```json
{
  "vector_id": "V14_HYBRID_SIG_ORDER",
  "description": "Hybrid sigset with PQC signature before classical",
  "category": "SIGNATURE_INVALID",
  "input": {
    "sigset": [
      {"suite_id": "ml-dsa-65-v1", "sig": "..."},
      {"suite_id": "ed25519-v1", "sig": "..."}
    ]
  },
  "expected": "REJECT: hybrid signature order violation"
}
```

**Vector 15: WINDOW_FRAME_MISMATCH**
```json
{
  "vector_id": "V15_WINDOW_MISMATCH",
  "description": "Collapse includes frames from different windows",
  "category": "COLLAPSE_INVALID",
  "input": {
    "collapse.window_id": "W1",
    "included_frames": [
      {"frame_id": "F1", "window": "W1"},
      {"frame_id": "F2", "window": "W2"}
    ]
  },
  "expected": "REJECT: cross-window frame inclusion"
}
```

---

## 5. PQC Transition Concerns

### 5.1 Hybrid Signature Ordering

**Issue:** The spec requires classical signatures before PQC signatures, but rationale is unclear.

**Concerns:**
1. **Verification Order:** Should both signatures be verified in parallel or sequential?
2. **Failure Semantics:** If Ed25519 verifies but ML-DSA-65 fails, what's the state?
3. **Migration Path:** How to transition from hybrid-required to PQC-only?

**Recommendations:**
- MUST: Document that verification order is parallel (both must pass)
- MUST: Explicit failure mode: ANY_FAIL = total failure
- SHOULD: Add `min_hybrid_until` date field in crypto_suites registry

### 5.2 Key Compromise Scenarios

| Scenario | Impact | Mitigation Required |
|----------|--------|---------------------|
| Classical key compromised | Hybrid still secure (PQC protects) | SHOULD: Revocation mechanism |
| PQC key compromised | Hybrid still secure (classical protects) | SHOULD: Revocation mechanism |
| Both keys compromised | Total compromise | MUST: Key rotation protocol |
| Harvest-now-decrypt-later | Future exposure of classical-only signed intents | MUST: Mandate hybrid for long-lived intents |

**Recommendations:**
- MUST: Define key revocation list (KRL) mechanism
- MUST: Specify maximum intent duration for classical-only signatures (7 days)
- SHOULD: Add `key_validity_period` to crypto_suites registry

### 5.3 Algorithm Agility Upgrade Path

**Current State:**
- `crypto_suites.json` has registry metadata with deprecation policy (365 days notice)
- Transition period of 730 days after deprecation

**Gaps:**
1. **Negotiation Protocol:** How do nodes agree on acceptable suites?
2. **Downgrade Attacks:** Can attacker force use of deprecated suite?
3. **Suite Announcement:** How are new suites distributed?
4. **Retroactive Verification:** What if a used suite is later broken?

**Recommendations:**
- MUST: Add `min_acceptable_suite` to node configuration
- MUST: Reject signatures from suites deprecated > 2 years
- SHOULD: Define suite announcement mechanism (e.g., signed registry updates)
- MAY: Add `algorithm_agility_version` to protocol handshake

---

## 6. Interoperability Risks

### 6.1 JSON/CBOR Canonicalization Differences

**Issue:** If implementations use both JSON and CBOR, signature verification may fail due to encoding differences.

**Specific Concerns:**

| Aspect | JSON Behavior | CBOR Behavior | Risk |
|--------|---------------|---------------|------|
| Key ordering | Undefined | Canonical CBOR sorts keys | Signature mismatch |
| Number encoding | ASCII decimal | Binary integer/float | Hash mismatch |
| Unicode | UTF-8 | UTF-8 | Low risk |
| Whitespace | Varies | N/A | Hash mismatch |

**Recommendations:**
- MUST: Specify JCS (RFC 8785) for JSON canonicalization
- MUST: Specify deterministic CBOR (RFC 8949) if CBOR used
- MUST: Define signature preimage as canonical encoding, not wire format
- SHOULD: Include `encoding` field in sigset to indicate signed encoding

### 6.2 Floating Point in loss_estimate

**Issue:** `loss_estimate.min/max` use JSON number type (IEEE 754 float).

**Specific Concerns:**

| Problem | Example | Impact |
|---------|---------|--------|
| Precision loss | 0.1 cannot be exactly represented | Verification failures |
| Platform variance | Different rounding modes | Non-deterministic validation |
| Comparison issues | `0.1 + 0.2 != 0.3` | Boundary validation failures |
| Canonicalization | `1.0` vs `1.00` vs `1` | Hash differences |

**Recommendations:**
- MUST: Replace with fixed-point representation
  - Option A: Basis points (0-10000 integer) for 0.00% - 100.00%
  - Option B: Millionths (0-1000000 integer) for finer granularity
- MUST: Update schema to `"type": "integer"` for loss values
- SHOULD: Define as `loss_estimate_bps` (basis points: 0.01% per unit)

**Proposed Schema Change:**
```json
"loss_estimate": {
  "type": "object",
  "properties": {
    "min_bps": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10000,
      "description": "Minimum estimated loss in basis points (1 = 0.01%)"
    },
    "max_bps": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10000,
      "description": "Maximum estimated loss in basis points (1 = 0.01%)"
    }
  }
}
```

### 6.3 Timezone Handling in Timebox

**Issue:** ISO8601 allows multiple timezone representations.

**Examples of Ambiguity:**
```
2025-01-01T12:00:00Z        // Zulu (UTC)
2025-01-01T12:00:00+00:00   // Explicit UTC offset
2025-01-01T07:00:00-05:00   // Same instant, EST
2025-01-01T12:00:00         // Local time (ambiguous!)
```

**Specific Concerns:**

| Issue | Impact |
|-------|--------|
| Mixed representations | Same instant hashes differently |
| Local time without offset | Completely ambiguous |
| Leap seconds | UTC vs TAI disagreement |
| Daylight saving transitions | Ambiguous local times |

**Recommendations:**
- MUST: Require UTC with `Z` suffix exclusively
- MUST: Update schema pattern to enforce:
  ```json
  "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$"
  ```
- MUST: Reject timestamps with offset notation (+HH:MM or -HH:MM)
- SHOULD: Specify that leap seconds are smeared (like Google's leap smear)
- MAY: Add TAI timestamp support for high-precision applications

---

## 7. Summary of Required Actions

### MUST (Blocking for v0.1 release)
1. Add nonce to INTENT and FRAME
2. Specify segment path continuity validation
3. Enforce UTC-only timestamps with Z suffix
4. Replace floating-point loss_estimate with fixed-point
5. Define window_id canonical format
6. Specify signature preimage canonicalization (JCS)
7. Add maximum segments per frame (256)
8. Validate energy_j_partial sum <= max_energy_j

### SHOULD (Target for v0.1.1)
1. Add `signed_at` timestamp to sigset entries
2. Implement clock skew tolerance (5 seconds)
3. Add `frame_count` to collapse
4. Define key revocation mechanism
5. Make `epoch` required in window_params
6. Add cycle detection for segment paths

### MAY (Consider for v0.2)
1. Add `chain_id` for cross-chain support
2. TAI timestamp support
3. Algorithm negotiation protocol
4. Multi-window collapse aggregation
5. Dynamic segment limits based on energy

---

*End of Security Analysis Document*
