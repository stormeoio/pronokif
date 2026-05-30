import { describe, it, expect, beforeEach } from "vitest";
import {
  clearPendingJoinCode,
  getPendingJoinCode,
  getPendingJoinPath,
  normalizeJoinCode,
  savePendingJoinCode,
} from "./pendingJoin";

beforeEach(() => {
  localStorage.clear();
});

describe("pending join helpers", () => {
  it("normalizes valid invitation codes", () => {
    expect(normalizeJoinCode(" abc123 ")).toBe("ABC123");
  });

  it("rejects malformed invitation codes", () => {
    expect(normalizeJoinCode("")).toBeNull();
    expect(normalizeJoinCode("ab")).toBeNull();
    expect(normalizeJoinCode("abc-123")).toBeNull();
  });

  it("persists and clears the pending invitation", () => {
    expect(savePendingJoinCode("abc123")).toBe("ABC123");
    expect(getPendingJoinCode()).toBe("ABC123");
    expect(getPendingJoinPath()).toBe("/join/ABC123");

    clearPendingJoinCode();
    expect(getPendingJoinCode()).toBeNull();
  });
});
