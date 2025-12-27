# Zenodo Deposit Instructions

## OERC-S v0.1 Publication

### Prerequisites
- Zenodo account (https://zenodo.org)
- ORCID iD (recommended for author identification)

### Upload Process

1. **Create Account**
   - Navigate to https://zenodo.org
   - Sign up or log in with GitHub/ORCID

2. **Start New Upload**
   - Click "New Upload" in the header
   - Select "Upload files" section

3. **Upload Files**
   - `OERC-S_v0.1.pdf` - Main specification document
   - `schemas/*.json` - All JSON schema files:
     - `intent.schema.json`
     - `frame.schema.json`
     - `collapse.schema.json`
     - `rail.schema.json`

4. **Apply Metadata**
   - Copy contents from `metadata.json` in this directory
   - Fill in the Zenodo form fields:
     - **Title**: OERC-S v0.1: Open Energy Rail Collapse Specification
     - **Authors**: OERC-S Working Group
     - **Description**: (see metadata.json)
     - **Keywords**: energy, finality, post-quantum, settlement, space-based solar
     - **License**: Creative Commons Attribution 4.0
     - **Version**: 0.1.0
     - **Resource Type**: Publication > Working paper
     - **Access**: Open Access

5. **Additional Metadata (Recommended)**
   - Related identifiers: Link to GitHub repository
   - Subjects: Computer Science, Energy Systems
   - Language: English

6. **Save and Publish**
   - Click "Save" to create draft
   - Preview the record
   - Click "Publish" when ready

### Post-Publication

- DOI will be assigned automatically
- Record cannot be deleted after publication
- New versions can be uploaded and linked

### Zenodo API (Optional)

For automated deposits, use the Zenodo REST API:
```bash
curl -H "Content-Type: application/json" \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -X POST https://zenodo.org/api/deposit/depositions \
     -d @metadata.json
```

See: https://developers.zenodo.org/
