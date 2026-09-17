import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePolicy, assertAggregateAllowed, assertNonSensitive } from '../src/policy.ts';
const basic = 'project:\n  name: example\n  type: internal\n  research_question: Does X help?\n  owner: researcher\n';
test('internal defaults deny raw rows and release', () => {
  const p = parsePolicy(basic);
  assert.equal(p.data_policy.raw_data_to_model, false);
  assert.equal(p.data_policy.allow_samples, false);
  assert.equal(p.publication.external_release_allowed, false);
  assert.equal(p.databricks.row_access, false);
});
test('public policy differs, but still has no accidental row access', () => {
  const p = parsePolicy(basic.replace('internal', 'public'));
  assert.equal(p.data_policy.public_release_allowed, true);
  assert.equal(p.data_policy.allow_samples, false);
});
test('malformed, unknown, duplicate and missing mode fail closed', () => {
  for (const source of ['', basic.replace('internal', 'other'), basic + 'data_policy:\n  allow_sampels: true', basic + 'databricks:\n  row_access: yes', basic + 'project: {}', basic.replace('  type: internal\n', '')]) assert.throws(() => parsePolicy(source));
});
test('aggregate tables and columns require explicit approval', () => {
  const p = parsePolicy(basic + 'databricks:\n  enabled: true\n  allowed_catalogs: [a]\n  allowed_schemas: [a.b]\n  approved_tables:\n    a.b.c: [x]\n');
  assert.doesNotThrow(() => assertAggregateAllowed(p, 'a.b.c', ['x']));
  assert.throws(() => assertAggregateAllowed(p, 'a.b.c', ['y']));
  assert.throws(() => assertAggregateAllowed(p, 'a.d.c', ['x']));
  assert.throws(() => assertNonSensitive(p, [{key:'classification', value:'PII'}]));
});
