import { describe, expect, it } from "vitest";
import { orderedWaveLanes } from "../src/game/systems/enemyRoutePreview";
import type { BiomeDefinition, LaneDefinition, Vec3, WaveTemplate } from "../src/game/types";

function v3(x: number, z: number): Vec3 {
  return { x, y: 0, z };
}

function lane(id: string): LaneDefinition {
  return {
    id,
    points: [v3(-10, 0), v3(12, 0)],
    flyingPoints: [v3(-10, 4), v3(12, 4)],
  };
}

function wave(id: string, groups: WaveTemplate["groups"]): WaveTemplate {
  return {
    id,
    biome: "test",
    waveNumber: 1,
    groups,
    boss: null,
    modifiers: [],
  };
}

function biome(lanes: LaneDefinition[]): BiomeDefinition {
  return {
    id: "test",
    name: "Test",
    color: "#000000",
    lanes,
    buildNodes: [],
    hazards: [],
    obstacles: [],
    waveTemplates: [],
  };
}

describe("enemy route preview lane selection", () => {
  it("dedupes wave lanes and keeps biome lane ordering", () => {
    const sampleBiome = biome([lane("left"), lane("center"), lane("right")]);
    const template = wave("w1", [
      { enemyType: "grunt", count: 4, spawnInterval: 1, laneId: "right", eliteEvery: 0 },
      { enemyType: "hound", count: 4, spawnInterval: 1, laneId: "left", eliteEvery: 0 },
      { enemyType: "brute", count: 2, spawnInterval: 1, laneId: "right", eliteEvery: 0 },
    ]);

    const ordered = orderedWaveLanes(sampleBiome, template).map((entry) => entry.id);
    expect(ordered).toEqual(["left", "right"]);
  });

  it("falls back to first biome lane when template lanes are missing", () => {
    const sampleBiome = biome([lane("left"), lane("right")]);
    const template = wave("w1", [
      { enemyType: "grunt", count: 3, spawnInterval: 1, laneId: "unknown", eliteEvery: 0 },
    ]);

    const ordered = orderedWaveLanes(sampleBiome, template).map((entry) => entry.id);
    expect(ordered).toEqual(["left"]);
  });

  it("changes selected lanes when wave template changes", () => {
    const sampleBiome = biome([lane("left"), lane("center"), lane("right")]);
    const waveOne = wave("w1", [
      { enemyType: "grunt", count: 3, spawnInterval: 1, laneId: "left", eliteEvery: 0 },
      { enemyType: "hound", count: 3, spawnInterval: 1, laneId: "center", eliteEvery: 0 },
    ]);
    const waveTwo = wave("w2", [
      { enemyType: "brute", count: 4, spawnInterval: 1, laneId: "right", eliteEvery: 0 },
    ]);

    const first = orderedWaveLanes(sampleBiome, waveOne).map((entry) => entry.id);
    const second = orderedWaveLanes(sampleBiome, waveTwo).map((entry) => entry.id);

    expect(first).toEqual(["left", "center"]);
    expect(second).toEqual(["right"]);
  });
});
