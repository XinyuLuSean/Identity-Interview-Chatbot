import { describe, expect, it } from "vitest";

import { parseRankedSources } from "@/lib/ai/parser";
import { validateRankedSources } from "@/lib/domain/state-machine";

describe("parseRankedSources", () => {
  it("parses a numbered list into five ranked sources", async () => {
    const result = await parseRankedSources(
      "1. Family\n2. Career\n3. Personality\n4. Friends\n5. Heritage",
    );

    expect(result.rankedSources).toHaveLength(5);
    expect(result.rankedSources[0]?.text).toBe("Family");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("flags incomplete answers", async () => {
    const result = await parseRankedSources("Family, work, music");
    expect(result.rankedSources).toHaveLength(3);
    expect(result.warnings).toContain("Fewer than five sources were detected.");
  });

  it("parses newline-separated free-text sources into five ranked items", async () => {
    const result = await parseRankedSources(
      [
        "Creci en un pais sudamericano; el gobierno.",
        "El arbol genealogico es una mezcla de raices mexicanas y europeas.",
        "Un grupo de amigos.",
        "La cultura, la personalidad y la forma en que interactuamos con los demas.",
        "Una variedad de alimentos que nos gustan; el origen de la comida.",
      ].join("\n\n"),
    );

    expect(result.rankedSources).toHaveLength(5);
    expect(result.rankedSources[1]?.text).toContain("mezcla");
  });
});

describe("validateRankedSources", () => {
  it("requires five distinct sources", () => {
    expect(
      validateRankedSources([
        { rank: 1, text: "Family" },
        { rank: 2, text: "Family" },
        { rank: 3, text: "Work" },
        { rank: 4, text: "Friends" },
        { rank: 5, text: "Hobbies" },
      ]),
    ).toBe(false);
  });
});
