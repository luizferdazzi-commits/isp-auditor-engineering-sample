import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImportRows } from '../validation.mjs';

test('accepts valid contracts', () => {
  const result = validateImportRows('contracts', [
    { source_id: 'C-01', customer_id: 'U-01', monthly_value: 0, status: 'active' },
  ]);
  assert.deepEqual(result, { valid: true, issues: [] });
});

test('rejects duplicates within the same batch', () => {
  const rows = [
    { source_id: 'C-01', customer_id: 'U-01', monthly_value: 10, status: 'active' },
    { source_id: ' C-01 ', customer_id: 'U-02', monthly_value: 10, status: 'active' },
  ];
  const result = validateImportRows('contracts', rows);
  assert.equal(result.valid, false);
  assert.deepEqual(result.issues, [{ row: 3, field: 'source_id', code: 'DUPLICATE_ID' }]);
});

test('reports missing IDs and required values', () => {
  const result = validateImportRows('contracts', [{ source_id: '', status: ' ' }]);
  assert.deepEqual(result.issues.map((issue) => issue.code), [
    'MISSING_ID', 'REQUIRED_FIELD', 'REQUIRED_FIELD', 'REQUIRED_FIELD',
  ]);
});

test('requires financial links and valid numeric amounts', () => {
  const result = validateImportRows('receivables', [
    { source_id: 'R-01', amount: 'not a number', due_date: '2026-10-13' },
  ]);
  assert.deepEqual(result.issues.map((issue) => issue.code), [
    'REQUIRED_FIELD', 'MISSING_RELATION',
  ]);
});

test('allows either a customer or contract link for receivables', () => {
  const result = validateImportRows('receivables', [
    { source_id: 'R-01', amount: 25, due_date: '2026-10-13', contract_id: 'C-01' },
  ]);
  assert.equal(result.valid, true);
});

test('rejects support tickets without a customer or opening date', () => {
  const result = validateImportRows('support_tickets', [{ source_id: 'T-01' }]);
  assert.equal(result.issues.length, 2);
});

test('rejects malformed rows without crashing', () => {
  const result = validateImportRows('plans', [null, 'invalid', { source_id: 'P-01', name: 'Fiber' }]);
  assert.deepEqual(result.issues.map((issue) => issue.code), ['INVALID_ROW', 'INVALID_ROW']);
});

test('rejects unsupported datasets and invalid batch types', () => {
  assert.throws(() => validateImportRows('unknown', []), TypeError);
  assert.throws(() => validateImportRows('plans', null), TypeError);
});

test('does not mutate imported records', () => {
  const rows = Object.freeze([Object.freeze({ source_id: 'P-1', name: 'Fiber' })]);
  assert.equal(validateImportRows('plans', rows).valid, true);
});
