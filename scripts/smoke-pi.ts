import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DefaultResourceLoader, SettingsManager } from '@earendil-works/pi-coding-agent';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const scratch = await mkdtemp(join(tmpdir(), 'pi-research-scientist-smoke-'));
const partial = process.argv.includes('--partial');
try {
  const settings = SettingsManager.inMemory({ packages: [root] });
  const loader = new DefaultResourceLoader({ cwd: scratch, agentDir: join(scratch, 'agent'), settingsManager: settings, noContextFiles: true });
  await loader.reload();
  const loaded = loader.getExtensions();
  assert.deepEqual(loaded.errors, [], 'Pi extension loading errors');
  const skills = loader.getSkills();
  const prompts = loader.getPrompts();
  assert.deepEqual(skills.diagnostics.filter(d => d.type === 'error'), []);
  assert.deepEqual(prompts.diagnostics.filter(d => d.type === 'error'), []);
  if (!partial) {
    assert.equal(loaded.extensions.length, manifest.pi.extensions.length);
    assert.ok(skills.skills.length >= 22);
    assert.ok(prompts.prompts.length >= 17);
  }
  const tools = loaded.extensions.flatMap(e => [...e.tools.keys()]);
  assert.equal(new Set(tools).size, tools.length, 'Duplicate tool registration');
  assert.ok(tools.includes('research_doctor'));
  console.log(JSON.stringify({ pi: '0.85.1', extensions: loaded.extensions.length, skills: skills.skills.length, prompts: prompts.prompts.length, tools }, null, 2));
} finally { await rm(scratch, { recursive: true, force: true }); }
