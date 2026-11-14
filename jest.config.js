const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Path ke direktori aplikasi Next.js untuk memuat file next.config.js dan .env
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

module.exports = createJestConfig(customJestConfig);