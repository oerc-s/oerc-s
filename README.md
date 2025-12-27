# OERC-S v0.1

**Open Energy Rail Collapse Specification**

Machine-native, post-quantum-ready settlement protocol for space-based energy.

> **COLLAPSE is payable. Everything else is not.**

[![Build PDF](https://github.com/oerc-s/oerc-s/actions/workflows/build-pdf.yml/badge.svg)](https://github.com/oerc-s/oerc-s/actions/workflows/build-pdf.yml)

## Quick Links

| Resource | URL |
|----------|-----|
| **Specification** | [OERC-S_v0.1.pdf](https://oerc-s.github.io/oerc-s/spec/OERC-S_v0.1.pdf) |
| **Schemas** | [schemas/](https://oerc-s.github.io/oerc-s/schemas/) |
| **Conformance Vectors** | [conformance/vectors/](https://oerc-s.github.io/oerc-s/conformance/vectors/) |

## Install & Run

```bash
# Clone
git clone https://github.com/oerc-s/oerc-s.git
cd oerc-s

# Build kernel
cd kernel && npm install && npm run build
cd ..

# Commands
./kernel/dist/cli.js issue-intent --in intent.json --out intent.signed.json --keyfile key.json
./kernel/dist/cli.js emit-frame --in frame.json --out frame.signed.json --keyfile key.json
./kernel/dist/cli.js collapse --frames frames/*.json --out collapse.signed.json --keyfile key.json
./kernel/dist/cli.js verify --in <file>.json
./kernel/dist/cli.js conformance-check --vectors conformance/vectors --report report.json

# Build PDF locally
./scripts/build_pdf.sh
```

## Protocol Flow

```
INTENT ──► FRAME ──► FRAME ──► ... ──► COLLAPSE
  │          │         │                  │
  │    (superposed)    │            (payable)
  │                    │                  │
  └── pre-allocation ──┴── streaming ─────┴── finality
```

## Structure

```
oerc-s/
├── spec/                    # Specification documents
│   ├── OERC-S_v0.1.md      # Main spec (15 pages)
│   ├── SECURITY_ANALYSIS.md # Attack surface analysis
│   └── ERRATA.md           # Known issues
├── schemas/                 # JSON Schemas
│   ├── intent.json
│   ├── frame.json
│   ├── collapse.json
│   ├── crypto_suites.json  # PQC + hybrid registry
│   └── sigset.json
├── conformance/
│   ├── vectors/            # 10 frozen test vectors
│   └── runner.ts           # Conformance runner
├── kernel/                  # TypeScript CLI
├── ops/
│   ├── publication/        # Zenodo, IETF, arXiv bundles
│   └── outreach/           # Partner targets, templates
└── scripts/                 # Build tools
```

## Conformance

**OERC-S compliant == passes all official vectors.**

No conformance → no interoperability → no liquidity.

```bash
./kernel/dist/cli.js conformance-check --vectors conformance/vectors
```

## Crypto Suites

| Suite ID | Type | Security | Status |
|----------|------|----------|--------|
| `ed25519-v1` | Sign | 128-bit | Active |
| `ml-dsa-65-v1` | Sign (PQC) | 192-bit | Active |
| `hybrid-sig-v1` | Ed25519 + ML-DSA-65 | 192-bit | Active |

## License

- **Specification**: CC-BY-4.0
- **Code**: MIT

See [LICENSE](LICENSE).

---

*One hash. One test. That's all we ask.*
