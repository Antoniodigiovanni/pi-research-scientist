import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { parsePolicy } from './policy.ts';

const template = fileURLToPath(new URL('../templates/research-project/', import.meta.url));
export async function initializeProject(destination: string, mode: 'public' | 'internal', name: string): Promise<string> {
  if (!['public', 'internal'].includes(mode)) throw new Error('Choose an explicit public or internal project mode');
  if (!name.trim() || name.length > 200) throw new Error('Provide a project name of 1–200 characters');
  const source = await readFile(join(template, 'research.yaml'), 'utf8');
  const doc = parseDocument(source);
  doc.setIn(['project', 'name'], name);
  doc.setIn(['project', 'type'], mode);
  doc.setIn(['data_policy', 'public_release_allowed'], mode === 'public');
  doc.setIn(['publication', 'external_release_allowed'], mode === 'public');
  doc.setIn(['databricks', 'minimum_cohort_size'], mode === 'internal' ? 10 : 1);
  const config = doc.toString();
  parsePolicy(config);
  const target = resolve(destination);
  // Exclusive creation protects existing projects and existing AGENTS.md files.
  await mkdir(target, { recursive: false });
  for (const entry of await readdir(template)) {
    if (entry !== 'research.yaml') await cp(join(template, entry), join(target, entry === 'gitignore.template' ? '.gitignore' : entry), { recursive: true, force: false, errorOnExist: true });
  }
  await writeFile(join(target, 'research.yaml'), config, { flag: 'wx' });
  return target;
}
