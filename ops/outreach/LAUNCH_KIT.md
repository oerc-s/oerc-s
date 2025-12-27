# OERC-S v0.1 Launch Kit
> Copier-coller chaque section dans le canal approprié

---

## 1. TWITTER/X

### Post Principal
```
OERC-S v0.1 is live.

Settlement protocol for space-based energy.
- Intent → Frame → Collapse
- One hash = one settlement
- Post-quantum ready
- Vendor neutral

Spec: github.com/oerc-s/oerc-s

We're asking space agencies to publish ONE Collapse hash from test.

That's it. One hash proves interop.
```

### Thread (optionnel)
```
1/ Why does space energy need a settlement protocol?

Because when orbital solar beams power to ground stations, someone needs to prove it happened.

OERC-S creates a single hash that proves: energy requested, delivered, settled.

2/ The flow:

INTENT: "I need 50 MWh at 14:00 UTC at coords X"
FRAME: "Satellite orbit, beam params, ground state"
COLLAPSE: Hash binding both = settlement proof

3/ Why now?

ESA SOLARIS, NASA SBSP, Caltech SSPP are all building space solar.

The settlement layer needs to exist BEFORE the power flows.

4/ What we're asking:

Any org with test infrastructure: publish ONE Collapse hash.

No meeting. No contract. Just one hash that proves you can emit conformant settlements.

github.com/oerc-s/oerc-s
```

---

## 2. LINKEDIN

### Post
```
🔋 OERC-S v0.1 Released

I'm sharing an open settlement protocol for space-based energy systems.

The problem: When orbital solar power becomes real, how do you prove energy was delivered? Current grid settlement wasn't designed for orbital-to-ground transactions.

The solution: OERC-S defines a three-stage flow:
• Intent (energy request)
• Frame (delivery context)
• Collapse (cryptographic proof)

One hash = one settlement. Tamper-evident. Vendor-neutral. Post-quantum ready.

The spec is open and available: https://github.com/oerc-s/oerc-s

We're asking organizations with space solar test infrastructure to publish ONE Collapse hash. No meetings needed—just one hash proves interoperability.

#SpaceSolar #EnergySettlement #OpenProtocol #SBSP #Solaris
```

---

## 3. HACKER NEWS

### Title
```
Show HN: OERC-S – Open settlement protocol for space-based solar energy
```

### URL
```
https://github.com/oerc-s/oerc-s
```

### Comment (post immédiatement après)
```
Hi HN,

OERC-S is a settlement protocol for space-based energy. The core idea: a cryptographic hash that proves energy was requested, delivered, and settled.

Why this matters: ESA (SOLARIS), NASA (SBSP), Caltech, and others are building space solar. The settlement infrastructure needs to exist before the hardware arrives.

The protocol:
- Intent: declare energy requirements (quantity, time, location)
- Frame: capture delivery context (orbital params, beam characteristics)
- Collapse: bind Intent+Frame into a single hash

That hash is the settlement primitive. Any system that emits conformant Collapse hashes can participate in multi-party energy markets.

Technical choices:
- BLAKE3 for hashing
- ML-DSA-65 / ML-KEM-768 for post-quantum crypto
- CBOR for deterministic encoding
- JSON Schema for validation

We're asking any org with test infrastructure to publish ONE Collapse hash. That's it—one hash proves interop.

Happy to answer questions about the design decisions.
```

---

## 4. EMAILS TIER 1 (Personnalisés)

### 4.1 ESA SOLARIS
**To:** Contact form at https://www.esa.int/Enabling_Support/Space_Engineering_Technology/SOLARIS
**Subject:** OERC-S Settlement Protocol - Request for Conformance Test

```
Dear SOLARIS Team,

I'm reaching out regarding OERC-S, an open settlement protocol designed for space-based solar power systems.

As SOLARIS advances toward demonstrating space-based solar power for Europe, settlement infrastructure will be needed to prove energy delivery between orbital assets and ground stations.

OERC-S defines a three-stage settlement flow (Intent → Frame → Collapse) that produces a single cryptographic hash proving energy was requested, delivered, and settled. The protocol is:
- Vendor-neutral (no proprietary dependencies)
- Post-quantum ready (ML-DSA-65, ML-KEM-768)
- Designed for orbital-to-ground latency constraints

We're asking the SOLARIS program to publish ONE Collapse hash from any test environment. No integration required—just one hash demonstrates conformance.

Spec: https://github.com/oerc-s/oerc-s

I'd be happy to discuss how OERC-S could support SOLARIS settlement requirements.

Best regards
```

