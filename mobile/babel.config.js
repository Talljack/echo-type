module.exports = (api) => {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@/types': './src/types',
            '@/stores': './src/stores',
            '@/database': './src/database',
            '@/components': './src/components',
            '@/utils': './src/utils',
            '@/hooks': './src/hooks',
            '@/constants': './src/constants',
            '@/services': './src/services',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
    ],
  };
};
