/**
 * Turn the draft release electron-builder just uploaded into a published one.
 *
 * `npm run release` is two steps for one reason: a release is published only after every
 * file is up. electron-builder uploads into a draft (electron-builder.config.mjs says why);
 * this flips the draft off, and the updaters see the version for the first time with its
 * installer, blockmap and latest.yml all present.
 *
 * By id, never by tag. A draft has no tag yet, so two drafts can carry the same one -- a
 * publish that was interrupted and rerun leaves exactly that, and `gh release view <tag>`
 * then answers with whichever it likes. So every release wearing this version's tag is
 * listed, the complete one is promoted, and incomplete drafts are deleted so the next run
 * starts clean. Uses `gh`, which reads GH_TOKEN -- the token electron-builder published with.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const { owner, repo } = (await import('../electron-builder.config.mjs')).default.publish;
const tag = `v${version}`;
const expected = [
  `Illumigoon-Setup-${version}.exe`,
  `Illumigoon-Setup-${version}.exe.blockmap`,
  'latest.yml',
];

const gh = (...args) =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const api = (path, ...extra) => JSON.parse(gh('api', `repos/${owner}/${repo}${path}`, ...extra));

const wearing = api('/releases?per_page=100').filter((r) => r.tag_name === tag);
const complete = r =>
  expected.every(n => r.assets.some(a => a.name === n && a.state === 'uploaded'));

const published = wearing.find((r) => !r.draft);
if (published) {
  console.log(`${tag} is already published`);
} else {
  const good = wearing.find(complete);
  if (!good) {
    const have = wearing.flatMap((r) => r.assets.map((a) => a.name));
    console.error(
      `not promoting ${tag}: no draft has every file — have ${have.join(', ') || 'nothing'}`,
    );
    process.exit(1);
  }
  api(
    `/releases/${good.id}`,
    '-X',
    'PATCH',
    '-F',
    'draft=false',
    '-F',
    'make_latest=true',
    '-f',
    `name=${tag}`,
  );
  console.log(`published ${tag} with ${good.assets.length} files`);
}

// Whatever else wears the tag is an interrupted upload; clear it so a rerun starts clean.
for (const r of wearing) {
  if (r.draft && (published || !complete(r) || r.id !== wearing.find(complete)?.id)) {
    gh('api', `repos/${owner}/${repo}/releases/${r.id}`, '-X', 'DELETE');
    console.log(`deleted incomplete draft ${r.id}`);
  }
}
