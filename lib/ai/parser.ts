import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { CODING_CATEGORIES } from "@/lib/domain/protocol";
import type { CodingCategory, CodingRecord, RankedSource } from "@/lib/domain/schemas";

const aiRankingSchema = z.object({
  rankedSources: z.array(z.string().min(1)).length(5),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

const aiCodingSchema = z.object({
  records: z.array(
    z.object({
      rank: z.number().int().min(1).max(5),
      suggestedCategory: z.enum(CODING_CATEGORIES).nullable(),
      confidence: z.number().min(0).max(1),
      rationale: z.string().min(1),
    }),
  ),
});

export type ParsedRankingResult = {
  rankedSources: RankedSource[];
  confidence: number;
  warnings: string[];
};

const CATEGORY_HINTS: Record<CodingCategory, string[]> = {
  Family: ["family", "mother", "father", "parents", "siblings", "children", "wife", "husband"],
  Friends: ["friends", "friendship", "community", "social circle"],
  Occupation: ["work", "job", "career", "profession", "student", "teacher", "engineer", "occupation"],
  Personality: ["kind", "hardworking", "honest", "independent", "creative", "personality"],
  Hobbies: ["music", "sports", "reading", "art", "gaming", "dance", "hobby", "hobbies"],
  Stereotype: ["latino", "mexican", "puerto rican", "immigrant", "stereotype", "ethnicity", "culture", "heritage"],
};

function normalizeValue(value: string) {
  return value.trim().replace(/^[\d\-\.\)\s]+/, "").replace(/\s+/g, " ");
}

function splitIntoCandidates(input: string) {
  const lineCandidates = input
    .split(/\n+/)
    .map(normalizeValue)
    .filter(Boolean);

  if (lineCandidates.length >= 5) {
    return lineCandidates;
  }

  return input
    .split(/[;,]+/)
    .map(normalizeValue)
    .filter(Boolean);
}

async function parseWithModel(input: string): Promise<ParsedRankingResult | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const result = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: aiRankingSchema,
      prompt: [
        "Parse the participant's ranked identity-source response into exactly five ranked sources.",
        "Do not invent sources.",
        "Return warnings for ambiguity, merged items, or unclear ordering.",
        `Participant response:\n${input}`,
      ].join("\n\n"),
    });

    return {
      rankedSources: result.object.rankedSources.map((text, index) => ({
        rank: index + 1,
        text,
      })),
      confidence: result.object.confidence,
      warnings: result.object.warnings,
    };
  } catch {
    return null;
  }
}

export async function parseRankedSources(input: string): Promise<ParsedRankingResult> {
  const aiResult = await parseWithModel(input);
  if (aiResult) {
    return aiResult;
  }

  const candidates = splitIntoCandidates(input);
  const rankedSources = candidates.slice(0, 5).map((text, index) => ({
    rank: index + 1,
    text,
  }));

  const warnings: string[] = [];
  if (rankedSources.length < 5) {
    warnings.push("Fewer than five sources were detected.");
  }

  const uniqueValues = new Set(rankedSources.map((item) => item.text.toLowerCase()));
  if (uniqueValues.size !== rankedSources.length) {
    warnings.push("Possible duplicate identity sources detected.");
  }

  if (/[\/&]/.test(input)) {
    warnings.push("Some items may contain merged concepts.");
  }

  const confidence = rankedSources.length === 5 && warnings.length === 0 ? 0.85 : 0.55;

  return {
    rankedSources,
    confidence,
    warnings,
  };
}

async function suggestCodingWithModel(
  sources: RankedSource[],
): Promise<Omit<CodingRecord, "subjectId" | "rawSourceText" | "followUpNeeded" | "finalCategory">[] | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: aiCodingSchema,
      prompt: [
        "Assign one advisory category suggestion to each ranked identity source.",
        "Allowed categories: Family, Friends, Occupation, Personality, Hobbies, Stereotype.",
        "Do not create new categories. If uncertain, return null and explain why.",
        JSON.stringify(sources),
      ].join("\n\n"),
    });

    return response.object.records;
  } catch {
    return null;
  }
}

function heuristicCategoryForSource(text: string): {
  category: CodingCategory | null;
  confidence: number;
  rationale: string;
} {
  const normalized = text.toLowerCase();

  for (const [category, hints] of Object.entries(CATEGORY_HINTS) as [
    CodingCategory,
    string[],
  ][]) {
    if (hints.some((hint) => normalized.includes(hint))) {
      return {
        category,
        confidence: category === "Stereotype" ? 0.62 : 0.72,
        rationale: `Keyword match suggests ${category.toLowerCase()} coding.`,
      };
    }
  }

  return {
    category: null,
    confidence: 0.45,
    rationale: "No strong keyword match was found; researcher review is needed.",
  };
}

export async function suggestCodingRecords(
  subjectId: string,
  sources: RankedSource[],
): Promise<CodingRecord[]> {
  const modelRecords = await suggestCodingWithModel(sources);

  if (modelRecords) {
    return sources.map((source, index) => ({
      subjectId,
      rank: source.rank,
      rawSourceText: source.text,
      suggestedCategory: modelRecords[index]?.suggestedCategory ?? null,
      finalCategory: null,
      confidence: modelRecords[index]?.confidence ?? 0.5,
      rationale:
        modelRecords[index]?.rationale ??
        "AI suggestion unavailable; researcher review is needed.",
      followUpNeeded: (modelRecords[index]?.confidence ?? 0.5) < 0.6,
    }));
  }

  return sources.map((source) => {
    const heuristic = heuristicCategoryForSource(source.text);
    return {
      subjectId,
      rank: source.rank,
      rawSourceText: source.text,
      suggestedCategory: heuristic.category,
      finalCategory: null,
      confidence: heuristic.confidence,
      rationale: heuristic.rationale,
      followUpNeeded: heuristic.confidence < 0.6,
    };
  });
}
