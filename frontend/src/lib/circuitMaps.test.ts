import { describe, expect, it } from "vitest";
import { CIRCUIT_MAPS, getCircuitImageUrl, getCircuitMapData } from "./circuitMaps";

describe("circuitMaps", () => {
  it("resolves a rich interactive circuit from an alias", () => {
    const map = getCircuitMapData("Circuit de Monaco");

    expect(map?.key).toBe("monaco");
    expect(map?.trackPath).toContain("M78");
    expect(map?.features.some((feature) => feature.id === "sainte-devote")).toBe(true);
  });

  it("exposes a canonical first corner for every seeded interactive map", () => {
    for (const map of CIRCUIT_MAPS) {
      const firstCornerFeature = map.features.find(
        (feature) => feature.id === map.firstCorner?.hotspotId,
      );

      expect(map.firstCorner?.label.fr, map.key).toBeTruthy();
      expect(map.firstCorner?.label.en, map.key).toBeTruthy();
      expect(firstCornerFeature?.kind, map.key).toBe("corner");
      expect(firstCornerFeature?.turn, map.key).toBe(1);
    }

    expect(getCircuitMapData("Suzuka")?.firstCorner?.hotspotId).toBe("turn-1");
    expect(getCircuitMapData("Silverstone")?.firstCorner?.hotspotId).toBe("abbey");
  });

  it("keeps a fallback image for circuits without an interactive map yet", () => {
    expect(getCircuitMapData("Imola")).toBeNull();
    expect(getCircuitImageUrl("Imola")).toContain("Imola_2009");
  });

  it("resolves Zandvoort as an interactive race-ready map", () => {
    const map = getCircuitMapData("Dutch Grand Prix");

    expect(map?.key).toBe("zandvoort");
    expect(map?.features.some((feature) => feature.id === "tarzan")).toBe(true);
    expect(map?.zones.some((zone) => zone.id === "drs-main")).toBe(true);
  });

  it("resolves the early-season 2026 batch as interactive maps", () => {
    expect(getCircuitMapData("Chinese Grand Prix")?.key).toBe("shanghai");
    expect(getCircuitMapData("Bahrain International Circuit")?.key).toBe("sakhir");
    expect(getCircuitMapData("Saudi Arabian Grand Prix")?.key).toBe("jeddah");
    expect(getCircuitMapData("Miami Grand Prix")?.key).toBe("miami");
  });

  it("resolves the next European race batch as interactive maps", () => {
    expect(getCircuitMapData("Spanish Grand Prix")?.key).toBe("barcelona");
    expect(getCircuitMapData("Circuit Gilles-Villeneuve")?.key).toBe("montreal");
    expect(getCircuitMapData("Spielberg")?.key).toBe("red-bull-ring");
  });

  it("resolves the late-summer street and technical batch as interactive maps", () => {
    expect(getCircuitMapData("Hungarian Grand Prix")?.key).toBe("hungaroring");
    expect(getCircuitMapData("Madring")?.key).toBe("madrid");
    expect(getCircuitMapData("Baku City Circuit")?.key).toBe("baku");
  });

  it("resolves the next flyaway batch as interactive maps", () => {
    expect(getCircuitMapData("Singapore Grand Prix")?.key).toBe("marina-bay");
    expect(getCircuitMapData("Circuit of the Americas")?.key).toBe("cota");
    expect(getCircuitMapData("Mexico City Grand Prix")?.key).toBe("hermanos-rodriguez");
  });

  it("resolves the season finale batch as interactive maps", () => {
    expect(getCircuitMapData("Brazilian Grand Prix")?.key).toBe("interlagos");
    expect(getCircuitMapData("Las Vegas Grand Prix")?.key).toBe("las-vegas");
    expect(getCircuitMapData("Qatar Grand Prix")?.key).toBe("lusail");
    expect(getCircuitMapData("Abu Dhabi Grand Prix")?.key).toBe("yas-marina");
  });
});
