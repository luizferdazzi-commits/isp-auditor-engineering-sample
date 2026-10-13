/**
 * Standalone, sanitized example adapted from ISP Auditor's ERP import validation.
 * No customer data, credentials, or production endpoints are included.
 */
const RULES = Object.freeze({
  contracts: Object.freeze({ required: ['customer_id', 'monthly_value', 'status'] }),
  receivables: Object.freeze({
    required: ['amount', 'due_date'],
    anyOf: ['customer_id', 'contract_id'],
  }),
  support_tickets: Object.freeze({ required: ['customer_id', 'opened_at'] }),
  plans: Object.freeze({ required: ['name'] }),
});

const isEmpty = (value) =>
  value === null || value === undefined ||
  (typeof value === 'string' && value.trim() === '');

const isValidAmount = (value) =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Validate normalized, tenant-scoped records before attempting persistence.
 * Foreign-key resolution and tenant-membership checks happen upstream.
 *
 * @returns {{ valid: boolean, issues: Array<{row:number,field:string,code:string}> }}
 */
export function validateImportRows(dataset, rows) {
  if (!Object.hasOwn(RULES, dataset)) {
    throw new TypeError(`Unsupported dataset: ${dataset}`);
  }
  if (!Array.isArray(rows)) {
    throw new TypeError('rows must be an array');
  }

  const issues = [];
  const seen = new Set();
  const { required, anyOf } = RULES[dataset];

  for (const [index, row] of rows.entries()) {
    const line = index + 2; // CSV header occupies the first line.
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      issues.push({ row: line, field: '*', code: 'INVALID_ROW' });
      continue;
    }

    const id = String(row.source_id ?? '').trim();
    if (!id) {
      issues.push({ row: line, field: 'source_id', code: 'MISSING_ID' });
    } else if (seen.has(id)) {
      issues.push({ row: line, field: 'source_id', code: 'DUPLICATE_ID' });
    } else {
      seen.add(id);
    }

    for (const field of required) {
      const value = row[field];
      const missing = ['monthly_value', 'amount'].includes(field)
        ? !isValidAmount(value)
        : isEmpty(value);
      if (missing) issues.push({ row: line, field, code: 'REQUIRED_FIELD' });
    }
    if (anyOf && !anyOf.some((field) => !isEmpty(row[field]))) {
      issues.push({ row: line, field: anyOf.join('|'), code: 'MISSING_RELATION' });
    }
  }
  return { valid: issues.length === 0, issues };
}
