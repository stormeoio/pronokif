/**
 * api.ts utility functions — unit tests.
 */
import { describe, it, expect } from "vitest";
import { getApiError, getApiStatus } from "./api";

describe("getApiError", () => {
  it("returns detail from axios error response", () => {
    const error = { response: { data: { detail: "Email already in use" }, status: 409 } };
    expect(getApiError(error)).toBe("Email already in use");
  });

  it("returns default fallback when no detail", () => {
    const error = { response: { data: {} } };
    expect(getApiError(error)).toBe("Error");
  });

  it("returns custom fallback string", () => {
    const error = { message: "Network Error" };
    expect(getApiError(error, "Sign in impossible")).toBe("Sign in impossible");
  });

  it("returns fallback for plain error objects", () => {
    expect(getApiError(new Error("network"))).toBe("Error");
    expect(getApiError({})).toBe("Error");
  });
});

describe("getApiStatus", () => {
  it("returns status code from axios error", () => {
    const error = { response: { status: 404, data: { detail: "Not found" } } };
    expect(getApiStatus(error)).toBe(404);
  });

  it("returns undefined for non-axios errors", () => {
    const error = new Error("something broke");
    expect(getApiStatus(error)).toBeUndefined();
  });

  it("returns undefined when response is missing", () => {
    expect(getApiStatus({})).toBeUndefined();
  });
});
