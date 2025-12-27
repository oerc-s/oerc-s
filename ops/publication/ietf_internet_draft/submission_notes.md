# IETF Internet-Draft Submission Notes

## OERC-S Energy Finality Protocol

### Overview

This document describes the process for submitting the OERC-S specification as an IETF Internet-Draft.

### Prerequisites

1. **IETF Datatracker Account**
   - Create account at https://datatracker.ietf.org/accounts/create/
   - Verify email address

2. **Document Preparation**
   - Ensure document follows RFC format (RFC 7322)
   - Validate with xml2rfc or similar tool
   - Check line lengths (max 72 characters for body text)

### Submission Process

#### Step 1: Format Validation

Before submitting, validate the draft:

```bash
# Using xml2rfc (if XML source available)
xml2rfc draft-oerc-s-energy-finality-00.xml --text

# Using idnits for validation
idnits draft-oerc-s-energy-finality-00.txt
```

Common issues to check:
- Line length exceeds 72 characters
- Non-ASCII characters
- Missing required sections
- Incorrect page headers/footers

#### Step 2: Submit via Datatracker

1. Navigate to https://datatracker.ietf.org/submit/
2. Log in with your IETF account
3. Select "Individual Submission" (for independent submissions)
4. Upload the .txt file
5. Optionally upload .xml source

#### Step 3: Complete Submission Form

- **Document name**: draft-oerc-s-energy-finality-00
- **Title**: Open Energy Rail Collapse Specification for Energy Transaction Finality
- **Authors**: Add all authors with email addresses
- **Abstract**: Copy from document
- **Intended Status**: Informational

#### Step 4: Author Confirmation

- All listed authors will receive confirmation emails
- Each author must confirm their participation
- Submission is not complete until all authors confirm

### Document Naming Convention

```
draft-[name]-[topic]-[version]

Example:
draft-oerc-s-energy-finality-00
       ^     ^              ^
       |     |              |
       |     |              +-- Version (00 = first)
       |     +-- Topic
       +-- Group/Author name
```

### Version Updates

When updating the draft:

1. Increment version number: `-00` -> `-01`
2. Update expiration date (6 months from submission)
3. Add change log to document
4. Submit as new version via datatracker

### Working Group Adoption

To have the draft adopted by an IETF Working Group:

1. **Identify relevant WG**: Consider
   - OPSAWG (Operations and Management Area Working Group)
   - SECEVENT (Security Events)
   - New WG formation for energy protocols

2. **Present at IETF Meeting**
   - Request agenda time at relevant WG
   - Present draft and gather feedback
   - Address WG concerns

3. **Call for Adoption**
   - WG chairs issue call for adoption
   - Community consensus required

### Independent Submission Stream

If no WG adoption:

1. Submit via Independent Submission Editor (ISE)
2. Draft will be reviewed for conflicts with IETF work
3. May be published as Independent RFC

### Timeline

- Initial submission: Immediate upon upload
- Author confirmation: 7 days
- Expiration: 6 months from submission
- Expected revision cycle: 3-6 months

### Resources

- IETF Datatracker: https://datatracker.ietf.org/
- RFC Editor: https://www.rfc-editor.org/
- Internet-Draft Guidelines: https://www.ietf.org/standards/ids/
- xml2rfc Tool: https://xml2rfc.tools.ietf.org/
- idnits Validator: https://tools.ietf.org/tools/idnits/

### Contact

For questions about IETF process:
- IETF Secretariat: ietf-action@ietf.org
- Independent Submissions Editor: rfc-ise@rfc-editor.org

### Checklist

- [ ] Document formatted correctly (72-char lines, ASCII)
- [ ] All required sections present
- [ ] idnits validation passes
- [ ] IETF Datatracker account created
- [ ] Document uploaded to datatracker
- [ ] All authors confirmed submission
- [ ] Announced to relevant mailing lists
