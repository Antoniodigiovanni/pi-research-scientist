import { basename } from 'node:path';
import { initializeProject } from '../src/bootstrap.ts';
const [destination, mode, ...name] = process.argv.slice(2);
if (!destination || (mode !== 'public' && mode !== 'internal')) {
  console.error('Usage: npm run init-project -- /path/to/new-project public|internal [project name]');
  process.exitCode = 1;
} else {
  try { console.log(await initializeProject(destination, mode, name.join(' ') || basename(destination))); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Initialization failed'); process.exitCode = 1; }
}
