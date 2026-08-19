const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'supabase/functions/*/index.ts'],
  },
  {
    rules: {
      'import/no-unresolved': 'off',
      // These two rules from the React Compiler-era plugin fire on patterns this app
      // uses deliberately: loading async state in an effect, and resetting a sheet's
      // draft when it opens. Kept visible as warnings rather than silenced.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
