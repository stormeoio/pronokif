import { describe, expect, it } from "vitest";
import { auditLocaleResources } from "./audit";

describe("auditLocaleResources", () => {
  it("compares nested locale resources and reports missing keys", () => {
    const audit = auditLocaleResources({
      fr: { auth: { title: "Connexion" }, splash: { logs: ["A", "B"] } },
      en: { auth: { title: "Login" }, splash: { logs: ["A"] } },
    });

    expect(audit.keys).toEqual(["auth.title", "splash.logs.0", "splash.logs.1"]);
    expect(audit.summaries.fr.rate).toBe(100);
    expect(audit.summaries.en.rate).toBe(66.7);
    expect(audit.summaries.en.missingKeys).toEqual(["splash.logs.1"]);
  });
});
