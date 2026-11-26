import { execSync } from "node:child_process";

export default function setup() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/test/.test(url)) {
    throw new Error(
      `Refusing to run integration tests against a non-test database: ${url}`,
    );
  }
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
