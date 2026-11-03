// Imports only point down this list:
//
//   src/ui       screens and controls   -> device, library, engine, domain
//   src/device   talks to a light       -> domain
//   src/library  saved patches          -> domain
//   src/engine   the compiled engine    -> domain
//   src/domain   pure rules             -> nothing above it
//
// Edit draws with the app's design system and composites, through their doors only (LIFE-1950). It never
// reaches the app's domain, so the one-way rule of the app's layers still holds.
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'domain-stays-pure',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { path: '^src/(ui|device|library|engine)/' },
    },
    {
      name: 'nothing-imports-the-ui',
      severity: 'error',
      from: { path: '^src/(domain|device|library|engine)/' },
      to: { path: '^src/ui/' },
    },
    {
      name: 'siblings-stay-independent',
      severity: 'error',
      from: { path: '^src/(device|library|engine)/' },
      to: { path: '^src/(device|library|engine)/', pathNot: '^src/$1/' },
    },
    {
      name: 'the-app-only-through-its-look-doors',
      comment: "Import the app's '../src/design-system' or '../src/composites' door, never another app file.",
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^[.][.]/[.][.]/src/', pathNot: '^[.][.]/[.][.]/src/(design-system|composites)/index[.]ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'src/engine/generated' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
}
