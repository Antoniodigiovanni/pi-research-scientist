import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import zotero from '../extensions/zotero/index.ts';
import { loadToolPolicy } from '../src/policy.ts';

const source = 'project:\n  name: audit\n  type: internal\n  research_question: Synthetic question\n  owner: tester\n';

test('private literature tools reject missing policy and unapproved models before I/O', async () => {
  const tools: Array<{ name: string; execute: Function }> = [];
  zotero({ registerTool: (tool: typeof tools[number]) => tools.push(tool) } as unknown as ExtensionAPI);
  const cwd = await mkdtemp(join(tmpdir(), 'pi-research-scientist-gates-'));
  try {
    for (const tool of tools) await assert.rejects(tool.execute('test', {}, undefined, undefined, { cwd }), /Cannot read research.yaml/, tool.name);
    await writeFile(join(cwd, 'research.yaml'), source);
    for (const tool of tools) await assert.rejects(tool.execute('test', {}, undefined, undefined, { cwd, model: { provider: 'test', id: 'unapproved' } }), /not explicitly approved/, tool.name);
    await writeFile(join(cwd, 'research.yaml'), source + 'data_policy:\n  approved_models: [test/approved]\n');
    for (const tool of tools) await assert.rejects(tool.execute('test', {}, undefined, undefined, { cwd, model: { provider: 'test', id: 'approved' } }), /raw_data_to_model/, tool.name);
    await assert.doesNotReject(loadToolPolicy({ cwd, model: { provider: 'test', id: 'approved' } }));
  } finally { await rm(cwd, { recursive: true, force: true }); }
});
