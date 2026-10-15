const expo = require('eslint-config-expo/flat');

module.exports = [...expo, { ignores: ['dist', 'dist-native', '.expo', 'coverage', 'node_modules'] }];
