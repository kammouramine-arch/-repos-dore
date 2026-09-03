import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/** Configuration ESLint plate (ESLint 9 + Next 16). */
const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'archive/**',
      // L'application mobile a sa propre configuration (règles React Native).
      'mobile/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'public/**',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    // Les scripts de maintenance et d'audit parlent à un opérateur dans un
    // terminal : leur sortie console est leur raison d'être.
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
];

export default eslintConfig;
