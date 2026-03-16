import { describe, expect, it } from "vitest";
import { waveHealthScale } from "../src/game/data/archetypes";

describe("economy and scaling", () => {
  it("matches concept health scale formula", () => {
    const wave = 6;
    const expected = 1 + wave * 0.15;
    expect(waveHealthScale(wave)).toBeCloseTo(expected, 5);
  });
});
