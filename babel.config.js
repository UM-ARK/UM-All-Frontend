module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // 只在正式打包時剝除 console（開發時仍保留）
  if (process.env.NODE_ENV === 'production') {
    plugins.push([
      'transform-remove-console',
      { exclude: ['error', 'warn'] },
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};