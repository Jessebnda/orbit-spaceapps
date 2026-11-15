module.exports = function (api) {
  api.cache(true);
  return {
    // zustand's ESM middleware reads import.meta.env, which a classic web script cannot parse; native ignores this.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
