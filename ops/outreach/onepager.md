# Collapse is Payable

## What

OERC-S is an open settlement protocol for space-based energy systems. It defines a three-stage flow—Intent, Frame, Collapse—that produces a cryptographic hash proving energy was requested, delivered, and settled. This hash is the settlement primitive: tamper-evident, vendor-neutral, and auditable. Any system that can emit a conformant Collapse hash can participate in multi-party energy markets without bilateral integration. The protocol is lightweight, deterministic, and designed for orbital-to-ground latency constraints.

## How

1. **Intent**: A party declares energy requirements—quantity, timing, destination. This is signed and timestamped.
2. **Frame**: The delivery context is captured—orbital parameters, beam characteristics, ground station state. This frames the Intent in physical reality.
3. **Collapse**: Intent and Frame are cryptographically bound. The resulting hash is the Collapse—a single value that proves the transaction. This hash can be verified by any party, stored on-chain, or used as a billing record.

The entire flow is deterministic: same inputs, same Collapse, anywhere.

## Why Now

Space-based solar is moving from research to procurement. SOLARIS, SBSP programs, and orbital compute need settlement infrastructure before hardware arrives. The protocol must exist before the power flows.

---

**One hash. One test. That's all we ask.**
