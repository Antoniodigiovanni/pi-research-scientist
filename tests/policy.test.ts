import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePolicy } from '../src/policy.ts';
const basic = 'project:\n  name: example\n  type: internal\n  research_question: Does X help?\n  owner: researcher\n';
test('internal defaults deny raw rows and release', () => {
  const p = parsePolicy(basic);
  assert.equal(p.data_policy.raw_data_to_model, false);
  assert.equal(p.data_policy.allow_samples, false);
  assert.equal(p.publication.external_release_allowed, false);
});
test('public policy has explicit release defaults', () => {
  const p = parsePolicy(basic.replace('internal', 'public'));
  assert.equal(p.data_policy.public_release_allowed, true);
  assert.equal(p.data_policy.allow_samples, false);
});
test('malformed, unknown, duplicate and missing mode fail closed', () => {
  for (const source of ['', basic.replace('internal', 'other'), basic + 'data_policy:\n  allow_sampels: true', basic + 'project: {}', basic.replace('  type: internal\n', '')]) assert.throws(() => parsePolicy(source));
});
test('service configuration belongs to the engineering package', () => {
  assert.throws(() => parsePolicy(basic + 'service_tools:\n  enabled: true\n'));
});
