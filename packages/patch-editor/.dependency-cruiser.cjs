// Imports only point down this list:
//
//   src/ui       screens and controls   -> device, library, engine, domain
//   src/device   talks to a light       -> domain
//   src/library  saved patches          -> domain
//   src/engine   the compiled engine    -> domain
//   src/domain   pure rules             -> nothing above it
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
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'src/engine/generated' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
}
