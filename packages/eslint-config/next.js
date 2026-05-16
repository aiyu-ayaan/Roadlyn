const reactConfig = require('./react');

module.exports = {
  ...reactConfig,
  extends: [...reactConfig.extends, 'next'],
};
