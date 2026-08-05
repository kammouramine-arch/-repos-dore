/**
 * Sprint 1 tests cover the pure core: the geometry, the route tracker and the
 * guidance policy. That is where the logic a driver depends on actually lives,
 * and it runs without a device or a network.
 */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  collectCoverageFrom: ['src/core/**/*.ts', 'src/utils/**/*.ts', 'src/voice/**/*.ts'],
};
