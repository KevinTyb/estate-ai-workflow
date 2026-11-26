import { describe, expect, it } from "vitest";
import { getDemoCredentials, isAuthorised } from "./basicAuth";

const credentials = { user: "demo", password: "s3cret:pass" };
const header = (value: string) => `Basic ${btoa(value)}`;

describe("demo basic auth", () => {
  it("is off unless both variables are set", () => {
    expect(getDemoCredentials({})).toBeNull();
    expect(getDemoCredentials({ DEMO_USER: "demo" })).toBeNull();
    expect(
      getDemoCredentials({ DEMO_USER: "demo", DEMO_PASSWORD: "x" }),
    ).toEqual({ user: "demo", password: "x" });
  });

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
