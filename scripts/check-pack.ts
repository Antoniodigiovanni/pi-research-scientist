import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const scratch = await mkdtemp(join(tmpdir(), 'pi-research-scientist-pack-'));
try {
  const [pack] = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', scratch, '--cache', join(scratch, 'cache')], { cwd: root, encoding: 'utf8' }));
  const paths = pack.files.map((file: {path: string}) => file.path) as string[];
  for (const required of ['templates/research-project/gitignore.template', 'templates/research-project/.env.example', 'tsconfig.json', 'tests/gates.test.ts', 'scripts/init-project.ts']) assert.ok(paths.includes(required), `Missing packed file: ${required}`);
  assert.ok(!paths.some(path => /(^|\/)node_modules\/|(^|\/)\.env$|\.tgz$/.test(path)));
  execFileSync('tar', ['-xzf', join(scratch, pack.filename), '-C', scratch]);
  const packed = join(scratch, 'package');
  // Reuse this checkout's installed dependencies; this is not a clean npm install.
  await symlink(join(root, 'node_modules'), join(packed, 'node_modules'), 'dir');
  for (const script of ['validate-package.ts', 'smoke-pi.ts']) execFileSync(process.execPath, [join(packed, 'scripts', script)], { cwd: packed, stdio: 'pipe' });
  const { initializeProject } = await import(pathToFileURL(join(packed, 'src/bootstrap.ts')).href);
  const project = join(scratch, 'generated-project');
  await initializeProject(project, 'internal', 'Packed template test');
  assert.match(await readFile(join(project, '.gitignore'), 'utf8'), /^\.env$/m);
  assert.match(await readFile(join(project, '.gitignore'), 'utf8'), /results\/private\//);
  console.log(`Packed artifact validated: ${pack.entryCount} files; Pi loader and project initialization passed. Dependencies reused from checkout.`);
} finally { await rm(scratch, { recursive: true, force: true }); }