### 4.2 NASA SBSP
**To:** Contact via https://www.nasa.gov/directorates/stmd/sbsp/
**Subject:** OERC-S - Open Settlement Protocol for SBSP

```
Dear SBSP Program Team,

I'm writing to introduce OERC-S, an open settlement protocol for space-based solar power.

As NASA advances SBSP research, a standardized settlement layer will be essential for proving energy delivery from orbital systems to ground receivers.

OERC-S produces a single cryptographic hash (Collapse) that binds:
- Intent: energy request parameters
- Frame: delivery context (orbital position, beam characteristics)

This hash serves as tamper-evident proof of settlement, enabling multi-party energy markets without bilateral integration.

Request: We're asking SBSP to publish ONE Collapse hash from test infrastructure. One hash proves interoperability.

Spec: https://github.com/oerc-s/oerc-s

Happy to discuss alignment with SBSP settlement requirements.

Best regards
```

### 4.3 Caltech SSPP
**To:** Contact via https://www.spacesolarpower.caltech.edu/
**Subject:** OERC-S Settlement Protocol for Space Solar

```
Dear Space Solar Power Project Team,

Following Caltech's successful MAPLE demonstration, I wanted to share OERC-S—an open settlement protocol designed for space-based solar power systems.

OERC-S addresses the settlement layer: how do you prove energy was delivered from orbit to ground? The protocol produces a cryptographic hash binding energy requests to delivery context.

Key properties:
- Deterministic (same inputs = same Collapse, anywhere)
- Post-quantum cryptography (ML-DSA-65)
- Lightweight (designed for orbital latency)

Request: Publish ONE Collapse hash from SSPP test data. One hash proves the protocol works with real space solar infrastructure.

Spec: https://github.com/oerc-s/oerc-s

Would welcome the opportunity to discuss.

Best regards
```

### 4.4 JAXA
**To:** Contact via https://www.kenkai.jaxa.jp/eng/research/ssps/ssps-index.html
**Subject:** OERC-S - Settlement Protocol for SSPS

```
Dear SSPS Research Team,

I'm reaching out regarding OERC-S, an open settlement protocol for space solar power systems.

As JAXA continues SSPS research, standardized settlement infrastructure will be needed for orbital-to-ground energy transactions.

OERC-S defines:
- Intent: energy request declaration
- Frame: delivery context capture
- Collapse: cryptographic binding (settlement proof)

The protocol is vendor-neutral and designed for international interoperability.

Request: We ask JAXA to publish ONE Collapse hash from any SSPS test environment.

Spec: https://github.com/oerc-s/oerc-s

Best regards
```

---

## 5. ZENODO UPLOAD

1. Go to: https://zenodo.org/deposit/new
2. Upload: `ops/publication/zenodo_bundle/OERC-S_v0.1_zenodo.zip`
3. Fill metadata:
   - **Title:** OERC-S: Open Energy Rail Collapse Specification v0.1
   - **Authors:** [Your name]
   - **Description:** Settlement protocol for space-based energy systems. Defines Intent-Frame-Collapse flow producing cryptographic settlement proofs.
   - **Keywords:** space solar power, settlement protocol, energy, cryptography, SBSP
   - **License:** CC-BY-4.0
   - **Access:** Open Access

---

## 6. CHECKLIST D'EXÉCUTION

```
[ ] Twitter/X - Post principal
[ ] Twitter/X - Thread (optionnel)
[ ] LinkedIn - Post
[ ] HackerNews - Submit + comment
[ ] Zenodo - Upload bundle
[ ] Email ESA SOLARIS
[ ] Email NASA SBSP
[ ] Email Caltech SSPP
[ ] Email JAXA SSPS
[ ] Email Northrop Grumman (find contact)
[ ] Email Airbus Space (find contact)
```

---

## 7. SUIVI

Après publication, track les réponses dans ce fichier:

| Date | Canal | Réponse | Action |
|------|-------|---------|--------|
| | | | |

