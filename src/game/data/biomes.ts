import type { BiomeDefinition, BuildNode, LaneDefinition, Vec3, WaveTemplate } from "../types";

function point(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function lane(id: string, points: Vec3[], flyingOffset = 4): LaneDefinition {
  return {
    id,
    points,
    flyingPoints: points.map((p) => ({ x: p.x, y: p.y + flyingOffset, z: p.z })),
  };
}

function node(id: string, x: number, z: number, laneId: string, allowsTower = true, allowsTrap = true): BuildNode {
  return {
    id,
    position: point(x, 0, z),
    laneId,
    allowsTower,
    allowsTrap,
    occupiedBy: null,
  };
}

function wave(id: string, biome: string, waveNumber: number, groups: WaveTemplate["groups"], modifiers: string[], boss: WaveTemplate["boss"] = null): WaveTemplate {
  return {
    id,
    biome,
    waveNumber,
    groups,
    boss,
    modifiers,
  };
}

const ruinedGate: BiomeDefinition = {
  id: "ruined-gate",
  name: "Ruined Gate",
  color: "#ad7d58",
  lanes: [
    lane("north", [point(-22, 0, 16), point(-9, 0, 8), point(0, 0, 1), point(4, 0, -4), point(8, 0, -10), point(11, 0, -16)]),
  ],
  buildNodes: [
    node("rg-1", -16, 11, "north"),
    node("rg-2", -12, 8, "north"),
    node("rg-3", -8, 5, "north"),
    node("rg-4", -3, 2, "north"),
    node("rg-5", 1, -1, "north"),
    node("rg-6", 5, -5, "north"),
    node("rg-7", 8, -9, "north"),
    node("rg-8", 10, -13, "north"),
    node("rg-9", -6, 10, "north", true, false),
    node("rg-10", 2, -8, "north", true, false),
  ],
  hazards: [
    {
      id: "rg-fissure",
      type: "damage-pool",
      center: point(-2, 0, 0),
      radius: 1.7,
      dps: 14,
      slowMultiplier: 1,
    },
  ],
  waveTemplates: [
    wave(
      "rg-w1",
      "ruined-gate",
      1,
      [
        { enemyType: "grunt", count: 14, spawnInterval: 0.9, laneId: "north", eliteEvery: 0 },
        { enemyType: "hound", count: 5, spawnInterval: 1.2, laneId: "north", eliteEvery: 0 },
      ],
      ["intro-pressure"],
    ),
    wave(
      "rg-w2",
      "ruined-gate",
      2,
      [
        { enemyType: "grunt", count: 18, spawnInterval: 0.8, laneId: "north", eliteEvery: 0 },
        { enemyType: "brute", count: 5, spawnInterval: 2.2, laneId: "north", eliteEvery: 4 },
      ],
      ["armored-frontline"],
    ),
    wave(
      "rg-w3",
      "ruined-gate",
      3,
      [
        { enemyType: "hound", count: 14, spawnInterval: 0.65, laneId: "north", eliteEvery: 5 },
        { enemyType: "witch", count: 5, spawnInterval: 2.1, laneId: "north", eliteEvery: 0 },
      ],
      ["support-enemy"],
    ),
    wave(
      "rg-w4",
      "ruined-gate",
      4,
      [
        { enemyType: "brute", count: 8, spawnInterval: 1.3, laneId: "north", eliteEvery: 3 },
        { enemyType: "wisp", count: 8, spawnInterval: 1.0, laneId: "north", eliteEvery: 0 },
      ],
      ["boss-arrival"],
      "boss",
    ),
  ],
};

const frozenPass: BiomeDefinition = {
  id: "frozen-pass",
  name: "Frozen Pass",
  color: "#89a8c9",
  lanes: [
    lane("west", [point(-24, 0, 9), point(-17, 0, 7), point(-8, 0, 4), point(-1, 0, 0), point(4, 0, -5), point(9, 0, -11)]),
    lane("east", [point(-20, 0, -14), point(-13, 0, -11), point(-5, 0, -7), point(1, 0, -2), point(6, 0, 4), point(11, 0, 10)]),
  ],
  buildNodes: [
    node("fp-1", -18, 8, "west"),
    node("fp-2", -13, 6, "west"),
    node("fp-3", -8, 3, "west"),
    node("fp-4", -3, 0, "west"),
    node("fp-5", 2, -4, "west"),
    node("fp-6", 7, -8, "west"),
    node("fp-7", -14, -12, "east"),
    node("fp-8", -9, -9, "east"),
    node("fp-9", -4, -6, "east"),
    node("fp-10", 1, -2, "east"),
    node("fp-11", 6, 2, "east"),
    node("fp-12", 9, 7, "east"),
    node("fp-13", -1, -10, "east", false, true),
    node("fp-14", -5, 8, "west", false, true),
  ],
  hazards: [
    {
      id: "fp-ice-field",
      type: "slow-field",
      center: point(-6, 0, -1),
      radius: 3.1,
      dps: 0,
      slowMultiplier: 0.75,
    },
    {
      id: "fp-frost-field",
      type: "frost-field",
      center: point(3, 0, 3),
      radius: 2.4,
      dps: 8,
      slowMultiplier: 0.8,
    },
  ],
  waveTemplates: [
    wave(
      "fp-w1",
      "frozen-pass",
      1,
      [
        { enemyType: "grunt", count: 12, spawnInterval: 0.9, laneId: "west", eliteEvery: 0 },
        { enemyType: "hound", count: 11, spawnInterval: 0.8, laneId: "east", eliteEvery: 0 },
      ],
      ["split-lanes"],
    ),
    wave(
      "fp-w2",
      "frozen-pass",
      2,
      [
        { enemyType: "brute", count: 8, spawnInterval: 1.7, laneId: "west", eliteEvery: 4 },
        { enemyType: "witch", count: 7, spawnInterval: 1.9, laneId: "east", eliteEvery: 0 },
      ],
      ["support-casters"],
    ),
    wave(
      "fp-w3",
      "frozen-pass",
      3,
      [
        { enemyType: "wisp", count: 18, spawnInterval: 0.75, laneId: "west", eliteEvery: 0 },
        { enemyType: "hound", count: 10, spawnInterval: 0.7, laneId: "east", eliteEvery: 5 },
      ],
      ["air-pressure"],
    ),
    wave(
      "fp-w4",
      "frozen-pass",
      4,
      [
        { enemyType: "juggernaut", count: 5, spawnInterval: 2.4, laneId: "west", eliteEvery: 2 },
        { enemyType: "brute", count: 10, spawnInterval: 1.2, laneId: "east", eliteEvery: 3 },
      ],
      ["elite-crush"],
      "boss",
    ),
  ],
};

const blightMarsh: BiomeDefinition = {
  id: "blight-marsh",
  name: "Blight Marsh",
  color: "#65876a",
  lanes: [
    lane("north", [point(-25, 0, 13), point(-17, 0, 10), point(-10, 0, 7), point(-2, 0, 3), point(4, 0, -1), point(9, 0, -7), point(12, 0, -14)]),
    lane("center", [point(-22, 0, -1), point(-15, 0, -2), point(-8, 0, -2), point(0, 0, -1), point(6, 0, -2), point(11, 0, -5)]),
    lane("south", [point(-23, 0, -15), point(-16, 0, -12), point(-9, 0, -8), point(-1, 0, -4), point(5, 0, 1), point(10, 0, 8), point(13, 0, 15)]),
  ],
  buildNodes: [
    node("bm-1", -19, 11, "north"),
    node("bm-2", -13, 8, "north"),
    node("bm-3", -7, 5, "north"),
    node("bm-4", -1, 2, "north"),
    node("bm-5", 5, -2, "north"),
    node("bm-6", 9, -8, "north"),
    node("bm-7", -17, -3, "center"),
    node("bm-8", -10, -3, "center"),
    node("bm-9", -3, -2, "center"),
    node("bm-10", 3, -2, "center"),
    node("bm-11", 8, -3, "center"),
    node("bm-12", -18, -13, "south"),
    node("bm-13", -12, -10, "south"),
    node("bm-14", -6, -7, "south"),
    node("bm-15", 0, -3, "south"),
    node("bm-16", 6, 2, "south"),
    node("bm-17", 10, 8, "south"),
  ],
  hazards: [
    {
      id: "bm-toxic-pool-1",
      type: "damage-pool",
      center: point(-4, 0, 0),
      radius: 2.7,
      dps: 12,
      slowMultiplier: 0.85,
    },
    {
      id: "bm-toxic-pool-2",
      type: "damage-pool",
      center: point(3, 0, -6),
      radius: 2.2,
      dps: 9,
      slowMultiplier: 0.9,
    },
  ],
  waveTemplates: [
    wave(
      "bm-w1",
      "blight-marsh",
      1,
      [
        { enemyType: "grunt", count: 14, spawnInterval: 0.82, laneId: "north", eliteEvery: 0 },
        { enemyType: "hound", count: 14, spawnInterval: 0.7, laneId: "center", eliteEvery: 0 },
        { enemyType: "wisp", count: 11, spawnInterval: 0.9, laneId: "south", eliteEvery: 0 },
      ],
      ["three-lane-chaos"],
    ),
    wave(
      "bm-w2",
      "blight-marsh",
      2,
      [
        { enemyType: "brute", count: 10, spawnInterval: 1.4, laneId: "north", eliteEvery: 5 },
        { enemyType: "witch", count: 10, spawnInterval: 1.5, laneId: "center", eliteEvery: 0 },
        { enemyType: "hound", count: 16, spawnInterval: 0.7, laneId: "south", eliteEvery: 4 },
      ],
      ["mixed-pressure"],
    ),
    wave(
      "bm-w3",
      "blight-marsh",
      3,
      [
        { enemyType: "juggernaut", count: 6, spawnInterval: 2.0, laneId: "north", eliteEvery: 3 },
        { enemyType: "wisp", count: 14, spawnInterval: 0.8, laneId: "center", eliteEvery: 0 },
        { enemyType: "brute", count: 12, spawnInterval: 1.1, laneId: "south", eliteEvery: 3 },
      ],
      ["elite-surge"],
    ),
    wave(
      "bm-w4",
      "blight-marsh",
      4,
      [
        { enemyType: "hound", count: 18, spawnInterval: 0.62, laneId: "north", eliteEvery: 6 },
        { enemyType: "juggernaut", count: 8, spawnInterval: 1.8, laneId: "center", eliteEvery: 2 },
        { enemyType: "witch", count: 12, spawnInterval: 1.1, laneId: "south", eliteEvery: 4 },
      ],
      ["final-boss-rush"],
      "boss",
    ),
  ],
};

export const biomeSequence: BiomeDefinition[] = [ruinedGate, frozenPass, blightMarsh];
