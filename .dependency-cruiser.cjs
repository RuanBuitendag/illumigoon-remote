// The layers of the app. Run with `npm run lint:layers`. Imports only point down.
//
//   src/main.tsx        the entry file, and the only file outside a layer    may use the domain door
//   src/domain          lights, looks, stores, and the screens that wire them to composites
//                       may use composites, design-system
//   src/composites      assemblies of the design system. Props in, callbacks out. No app state.
//                       may use design-system
//   src/design-system   tokens, fonts, primitives, colour maths. Knows nothing about this app.
//                       may use only its own files
//
// Inside src/domain, the logic never reaches up to the screens:
//   screens -> store -> looks, light-network
//
// A layer is entered through its door, an index file. rules.mjs checks what this file cannot:
// that no file sits outside the layers, and that only the design system and composites hold a look.

const LAYERS = '^src/(design-system|composites|domain)/';
const LOOK_LIBRARIES = '^node_modules/(@base-ui|@fontsource)';
const APP_LIBRARIES = '^node_modules/(zustand|@capacitor|@capgo|@mhaberler)';

const rule = (name, comment, from, to) => ({ name, comment, severity: 'error', from, to });

module.exports = {
  forbidden: [
    rule('no-circular', 'A cycle means two modules are one module in two files.', {}, { circular: true }),
    rule(
      'nothing-outside-the-layers',
      'Every source file belongs to design-system, composites or domain.',
      { path: '^src/' },
      { path: '^src/', pathNot: [LAYERS, '^src/main[.]tsx$'] },
    ),
    rule(
      'design-system-stands-alone',
      'The design system never knows the app, so another app or a new design can take it whole.',
      { path: '^src/design-system/' },
      { path: '^src/(composites|domain)/' },
    ),
    rule(
      'composites-never-know-the-domain',
      'Composites take props. A composite that needs data gets it from the screen that uses it.',
      { path: '^src/composites/' },
      { path: '^src/domain/' },
    ),
    rule(
      'only-the-domain-uses-app-libraries',
      'State, network and native libraries are app concerns, so they stay out of the UI layers.',
      { path: '^src/', pathNot: '^src/domain/' },
      { path: APP_LIBRARIES },
    ),
    rule(
      'only-the-design-system-uses-look-libraries',
      'Primitive and font libraries are the look. Extend the design system to reach them.',
      { path: '^src/', pathNot: '^src/design-system/' },
      { path: LOOK_LIBRARIES },
    ),
    rule(
      'design-system-through-its-door',
      "Import '../design-system', never a file inside it.",
      { path: '^src/', pathNot: '^src/design-system/' },
      { path: '^src/design-system/', pathNot: '^src/design-system/index[.]ts$' },
    ),
    rule(
      'composites-through-their-door',
      "Import '../composites', never a file inside it.",
      { path: '^src/', pathNot: '^src/composites/' },
      { path: '^src/composites/', pathNot: '^src/composites/index[.]ts$' },
    ),
    rule(
      'domain-through-its-door',
      "The entry file imports './domain', never a file inside it.",
      { path: '^src/main[.]tsx$' },
      { path: '^src/domain/', pathNot: '^src/domain/index[.]ts$' },
    ),
    rule(
      'domain-logic-stays-below-screens',
      'Logic must work with no screen, so a screen can change and the logic stays.',
      { path: '^src/domain/(light-network|looks|store|app-update)/' },
      { path: '^src/domain/screens/' },
    ),
    rule(
      'network-stays-below-the-store',
      'The network layer reports events and knows no app state.',
      { path: '^src/domain/light-network/' },
      { path: '^src/domain/(store|looks)/' },
    ),
    rule(
      'looks-stay-below-the-store',
      'Looks are data and preview code. They read no app state.',
      { path: '^src/domain/looks/' },
      { path: '^src/domain/store/' },
    ),
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^src/domain/looks/engine/' },
  },
};
