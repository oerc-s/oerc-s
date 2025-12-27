# CBOR Encoding Rules for OERC-S Objects

This document specifies the CBOR (Concise Binary Object Representation) encoding rules for OERC-S protocol objects. All implementations MUST follow these rules to ensure deterministic encoding across different systems.

## Reference Standard

OERC-S uses **RFC 8949** (CBOR) with the deterministic encoding requirements specified in Section 4.2.

## Core Deterministic Encoding Rules

### 1. Field Ordering

All map (object) keys MUST be encoded in **lexicographic (alphabetical) order** by their UTF-8 byte representation.

Example field ordering for INTENT:
```
crypto_suite_id
intent_id
location_tag
max_energy_j
modality_set
rx_node_pubkey
sigset
timebox
tx_node_pubkey
```

Nested objects follow the same rule:
```
location_tag:
  ephemeris_hash
  footprint_id
  orbit_regime

timebox:
  t_end
  t_start
```

### 2. Integer Encoding (Minimal Bytes)

Integers MUST be encoded using the minimum number of bytes required:

| Value Range | Encoding |
|-------------|----------|
| 0-23 | Single byte (major type 0 + value) |
| 24-255 | 2 bytes (major type 0 + 24 + 1 byte) |
| 256-65535 | 3 bytes (major type 0 + 25 + 2 bytes) |
| 65536-4294967295 | 5 bytes (major type 0 + 26 + 4 bytes) |
| 4294967296-18446744073709551615 | 9 bytes (major type 0 + 27 + 8 bytes) |

Negative integers follow the same pattern with major type 1.

**Critical**: Never use more bytes than necessary. `energy_j = 1000` MUST be encoded as `19 03 e8` (3 bytes), not as a 64-bit integer.

### 3. Map Key Encoding

Map keys in OERC-S are always UTF-8 strings. They MUST be encoded as:

- Major type 3 (text string)
- Length using minimal bytes (same rules as integers)
- UTF-8 bytes of the key

Example: `"intent_id"` encodes as:
```
69                    -- text(9)
696e74656e745f6964    -- "intent_id"
```

### 4. String and Binary Data

#### Text Strings (type 3)
- ISO8601 timestamps: Encode as text strings
- Enum values (modality, crypto_suite_id): Encode as text strings

#### Byte Strings (type 2)
- All hex-encoded fields in JSON (intent_id, pubkeys, signatures, hashes) MUST be decoded to raw bytes and encoded as CBOR byte strings
- This reduces size by 50% compared to hex text

Example: `intent_id` in JSON is 64 hex chars, but in CBOR is 32 bytes:
```
5820                                      -- bytes(32)
a1b2c3d4...                               -- 32 raw bytes
```

### 5. Array Encoding

Arrays use major type 4 with definite length:

```
modality_set: ["laser", "microwave"]

84              -- array(2)
  65            -- text(5)
  6c61736572    -- "laser"
  69            -- text(9)
  6d6963726f77617665  -- "microwave"
```

### 6. Floating Point Numbers

Loss estimates use floating point. Prefer:
- Half-precision (16-bit, major type 7 + 25) when precision allows
- Single-precision (32-bit, major type 7 + 26) for most cases
- Double-precision (64-bit, major type 7 + 27) only when necessary

For determinism, always use the smallest representation that preserves the exact value.

### 7. Null and Optional Fields

- Omit optional fields entirely rather than encoding null
- `net_energy_confidence` in COLLAPSE: omit the key if not present

### 8. Signature Computation Order

When computing signatures over CBOR-encoded data:

1. Serialize the object WITHOUT the `sigset` field
2. Apply deterministic CBOR encoding (this document)
3. Hash the resulting bytes
4. Sign the hash

This ensures all parties compute the same canonical bytes for signing.

## Complete Encoding Example

JSON INTENT fragment:
```json
{
  "intent_id": "a1b2c3d4...",
  "max_energy_j": 1000000,
  "modality_set": ["laser"]
}
```

CBOR (hex):
```
a3                          -- map(3)
  69                        -- text(9)
    696e74656e745f6964      -- "intent_id"
  5820                      -- bytes(32)
    a1b2c3d4...             -- 32 bytes
  6c                        -- text(12)
    6d61785f656e657267795f6a -- "max_energy_j"
  1a 000f4240               -- unsigned(1000000)
  6c                        -- text(12)
    6d6f64616c6974795f736574 -- "modality_set"
  81                        -- array(1)
    65                      -- text(5)
      6c61736572            -- "laser"
```

## Implementation Notes

### Recommended Libraries

| Language | Library | Notes |
|----------|---------|-------|
| Rust | `ciborium` | Use `into_writer` with sorted maps |
| Go | `fxamacker/cbor/v2` | Use `EncOptions{Sort: SortCanonical}` |
| Python | `cbor2` | Use `canonical=True` |
| JavaScript | `cbor-x` | Use `{canonical: true}` option |

### Validation

Implementations SHOULD:
1. Re-encode received CBOR and verify byte-for-byte equality
2. Reject non-canonical encodings
3. Verify field ordering before signature validation

### Test Vectors

Implementations MUST pass the test vectors provided in `oerc-s/test-vectors/cbor/` (to be defined separately).

## Version

This document describes CBOR encoding for OERC-S schema version 1.0.
