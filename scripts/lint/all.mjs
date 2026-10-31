// `npm run lint`: every check, one after the other. Each runs even when an earlier one fails, so
// one run shows all the problems. Exits 1 when any check fails.

import { spawnSync } from 'node:child_process';

const checks = ['lint:code', 'lint:complexity', 'lint:types', 'lint:layers', 'lint:dupes', 'lint:unused', 'lint:rules'];
const failed = [];

for (const check of checks) {
  console.log(`\n=== ${check} ===`);
  const result = spawnSync('npm', ['run', '--silent', check], { stdio: 'inherit', shell: true });
  if (result.status !== 0) failed.push(check);
}

console.log(failed.length ? `\nlint failed: ${failed.join(', ')}` : '\nlint passed');
process.exit(failed.length ? 1 : 0);
