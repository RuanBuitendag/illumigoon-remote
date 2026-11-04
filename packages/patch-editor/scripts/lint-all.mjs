// `npm run lint` in this package: every check of Edit's gate, one after the other. Each runs even when an earlier one
// fails, so one run shows all the problems, as the root `npm run lint` does. Exits 1 when any check fails.

import { spawnSync } from 'node:child_process';

const checks = ['lint:types', 'lint:code', 'lint:complexity', 'lint:layers', 'lint:dupes', 'lint:rules'];
const failed = [];

for (const check of checks) {
  console.log(`\n=== Edit ${check} ===`);
  const result = spawnSync('npm', ['run', '--silent', check], { stdio: 'inherit', shell: true });
  if (result.status !== 0) failed.push(check);
}

console.log(failed.length ? `\nEdit's lint failed: ${failed.join(', ')}` : "\nEdit's lint passed");
process.exit(failed.length ? 1 : 0);
