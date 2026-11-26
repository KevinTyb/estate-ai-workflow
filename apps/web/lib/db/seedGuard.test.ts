import { describe, expect, it } from "vitest";
import { checkSeedTarget, parseDatabaseUrl } from "./seedGuard";

const local =
  "postgresql://postgres:postgres@localhost:5432/estate_ai?schema=public";
const remote =
  "postgresql://user:pw@ep-cool-1.eu-west-2.aws.neon.tech/estate_demo?sslmode=require";

describe("parseDatabaseUrl", () => {
  it("reads the host and database name", () => {
    expect(parseDatabaseUrl(remote)).toEqual({
      host: "ep-cool-1.eu-west-2.aws.neon.tech",
      database: "estate_demo",
    });
    expect(parseDatabaseUrl("postgres://u@[::1]:5432/x")).toEqual({
      host: "::1",
      database: "x",
    });
  });

  it("rejects missing or non-Postgres URLs", () => {
    expect(parseDatabaseUrl(undefined)).toBeNull();
    expect(parseDatabaseUrl("not a url")).toBeNull();
    expect(parseDatabaseUrl("mysql://u@localhost/x")).toBeNull();
    expect(parseDatabaseUrl("postgresql://u@localhost")).toBeNull();
  });
});

describe("checkSeedTarget", () => {
  it("allows local and Docker databases", () => {
    expect(checkSeedTarget({ DATABASE_URL: local })).toBeNull();
    expect(
      checkSeedTarget({ DATABASE_URL: "postgresql://p:p@db:5432/estate_ai" }),
    ).toBeNull();
  });

  it("refuses a remote database without confirmation", () => {
    expect(checkSeedTarget({ DATABASE_URL: remote })).toMatch(
      /Refusing to seed "estate_demo".*\n.*SEED_CONFIRM_DATABASE=estate_demo/,
    );
  });

  it("refuses when the confirmation names a different database", () => {
    expect(
      checkSeedTarget({ DATABASE_URL: remote, SEED_CONFIRM_DATABASE: "prod" }),
    ).not.toBeNull();
  });

  it("allows a remote database whose name is confirmed", () => {
    expect(
      checkSeedTarget({
        DATABASE_URL: remote,
        SEED_CONFIRM_DATABASE: "estate_demo",
      }),
    ).toBeNull();
  });

  it("refuses a missing or invalid DATABASE_URL", () => {
    expect(checkSeedTarget({})).toMatch(/DATABASE_URL is missing/);
  });
});
