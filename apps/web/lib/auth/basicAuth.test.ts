import { describe, expect, it } from "vitest";
import { getDemoAuthMode, isAuthorised } from "./basicAuth";

const credentials = { user: "demo", password: "s3cret:pass" };
const header = (value: string) => `Basic ${btoa(value)}`;

describe("getDemoAuthMode", () => {
  it("protects the app when both credentials are set", () => {
    expect(getDemoAuthMode({ DEMO_USER: "demo", DEMO_PASSWORD: "x" })).toEqual({
      kind: "protected",
      credentials: { user: "demo", password: "x" },
    });
  });

  it("fails closed when only one credential is set, in any environment", () => {
    for (const NODE_ENV of ["development", "production"]) {
      expect(getDemoAuthMode({ NODE_ENV, DEMO_USER: "demo" }).kind).toBe(
        "misconfigured",
      );
      expect(getDemoAuthMode({ NODE_ENV, DEMO_PASSWORD: "x" }).kind).toBe(
        "misconfigured",
      );
    }
    // Whitespace is not a username.
    expect(getDemoAuthMode({ DEMO_USER: "  ", DEMO_PASSWORD: "x" }).kind).toBe(
      "misconfigured",
    );
  });

  it("fails closed in production with no credentials unless public access is explicit", () => {
    expect(getDemoAuthMode({ NODE_ENV: "production" }).kind).toBe(
      "misconfigured",
    );
    expect(
      getDemoAuthMode({ NODE_ENV: "production", ALLOW_PUBLIC_ACCESS: "true" })
        .kind,
    ).toBe("open");
    expect(
      getDemoAuthMode({ NODE_ENV: "production", ALLOW_PUBLIC_ACCESS: "yes" })
        .kind,
    ).toBe("misconfigured");
  });

  it("stays open for local development with no credentials", () => {
    expect(getDemoAuthMode({ NODE_ENV: "development" }).kind).toBe("open");
    expect(getDemoAuthMode({}).kind).toBe("open");
  });
});

describe("isAuthorised", () => {
  it("accepts matching credentials, including a colon in the password", () => {
    expect(isAuthorised(header("demo:s3cret:pass"), credentials)).toBe(true);
  });

  it("rejects missing, malformed or wrong credentials", () => {
    expect(isAuthorised(null, credentials)).toBe(false);
    expect(isAuthorised("Bearer abc", credentials)).toBe(false);
    expect(isAuthorised("Basic %%%", credentials)).toBe(false);
    expect(isAuthorised(header("demo"), credentials)).toBe(false);
    expect(isAuthorised(header("demo:wrong"), credentials)).toBe(false);
    expect(isAuthorised(header("admin:s3cret:pass"), credentials)).toBe(false);
  });
});
