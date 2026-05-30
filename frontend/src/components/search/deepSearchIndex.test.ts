import { describe, expect, it } from "vitest";
import { filterDeepSearchItems, normalizeSearchText, type DeepSearchItem } from "./deepSearchIndex";

const items: DeepSearchItem[] = [
  {
    id: "driver-russell",
    title: "George Russell",
    badge: "RUS",
    subtitle: "Mercedes",
    href: "/driver/russell",
    group: "Pilotes",
    type: "driver",
  },
  {
    id: "race-monaco",
    title: "Grand Prix de Monaco",
    subtitle: "Circuit de Monaco",
    href: "/race/monaco-2026",
    group: "Courses",
    type: "race",
  },
];

describe("deep search index", () => {
  it("normalizes accents and case", () => {
    expect(normalizeSearchText("Écurie FERRARI")).toBe("ecurie ferrari");
  });

  it("finds entities by compact badge and related metadata", () => {
    expect(filterDeepSearchItems(items, "rus")[0]?.title).toBe("George Russell");
    expect(filterDeepSearchItems(items, "circuit monaco")[0]?.title).toBe("Grand Prix de Monaco");
  });
});
