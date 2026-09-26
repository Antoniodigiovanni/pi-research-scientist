import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parsePolicy } from '../src/policy.ts';

const root = new URL('..', import.meta.url).pathname;

const requiredSkills = [
  'project-bootstrap', 'literature-review', 'paper-analysis', 'novelty-analysis',
  'research-design', 'sprint-planning', 'dataset-assessment', 'data-documentation',
  'internal-data-safety', 'experiment-design', 'experiment-analysis',
  'experiment-synthesis', 'statistical-review', 'data-leakage-audit',
  'reproducibility-audit', 'citation-verification', 'latex-authoring',
  'venue-adaptation', 'figure-table-design', 'peer-review',
  'research-presentations', 'decision-log',
];

const requiredPrompts = [
  'new-research', 'literature', 'paper', 'novelty', 'sprint', 'experiment',
  'review-results', 'document-data', 'data-audit', 'reproduce', 'target-venue',
  'write-paper', 'review-paper', 'standup', 'management-update', 'decision',
  'project-status',
];

test('all required skill assets have discoverable frontmatter and nonempty instruction bodies', async () => {
  const discovered = await readdir(join(root, 'skills'));
  for (const name of requiredSkills) {
    assert.ok(discovered.includes(name), `missing skill directory: ${name}`);
    const source = await readFile(join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(source, /^---\nname: [a-z0-9]+(?:-[a-z0-9]+)*\ndescription: .{30,1024}\n---\n/s);
    assert.match(source, new RegExp(`^name: ${name}$`, 'm'));
    assert.ok(source.length > 500, `${name} needs task-specific instructions`);
  }
});

test('prompt templates are flat, documented, and delegate to skills', async () => {
  const entries = await readdir(join(root, 'prompts'), { withFileTypes: true });
  assert.equal(entries.filter(entry => entry.isDirectory()).length, 0, 'Pi package prompts must be non-recursive');
  for (const name of requiredPrompts) {
    const source = await readFile(join(root, 'prompts', `${name}.md`), 'utf8');
    assert.match(source, /^---\ndescription: .+\n/s);
    assert.match(source, /\/skill:[a-z0-9-]+/, `${name} must invoke a focused skill`);
  }
});

test('project template parses with secure internal defaults and complete durable records', async () => {
  const template = join(root, 'templates', 'research-project');
  const source = await readFile(join(template, 'research.yaml'), 'utf8');
  const policy = parsePolicy(source);
  assert.equal(policy.project.type, 'internal');
  assert.equal(policy.data_policy.raw_data_to_model, false);
  assert.equal(policy.data_policy.allow_samples, false);
  assert.equal(policy.data_policy.allow_sensitive_values, false);
  assert.equal(policy.data_policy.public_release_allowed, false);
  assert.equal(policy.publication.external_release_allowed, false);

  const durableFiles = [
    'AGENTS.md', 'docs/research-question.md', 'docs/novelty.md',
    'docs/data/sources.md', 'docs/data/variables.md',
    'docs/data/transformations.md', 'docs/data/lineage.md',
    'docs/data/final-datasets.md', 'literature/search-log.md',
    'literature/evidence-matrix.csv', 'experiments/experiment-template.md',
    'paper/main.tex', 'paper/references.bib', 'paper/claims.md', 'paper/venue.md',
    'presentations/standup/README.md', 'presentations/management/README.md',
  ];
  await Promise.all(durableFiles.map(file => access(join(template, file))));
});

test('environment example contains names only and communication modes remain distinct', async () => {
  const template = join(root, 'templates', 'research-project');
  const environment = await readFile(join(template, '.env.example'), 'utf8');
  for (const line of environment.trim().split('\n')) {
    assert.match(line, /^[A-Z][A-Z0-9_]*=$/, `environment example must not contain a value: ${line}`);
  }

  const standup = await readFile(join(template, 'presentations/standup/README.md'), 'utf8');
  const management = await readFile(join(template, 'presentations/management/README.md'), 'utf8');
  assert.match(standup, /hypothesis|run IDs|technical/i);
  assert.match(management, /decision required|business|milestone/i);
  assert.notEqual(standup, management);
});

test('literature assets preserve required evidence fields and synthetic example is labeled', async () => {
  const header = await readFile(join(root, 'templates/research-project/literature/evidence-matrix.csv'), 'utf8');
  for (const field of ['publication_status', 'central_claim', 'baselines', 'limitations', 'novelty_overlap', 'evidence_status']) {
    assert.ok(header.split('\n')[0].split(',').includes(field), `missing evidence field: ${field}`);
  }
  const example = await readFile(join(root, 'examples/literature/README.md'), 'utf8');
  assert.match(example, /explicitly synthetic/i);
  assert.match(example, /must not be cited/i);
});
