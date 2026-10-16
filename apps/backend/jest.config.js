/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: 'test/.*\\.(e2e-)?spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  // ESM-only залежності (content-disposition@3 ← @fastify/static@10, cookie@2 ← light-my-request):
  // у Node ≥20.19/22 вони працюють через require(esm), а Jest потребує транспіляції.
  transformIgnorePatterns: [
    '/node_modules/(?!\\.pnpm/(content-disposition|cookie)@|(content-disposition|cookie)/)',
  ],
  moduleNameMapper: {
    '^@inrium/shared$': '<rootDir>/../../packages/shared/src',
  },
  globalSetup: '<rootDir>/test/support/global-setup.ts',
  setupFiles: ['<rootDir>/test/support/env.ts'],
  // Усі тести діляться однією БД — послідовно.
  maxWorkers: 1,
  testTimeout: 60_000,
  // Не залишати «висячих» таймерів/з'єднань непоміченими.
  detectOpenHandles: false,
  forceExit: true,
};
