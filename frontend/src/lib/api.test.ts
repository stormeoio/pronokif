/**
 * api.ts utility functions — unit tests.
 */
import { describe, it, expect } from "vitest";
import { getApiError, getApiStatus, resolveBackendUrl } from "./api";

describe("getApiError", () => {
  it("returns detail from axios error response", () => {
    const error = { response: { data: { detail: "Email déjà utilisé" }, status: 409 } };
    expect(getApiError(error)).toBe("Email déjà utilisé");
  });

  it("returns default fallback when no detail", () => {
    const error = { response: { data: {} } };
    expect(getApiError(error)).toBe("Erreur");
  });

  it("returns custom fallback string", () => {
    const error = { message: "Network Error" };
    expect(getApiError(error, "Connexion impossible")).toBe("Connexion impossible");
  });

  it("returns fallback for plain error objects", () => {
    expect(getApiError(new Error("network"))).toBe("Erreur");
    expect(getApiError({})).toBe("Erreur");
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

describe("resolveBackendUrl", () => {
  it("keeps localhost when the app is also on localhost", () => {
    expect(resolveBackendUrl("http://localhost:8000", "localhost")).toBe("http://localhost:8000");
  });

  it("aligns localhost backend to 127.0.0.1 when the app is opened on 127.0.0.1", () => {
    expect(resolveBackendUrl("http://localhost:8000", "127.0.0.1")).toBe("http://127.0.0.1:8000");
  });

  it("does not rewrite production hosts", () => {
    expect(resolveBackendUrl("https://api.pronokif.com", "pronokif.eu")).toBe(
      "https://api.pronokif.com",
    );
  });
});
