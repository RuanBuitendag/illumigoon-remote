// `npm run lint:ux`: the UX lint (LIFE-1891). First each rule must catch a page that breaks it on purpose. Then
// every story runs on made-up lights while the lint watches, and a finding that is not in docs/ux-lint/known.json
// fails. `--ux-update` makes this run's findings the known list; `--only <text>` runs some stories.
import { spawnSync } from 'node:child_process';
import { prove } from '../ux-lint/proofs.mjs';

const failures = await prove();
for (const failure of failures) console.log(`PROOF FAILED ${failure}`);
if (failures.length) process.exit(1);
console.log('Every UX rule caught its proof.');

const run = spawnSync('node', ['scripts/regression/run.mjs', '--no-real', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, UX_LINT: '1' },
});
process.exit(run.status ?? 1);
