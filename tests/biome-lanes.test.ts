import { describe, expect, it } from "vitest";
import { CORE_WORLD_POSITION } from "../src/game/constants";
import { biomeSequence } from "../src/game/data/biomes";
import { distance2D } from "../src/game/utils/math";

describe("biome lane invariants", () => {
  it("routes all ground and flying lanes to the bastion core endpoint", () => {
    for (const biome of biomeSequence) {
      for (const lane of biome.lanes) {
        const groundLast = lane.points[lane.points.length - 1];
        const flyingLast = lane.flyingPoints[lane.flyingPoints.length - 1];
        expect(groundLast).toBeDefined();
        expect(flyingLast).toBeDefined();

        expect(groundLast?.x).toBeCloseTo(CORE_WORLD_POSITION.x, 5);
        expect(groundLast?.z).toBeCloseTo(CORE_WORLD_POSITION.z, 5);
        expect(flyingLast?.x).toBeCloseTo(CORE_WORLD_POSITION.x, 5);
        expect(flyingLast?.z).toBeCloseTo(CORE_WORLD_POSITION.z, 5);
      }
    }
  });

  it("defines obstacle layouts while keeping core approach clear", () => {
    for (const biome of biomeSequence) {
      expect(biome.obstacles.length).toBeGreaterThan(0);
      for (const obstacle of biome.obstacles) {
        const clearance = distance2D(obstacle.center, CORE_WORLD_POSITION) - obstacle.radius;
        expect(clearance).toBeGreaterThan(0.9);
      }
    }
  });
});
