module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // the shared files in ../src/domain are outside this project, and need its node_modules (zod, Babel's helpers)
  modulePaths: ['<rootDir>/node_modules'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/../src/domain/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^zod$': '<rootDir>/node_modules/zod',
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/dist'],
  collectCoverageFrom: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}', '!src/test/**'],
};
