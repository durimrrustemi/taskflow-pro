// Test setup file
const { sequelize } = require('../src/config/database');

// Setup before all tests
beforeAll(async () => {
  // Sync database for tests
  await sequelize.sync({ force: true });
});

// Cleanup after all tests
afterAll(async () => {
  await sequelize.close();
});

// Global test timeout
jest.setTimeout(10000);
