const forbidDownward = (name, from, to) => ({
  name,
  severity: 'error',
  from: { path: from },
  to: { path: to },
});

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    forbidDownward('network-stays-below-the-store', '^src/light-network', '^src/(store|components|screens)'),
    forbidDownward('store-stays-below-the-ui', '^src/store', '^src/(components|screens)'),
    forbidDownward('looks-stay-below-the-ui', '^src/looks', '^src/(components|screens)'),
    forbidDownward('components-stay-below-screens', '^src/components', '^src/screens'),
  ],
  options: { tsConfig: { fileName: 'tsconfig.json' }, doNotFollow: { path: 'node_modules' } },
};
