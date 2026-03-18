import { describe, expect, it } from "vitest";
import {
  findSellTarget,
  resolveNearestLaneId,
  validatePlacement,
} from "../src/game/systems/buildPlacement";
import type { LaneDefinition, MapObstacle, TrapState, TowerState, Vec3 } from "../src/game/types";

function v3(x: number, z: number): Vec3 {
  return { x, y: 0, z };
}

const towers: TowerState[] = [
  {
    id: "tower-a",
    type: "ballista",
    position: v3(2, 2),
    laneId: "north",
    level: 1,
    attackTimer: 0,
    shotsFired: 0,
    stats: {
      damage: 10,
      range: 5,
      fireRate: 1,
      projectileSpeed: 10,
      splashRadius: 0,
    },
    buffMultiplier: 1,
    upgrades: [],
    health: 100,
    maxHealth: 100,
  },
];

const traps: TrapState[] = [
  {
    id: "trap-a",
    type: "spike-trap",
    position: v3(-2, 1),
    laneId: "south",
    cooldown: 0,
    triggerRadius: 1.2,
    upgrades: [],
    activeZoneTimer: 0,
  },
];

const obstacles: MapObstacle[] = [
  {
    id: "obs-a",
    center: v3(-6, -6),
    radius: 1.8,
    height: 2.4,
    style: "rock",
    blocksGround: true,
    blocksHero: true,
  },
];

describe("build placement rules", () => {
  it("allows valid freeform placement", () => {
    const result = validatePlacement(v3(-8, -8), 250, 80, towers, traps, v3(12, 0), 3.6, 1.25);
    expect(result).toEqual({ canPlace: true, blockReason: null });
  });

  it("rejects placement inside core buffer", () => {
    const result = validatePlacement(v3(11, 0.4), 250, 80, towers, traps, v3(12, 0), 3.6, 1.25);
    expect(result).toEqual({ canPlace: false, blockReason: "core-buffer" });
  });

  it("rejects overlap with existing defenses", () => {
    const result = validatePlacement(v3(2.4, 2.1), 250, 80, towers, traps, v3(12, 0), 3.6, 1.25);
    expect(result).toEqual({ canPlace: false, blockReason: "overlap" });
  });

  it("rejects placement when gold is insufficient", () => {
    const result = validatePlacement(v3(-8, -8), 20, 80, towers, traps, v3(12, 0), 3.6, 1.25);
    expect(result).toEqual({ canPlace: false, blockReason: "insufficient-gold" });
  });

  it("rejects overlap with map obstacles", () => {
    const result = validatePlacement(v3(-6.2, -6), 220, 80, towers, traps, v3(12, 0), 3.6, 1.25, obstacles, 0.55);
    expect(result).toEqual({ canPlace: false, blockReason: "obstacle" });
  });

  it("rejects placement when it would block enemy path", () => {
    const result = validatePlacement(v3(-8, -8), 220, 80, towers, traps, v3(12, 0), 3.6, 1.25, [], 0.55, true);
    expect(result).toEqual({ canPlace: false, blockReason: "blocks-path" });
  });

  it("finds the nearest sell target within radius", () => {
    const target = findSellTarget(v3(-1.95, 1.1), towers, traps, 1.35);
    expect(target?.id).toBe("trap-a");
    expect(target?.kind).toBe("trap");
  });

  it("returns null sell target when no defense is in range", () => {
    const target = findSellTarget(v3(10, -10), towers, traps, 1.35);
    expect(target).toBeNull();
  });

  it("resolves nearest lane by polyline distance", () => {
    const lanes: LaneDefinition[] = [
      {
        id: "north",
        points: [v3(-10, 8), v3(0, 4), v3(12, 0)],
        flyingPoints: [v3(-10, 8), v3(0, 4), v3(12, 0)],
      },
      {
        id: "south",
        points: [v3(-10, -8), v3(0, -4), v3(12, 0)],
        flyingPoints: [v3(-10, -8), v3(0, -4), v3(12, 0)],
      },
    ];

    expect(resolveNearestLaneId(v3(-4, -5), lanes)).toBe("south");
    expect(resolveNearestLaneId(v3(-4, 5), lanes)).toBe("north");
  });
});
