const baseConfig = require('./index');

module.exports = {
  ...baseConfig,
  extends: [...baseConfig.extends, 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  plugins: [...baseConfig.plugins, 'react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    ...baseConfig.rules,
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
  },
};
