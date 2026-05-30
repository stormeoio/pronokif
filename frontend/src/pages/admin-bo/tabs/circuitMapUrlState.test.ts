import { describe, expect, it } from "vitest";
import {
  CIRCUIT_MAP_PARAM,
  CIRCUIT_OWNER_PARAM,
  CIRCUIT_PRIORITY_PARAM,
  CIRCUIT_Q_PARAM,
  CIRCUIT_REVIEW_PARAM,
  CIRCUIT_SOURCE_PARAM,
  buildCircuitMapSearchParams,
  decodeOwnerFilter,
  decodePriorityFilter,
  decodeReviewFilter,
  decodeSourceFilter,
  encodeReviewFilter,
} from "./circuitMapUrlState";

describe("circuitMapUrlState", () => {
  it("encodes the unreviewed status without leaking an empty query value", () => {
    expect(encodeReviewFilter("")).toBe("unreviewed");
    expect(decodeReviewFilter("unreviewed")).toBe("");
    expect(decodeReviewFilter("approved")).toBe("approved");
    expect(decodeReviewFilter("unknown")).toBe("all");
  });

  it("decodes unknown priority filters back to the default inventory", () => {
    expect(decodePriorityFilter("blocked")).toBe("blocked");
    expect(decodePriorityFilter("review")).toBe("review");
    expect(decodePriorityFilter("elsewhere")).toBe("all");
  });

  it("decodes owner and source filters defensively", () => {
    expect(decodeOwnerFilter("mine")).toBe("mine");
    expect(decodeOwnerFilter("unassigned")).toBe("unassigned");
    expect(decodeOwnerFilter("nobody")).toBe("all");
    expect(decodeSourceFilter("admin")).toBe("admin");
    expect(decodeSourceFilter("seed")).toBe("seed");
    expect(decodeSourceFilter("external")).toBe("all");
  });

  it("builds a shareable circuit map admin URL while preserving unrelated params", () => {
    const current = new URLSearchParams("token=keep&tab=dashboard");
    const next = buildCircuitMapSearchParams(current, {
      query: "  Imola ",
      reviewStatus: "",
      priority: "blocked",
      owner: "mine",
      source: "admin",
      selectedKey: "imola",
    });

    expect(next.get("token")).toBe("keep");
    expect(next.get("tab")).toBe("circuitMaps");
    expect(next.get(CIRCUIT_Q_PARAM)).toBe("Imola");
    expect(next.get(CIRCUIT_REVIEW_PARAM)).toBe("unreviewed");
    expect(next.get(CIRCUIT_PRIORITY_PARAM)).toBe("blocked");
    expect(next.get(CIRCUIT_OWNER_PARAM)).toBe("mine");
    expect(next.get(CIRCUIT_SOURCE_PARAM)).toBe("admin");
    expect(next.get(CIRCUIT_MAP_PARAM)).toBe("imola");
  });

  it("removes circuit-specific params when filters return to defaults", () => {
    const current = new URLSearchParams(
      "tab=circuitMaps&circuitQ=Monaco&circuitReview=approved&circuitPriority=done&circuitOwner=mine&circuitSource=admin&circuitMap=monaco",
    );
    const next = buildCircuitMapSearchParams(current, {
      query: "",
      reviewStatus: "all",
      priority: "all",
      owner: "all",
      source: "all",
      selectedKey: null,
    });

    expect(next.get("tab")).toBe("circuitMaps");
    expect(next.has(CIRCUIT_Q_PARAM)).toBe(false);
    expect(next.has(CIRCUIT_REVIEW_PARAM)).toBe(false);
    expect(next.has(CIRCUIT_PRIORITY_PARAM)).toBe(false);
    expect(next.has(CIRCUIT_OWNER_PARAM)).toBe(false);
    expect(next.has(CIRCUIT_SOURCE_PARAM)).toBe(false);
    expect(next.has(CIRCUIT_MAP_PARAM)).toBe(false);
  });
});
