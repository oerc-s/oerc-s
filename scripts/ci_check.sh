#!/bin/bash
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

check() {
  if [ -e "$1" ]; then
    echo "PASS: $1"
    PASS=$((PASS+1))
  else
    echo "FAIL: $1"
    FAIL=$((FAIL+1))
  fi
}

echo "=== OERC-S CI CHECK ==="

check "spec/OERC-S_v0.1.md"
check "spec/OERC-S_v0.1.pdf"
check "schemas/intent.json"
check "schemas/frame.json"
check "schemas/collapse.json"
check "conformance/vectors/valid_collapse.json"
check "conformance/runner.ts"
check "kernel/src/cli.ts"
check "ops/publication/zenodo_deposit/metadata.json"
check "ops/publication/ietf_internet_draft/draft-oerc-s-energy-finality-00.txt"
check "ops/publication/arxiv_paper/paper.tex"
check "ops/outreach/LAUNCH_KIT.md"
check "ops/outreach/partner_targets.csv"
check "ops/outreach/onepager.md"

echo ""
echo "PASS: $PASS / FAIL: $FAIL"

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "ALL PASS"
  exit 0
else
  exit 1
fi
