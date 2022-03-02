/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    "\\./md5.worker":"<rootDir>/tests/mocks/WorkerMock.ts"
  },
  setupFiles: ["<rootDir>/tests/setup/jest.crypto-setup.js"],
};
