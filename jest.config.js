module.exports = {
    testEnvironment: 'node',
    // Все файлы работают с одной in-memory базой и чистят её после каждого теста,
    // поэтому параллельный запуск ломал бы данные соседних сьютов.
    maxWorkers: 1,
    globalSetup: '<rootDir>/tests/global-setup.js',
    globalTeardown: '<rootDir>/tests/global-teardown.js',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        'config/**/*.js',
        '!src/services/collaboration.mjs'
    ],
    coverageDirectory: 'coverage',
    coverageThreshold: {
        global: { statements: 85, branches: 70, functions: 90, lines: 85 }
    },
    clearMocks: true,
    testTimeout: 30000
};
