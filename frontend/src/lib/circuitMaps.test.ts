import { describe, expect, it } from "vitest";
import { getCircuitImageUrl, getCircuitMapData } from "./circuitMaps";

describe("circuitMaps", () => {
  it("resolves a rich interactive circuit from an alias", () => {
    const map = getCircuitMapData("Circuit de Monaco");

    expect(map?.key).toBe("monaco");
    expect(map?.trackPath).toContain("M78");
    expect(map?.features.some((feature) => feature.id === "sainte-devote")).toBe(true);
  });

  it("keeps a fallback image for circuits without an interactive map yet", () => {
    expect(getCircuitMapData("Baku")).toBeNull();
    expect(getCircuitImageUrl("Baku")).toContain("Baku_Formula_One_circuit_map");
  });
});
