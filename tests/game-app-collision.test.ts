import { describe, expect, it } from "vitest";
import { HERO_COLLISION_RADIUS } from "../src/game/constants";
import { GameApp } from "../src/game/GameApp";
import { NavigationGrid } from "../src/game/systems/navigationGrid";
import type { EnemyState, MutableGameState } from "../src/game/types";
import { distance2D, v3 } from "../src/game/utils/math";
import { makeTestState } from "./testState";

function makeEnemy(id: string, x: number, z: number): EnemyState {
  return {
    id,
    type: "grunt",
    biomeIndex: 0,
    laneId: "north",
    position: v3(x, 0, z),
    velocity: v3(),
    pathProgress: 0,
    pathIndex: 0,
    isFlying: false,
    isElite: false,
    isBoss: false,
    isDead: false,
    deathProcessed: false,
    deathOutcome: null,
    bossPhase: 1,
    stats: {
      maxHealth: 100,
      health: 100,
      speed: 1,
      contactDamage: 5,
      bountyGold: 10,
    },
    movementSpeedMultiplier: 1,
    collisionRadius: 0.45,
    spawnDistanceToCore: 20,
    lastDistanceToCore: 20,
    freezeBuildup: 0,
    freezePulseTimer: 0,
    thermalFractureTimer: 0,
    statuses: [],
    targetId: null,
  };
}

function createHarness(state: MutableGameState): any {
  const app = Object.create(GameApp.prototype) as any;
  app.state = state;
  app.navigation = new NavigationGrid();
  app.navigation.setStaticObstacles([]);
  app.navigation.setTowerBlockers([]);
  return app;
}

describe("game app body collision behavior", () => {
  it("keeps hero body outside living enemy circles", () => {
    const state = makeTestState();
    state.hero.position = v3(0, 0, 0);
    state.enemies = [makeEnemy("enemy-1", 0.1, 0)];

    const app = createHarness(state);
    const blockers = app.heroBodyCollisionBlockers();
    const resolvedHero = app.navigation.resolvePositionAgainstBlockers(
      state.hero.position,
      HERO_COLLISION_RADIUS,
      blockers,
    );

    expect(distance2D(resolvedHero, state.enemies[0]!.position)).toBeGreaterThanOrEqual(
      HERO_COLLISION_RADIUS + state.enemies[0]!.collisionRadius,
    );
  });

  it("prevents enemies from moving through an alive hero in the same tick", () => {
    const state = makeTestState();
    state.hero.position = v3(0, 0, 0);
    state.hero.alive = true;
    const enemy = makeEnemy("enemy-1", -1, 0);
    state.enemies = [enemy];

    const app = createHarness(state);
    const blockers = app.enemyBodyMovementBlockers(
      enemy.isFlying,
      app.navigation.getGroundCollisionBlockers(),
      app.navigation.getStructureCollisionBlockers(),
    );
    const resolvedEnemy = app.navigation.resolvePositionAgainstBlockers(
      v3(-0.6, 0, 0),
      enemy.collisionRadius,
      blockers,
    );

    expect(resolvedEnemy.x).toBeLessThan(0);
    expect(distance2D(resolvedEnemy, state.hero.position)).toBeGreaterThanOrEqual(
      HERO_COLLISION_RADIUS + enemy.collisionRadius,
    );
  });
});
