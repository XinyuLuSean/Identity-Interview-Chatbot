import { describe, expect, it } from "vitest";

import {
  getCompletionProgress,
  getNextStep,
  validateIdentityResponse,
} from "@/lib/domain/state-machine";

describe("state machine helpers", () => {
  it("advances through the deterministic step sequence", () => {
    expect(getNextStep("intro")).toBe("eligibility");
    expect(getNextStep("eligibility")).toBe("identity_question");
    expect(getNextStep("metadata")).toBe("completed");
  });

  it("tracks participant progress for primary interview steps", () => {
    expect(getCompletionProgress("intro")).toBeLessThan(getCompletionProgress("metadata"));
    expect(getCompletionProgress("completed")).toBe(100);
  });

  it("requires a substantive identity response", () => {
    expect(validateIdentityResponse("Too short")).toBe(false);
    expect(validateIdentityResponse("My family, values, and work shape who I am.")).toBe(true);
  });
});
