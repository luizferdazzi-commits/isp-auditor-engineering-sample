# ERP Import Validation — Engineering Sample

This is a **sanitized, self-contained adaptation** of data-validation logic from my ISP Auditor project, a platform that helps internet service providers analyze imported operational and financial information. It is **not the full production implementation** and does not include customer records, API tokens, database credentials, or private integration code.

## Problem

ERP exports often have missing columns, duplicate external IDs, invalid numeric values, and references to entities that were not matched during import. Allowing such data into reporting pipelines creates misleading financial and operational metrics.

## Approach

`validateImportRows(dataset, rows)` validates normalized records **before writing them** to a database:

- Rejects missing and duplicated source identifiers in the batch.
- Applies dataset-specific mandatory fields for contracts, receivables, support tickets, and plans.
- Verifies that receivables reference at least one resolved customer or contract.
- Treats `0` as a valid monetary value while rejecting strings, `NaN`, and infinity.
- Returns structured, row-specific issues rather than silently skipping records.
- Does not mutate caller-supplied data.

The production import pipeline separately resolves foreign keys, checks tenant scope, validates dates, persists import-batch metadata, and handles database errors. **This isolated example does not prove tenant ownership, calendar-valid dates, or idempotent database upserts**; those require the surrounding pipeline and persistence layer.

## Test

Node.js 20+ is required. No external dependencies.

```bash
npm test
```

The tests cover valid contracts, duplicate IDs, missing required fields, invalid financial data, relation requirements, malformed rows, supported datasets, and immutability.

## Engineering trade-offs

A validation pass gives users actionable feedback and prevents known-bad batches from proceeding. Structured issue codes can be localized by the UI without coupling messages to core business rules. Database transactions, uniqueness constraints, and tenant-aware foreign-key checks must still protect against concurrency and cross-tenant references.

## Source disclosure

Adapted from a private commercial codebase with implementation details removed and selected checks refactored for demonstration. Examples use synthetic identifiers only.
