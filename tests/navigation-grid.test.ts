import { describe, expect, it } from "vitest";
import { CORE_WORLD_POSITION } from "../src/game/constants";
import { NavigationGrid } from "../src/game/systems/navigationGrid";
import type { MapObstacle, TowerState, Vec3 } from "../src/game/types";

function v3(x: number, z: number): Vec3 {
  return { x, y: 0, z };
}

function makeTower(id: string, x: number, z: number): TowerState {
  return {
    id,
    type: "ballista",
    position: v3(x, z),
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
    health: 120,
    maxHealth: 120,
  };
}

function makeObstacle(id: string, x: number, z: number, radius: number): MapObstacle {
  return {
    id,
    center: v3(x, z),
    radius,
    height: 2,
    style: "rock",
    blocksGround: true,
    blocksHero: true,
  };
}

describe("navigation grid", () => {
  it("detours around static obstacles for shortest-path flow", () => {
    const nav = new NavigationGrid();
    nav.setStaticObstacles([
      makeObstacle("wall-core", -4, 0, 2.5),
    ]);
    nav.setTowerBlockers([]);

    const next = nav.sampleFlowTarget(v3(-12, 0), CORE_WORLD_POSITION);
    expect(next).not.toBeNull();
    expect(Math.abs(next!.z)).toBeGreaterThan(0.01);
  });

  it("reroutes when tower blockers are updated", () => {
    const nav = new NavigationGrid();
    nav.setStaticObstacles([]);
    nav.setTowerBlockers([]);

    const baseline = nav.sampleFlowTarget(v3(-9, 0), CORE_WORLD_POSITION);
    expect(baseline).not.toBeNull();
    expect(Math.abs(baseline!.z)).toBeLessThan(0.01);

    nav.setTowerBlockers([makeTower("tower-block", -8, 0)]);
    const rerouted = nav.sampleFlowTarget(v3(-9, 0), CORE_WORLD_POSITION);
    expect(rerouted).not.toBeNull();
    expect(Math.abs(rerouted!.z)).toBeGreaterThan(0.01);
  });

  it("detects tower placements that would block all spawn routes", () => {
    const nav = new NavigationGrid();
    const obstacles: MapObstacle[] = [];
    for (let z = -18; z <= 18; z += 2) {
      if (z === 0) {
        continue;
      }
      obstacles.push(makeObstacle(`wall-${z}`, 0, z, 1.1));
    }
    nav.setStaticObstacles(obstacles);
    nav.setTowerBlockers([]);

    const blocks = nav.wouldTowerPlacementBlockPaths(v3(0, 0), [v3(-20, 0)], CORE_WORLD_POSITION);
    expect(blocks).toBe(true);
  });

  it("resolves circle collisions for hero and ground blockers", () => {
    const nav = new NavigationGrid();
    nav.setStaticObstacles([makeObstacle("hero-rock", 0, 0, 1.6)]);
    nav.setTowerBlockers([makeTower("tower-block", 3, 0)]);

    const heroResolved = nav.resolvePositionAgainstBlockers(v3(0.2, 0), 0.45, nav.getHeroCollisionBlockers());
    const heroDist = Math.hypot(heroResolved.x, heroResolved.z);
    expect(heroDist).toBeGreaterThanOrEqual(2.04);

    const groundResolved = nav.resolvePositionAgainstBlockers(v3(3, 0), 0.6, nav.getGroundCollisionBlockers());
    const groundDistToTower = Math.hypot(groundResolved.x - 3, groundResolved.z);
    expect(groundDistToTower).toBeGreaterThanOrEqual(1.44);
  });
});
