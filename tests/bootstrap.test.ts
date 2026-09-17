import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeProject } from '../src/bootstrap.ts';
import { loadPolicy } from '../src/policy.ts';
test('bootstrap creates both modes and never overwrites existing projects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pi-research-scientist-bootstrap-'));
  try {
    for (const mode of ['public', 'internal'] as const) {
      const target = join(root, mode);
      await initializeProject(target, mode, `Example ${mode}`);
      const p = await loadPolicy(target);
      assert.equal(p.project.type, mode);
      assert.equal(p.data_policy.public_release_allowed, mode === 'public');
      assert.equal(p.databricks.row_access, false);
      const before = await readFile(join(target, 'AGENTS.md'), 'utf8');
      await assert.rejects(initializeProject(target, 'public', 'Overwrite'));
      assert.equal(await readFile(join(target, 'AGENTS.md'), 'utf8'), before);
      assert.match(await readFile(join(target, 'paper/main.tex'), 'utf8'), /documentclass/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
