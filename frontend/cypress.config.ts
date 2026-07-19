import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    setupNodeEvents(on, config) {
      return config;
    },
    env: {
      apiBaseUrl: 'http://localhost:8000/api/v1'
    },
    supportFile: 'cypress/support/e2e.ts'
  }
});
