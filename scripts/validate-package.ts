import { readFile, access, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const p = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
assert.equal(p.name, 'pi-research-scientist');
assert.ok(p.keywords.includes('pi-package'));
assert.ok(!p.scripts.postinstall && !p.scripts.preinstall && !p.dependencies['pi-web-access']);
for (const hook of ['install', 'prepare']) assert.ok(!p.scripts[hook], `Unexpected lifecycle hook: ${hook}`);
for (const list of Object.values(p.pi) as string[][]) for (const path of list) await access(join(root, path));
for (const dir of await readdir(join(root, 'skills'))) await access(join(root, 'skills', dir, 'SKILL.md'));
assert.equal(p.peerDependencies['@earendil-works/pi-coding-agent'], '*');
assert.equal(p.peerDependencies.typebox, '*');
assert.deepEqual(p.pi.extensions, [
  './extensions/research-guardrails/index.ts',
  './extensions/scholarly/index.ts',
  './extensions/zotero/index.ts',
  './extensions/databricks/index.ts',
  './extensions/mlflow/index.ts',
]);
for (const extension of p.pi.extensions as string[]) assert.ok(extension.endsWith('/index.ts'), 'manifest must list extension entry points, not internal modules');
assert.ok(p.files.includes('CHANGELOG.md') && !p.files.includes('docs'));
console.log('Pi manifest, resource paths and external web dependency validated');
