export type PatchLook = { id: string; name: string; document: Record<string, unknown> };

type PatchFile = Record<string, unknown> & { name?: string };

const patchFiles = import.meta.glob<PatchFile>('./patches/*.json', { eager: true, import: 'default' });

function toLook([path, file]: [string, PatchFile]): PatchLook {
  const id = path.replace(/^.*\/|\.json$/g, '');
  const { name, created: _created, notes: _notes, ...document } = file;
  return { id, name: name ?? id, document };
}

export const PATCH_LOOKS = Object.entries(patchFiles)
  .map(toLook)
  .sort((a, b) => a.name.localeCompare(b.name));
