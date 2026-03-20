import { describe, expect, it } from "vitest";
import { CORE_REACH_RADIUS, CORE_WORLD_POSITION } from "../src/game/constants";
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

  it("traces a route to core and reroutes when blockers change", () => {
    const nav = new NavigationGrid();
    const start = v3(-12, 0);
    nav.setStaticObstacles([]);
    nav.setTowerBlockers([]);

    const baselinePath = nav.tracePathToCore(start, CORE_WORLD_POSITION, { maxSteps: 220 });
    expect(baselinePath.length).toBeGreaterThan(2);
    const baselineEnd = baselinePath[baselinePath.length - 1]!;
    expect(distanceToCore(baselineEnd)).toBeLessThanOrEqual(CORE_REACH_RADIUS + 1.5);
    const baselineMaxAbsZ = Math.max(...baselinePath.map((point) => Math.abs(point.z)));
    expect(baselineMaxAbsZ).toBeLessThan(0.8);

    nav.setTowerBlockers([makeTower("tower-block", -8, 0)]);
    const reroutedPath = nav.tracePathToCore(start, CORE_WORLD_POSITION, { maxSteps: 220 });
    expect(reroutedPath.length).toBeGreaterThan(2);
    const reroutedEnd = reroutedPath[reroutedPath.length - 1]!;
    expect(distanceToCore(reroutedEnd)).toBeLessThanOrEqual(CORE_REACH_RADIUS + 1.5);
    const reroutedMaxAbsZ = Math.max(...reroutedPath.map((point) => Math.abs(point.z)));
    expect(reroutedMaxAbsZ).toBeGreaterThan(0.8);
  });

  it("caps path tracing safely when no route exists", () => {
    const nav = new NavigationGrid();
    nav.setStaticObstacles([makeObstacle("seal-core", CORE_WORLD_POSITION.x, CORE_WORLD_POSITION.z, 3.5)]);
    nav.setTowerBlockers([]);

    const blockedPath = nav.tracePathToCore(v3(-12, 0), CORE_WORLD_POSITION, { maxSteps: 12 });
    expect(blockedPath.length).toBe(1);
    expect(blockedPath[0]?.x).toBeCloseTo(-12, 5);
    expect(blockedPath[0]?.z).toBeCloseTo(0, 5);
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

  it("resolves circle collisions for hero against obstacles, towers, and core", () => {
    const nav = new NavigationGrid();
    nav.setStaticObstacles([makeObstacle("hero-rock", 0, 0, 1.6)]);
    nav.setTowerBlockers([makeTower("tower-block", 3, 0)]);

    const heroObstacleResolved = nav.resolvePositionAgainstBlockers(v3(-0.2, 0), 0.45, nav.getHeroCollisionBlockers());
    const heroObstacleDist = Math.hypot(heroObstacleResolved.x, heroObstacleResolved.z);
    expect(heroObstacleDist).toBeGreaterThanOrEqual(2.04);

    const heroTowerResolved = nav.resolvePositionAgainstBlockers(v3(3, 0), 0.45, nav.getHeroCollisionBlockers());
    const heroTowerDist = Math.hypot(heroTowerResolved.x - 3, heroTowerResolved.z);
    expect(heroTowerDist).toBeGreaterThanOrEqual(1.3);

    const heroCoreResolved = nav.resolvePositionAgainstBlockers(
      v3(CORE_WORLD_POSITION.x, CORE_WORLD_POSITION.z),
      0.45,
      nav.getHeroCollisionBlockers(),
    );
    const heroCoreDist = Math.hypot(heroCoreResolved.x - CORE_WORLD_POSITION.x, heroCoreResolved.z - CORE_WORLD_POSITION.z);
    expect(heroCoreDist).toBeGreaterThanOrEqual(CORE_REACH_RADIUS + 0.45);
  });

  it("includes core in ground blockers and keeps structure blockers obstacle-free", () => {
    const nav = new NavigationGrid();
    nav.setStaticObstacles([makeObstacle("hero-rock", 0, 0, 1.6)]);
    nav.setTowerBlockers([makeTower("tower-block", 3, 0)]);

    const groundResolvedAtCore = nav.resolvePositionAgainstBlockers(
      v3(CORE_WORLD_POSITION.x, CORE_WORLD_POSITION.z),
      0.6,
      nav.getGroundCollisionBlockers(),
    );
    const groundCoreDist = Math.hypot(
      groundResolvedAtCore.x - CORE_WORLD_POSITION.x,
      groundResolvedAtCore.z - CORE_WORLD_POSITION.z,
    );
    expect(groundCoreDist).toBeGreaterThanOrEqual(CORE_REACH_RADIUS + 0.6);

    const structureBlockers = nav.getStructureCollisionBlockers();
    expect(structureBlockers.some((blocker) => blocker.source === "obstacle")).toBe(false);
    expect(structureBlockers.some((blocker) => blocker.source === "tower" && blocker.id === "tower-block")).toBe(true);
    expect(structureBlockers.some((blocker) => blocker.source === "core")).toBe(true);

    const structureResolvedAtObstacle = nav.resolvePositionAgainstBlockers(v3(0, 0), 0.6, structureBlockers);
    expect(structureResolvedAtObstacle.x).toBeCloseTo(0, 5);
    expect(structureResolvedAtObstacle.z).toBeCloseTo(0, 5);
  });
});

function distanceToCore(position: Vec3): number {
  return Math.hypot(position.x - CORE_WORLD_POSITION.x, position.z - CORE_WORLD_POSITION.z);
}
