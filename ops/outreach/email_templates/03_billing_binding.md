# Billing Binding Integration

**Subject:** OERC-S Billing Binding Integration

---

Hi,

Orbital compute needs a settlement primitive that ties compute consumption to energy metering. OERC-S Collapse provides exactly this: a cryptographic receipt that binds workload execution to energy delivery in a single hash.

Your billing systems can emit Collapse hashes as settlement proofs. Each hash captures the Intent (what was requested), Frame (execution context), and Collapse (cryptographic binding). This creates an auditable, tamper-evident record linking compute cycles to kilowatt-hours.

Integration is lightweight—one hash per billing interval. The attached spec and one-pager cover the full flow.

Best regards

---

**Attachments:**
- OERC-S_v0.1.pdf
- onepager.md
