import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/estate_ai_test?schema=public";

// Global setup runs in this process, so point it at the test database too.
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Integration tests run against a real Postgres database (never the dev
// one): they truncate every table between tests.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/integration/**/*.int.test.ts"],
    globalSetup: ["tests/integration/globalSetup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL },
    // Tests share one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
