// `npm run regression`: the app on made-up lights in a real browser, then the real lights. Run it after a big job.
// `--no-real` leaves the real lights alone, `--only <text>` runs the journeys with that text in the name.
// `npm run test:stories` is the made-up half alone: the journeys and one test per user story.
import { runJourney, startHarness } from './harness.mjs';
import { journeys } from './journeys.mjs';
import { checkRealLights } from './real-lights.mjs';
import { stories } from './stories/index.mjs';

const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex === -1 ? '' : process.argv[onlyIndex + 1];
const withRealLights = !process.argv.includes('--no-real') && !only;

const lineOf = ({ name, error, isKnown, reason, isSkipped }) => {
  if (isSkipped) return `skip ${name}\n     ${reason}`;
  if (isKnown) return `known fail ${name}\n     ${reason}`;
  return error ? `FAIL ${name}\n     ${error}` : `pass ${name}`;
};

async function runJourneys() {
  const harness = await startHarness();
  const results = [];
  for (const journey of [...journeys, ...stories].filter(({ name }) => name.includes(only))) {
    results.push(await runJourney(harness.browser, journey));
    console.log(lineOf(results.at(-1)));
  }
  await harness.stop();
  return results;
}

async function runRealLights() {
  console.log('\nWatching the real lights.');
  const results = await checkRealLights();
  for (const { name, error, note } of results) {
    console.log(error ? `FAIL ${name}\n     ${error}` : `pass ${name}: ${note}`);
  }
  return results;
}

const started = Date.now();
const results = [...(await runJourneys()), ...(withRealLights ? await runRealLights() : [])];
const count = (check) => results.filter(check).length;
const failed = count(({ error }) => error);
const known = count(({ isKnown }) => isKnown);
const skipped = count(({ isSkipped }) => isSkipped);
const passed = results.length - failed - known - skipped;
const seconds = Math.round((Date.now() - started) / 1000);
console.log(`\n${passed} passed, ${failed} failed, ${known} known fails, ${skipped} not built yet, in ${seconds} s`);
process.exit(failed ? 1 : 0);
