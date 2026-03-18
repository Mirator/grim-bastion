import { describe, expect, it } from "vitest";
import { StatusSystem } from "../src/game/systems/StatusSystem";
import type { EnemyState } from "../src/game/types";
import { makeTestState } from "./testState";

function makeEnemy(id: string, x = 0, z = 0): EnemyState {
  return {
    id,
    type: "grunt",
    biomeIndex: 0,
    laneId: "north",
    position: { x, y: 0, z },
    velocity: { x: 0, y: 0, z: 0 },
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
      contactDamage: 2,
      bountyGold: 1,
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

describe("status system", () => {
  it("applies burn damage over time", () => {
    const state = makeTestState();
    const statusSystem = new StatusSystem();
    const enemy = makeEnemy("enemy-1");
    state.enemies.push(enemy);

    statusSystem.addStatus(enemy, {
      type: "burn",
      intensity: 1,
      duration: 2,
      sourceId: "test",
    });

    statusSystem.update(state, 1);
    expect(enemy.stats.health).toBeLessThan(100);
  });

  it("computes movement speed multiplier from slow and freeze", () => {
    const state = makeTestState();
    const statusSystem = new StatusSystem();
    const slowed = makeEnemy("enemy-slow");
    state.enemies.push(slowed);

    statusSystem.addStatus(slowed, {
      type: "slow",
      intensity: 2,
      duration: 2,
      sourceId: "slow-test",
    });
    statusSystem.update(state, 0.2);
    expect(slowed.movementSpeedMultiplier).toBeLessThan(1);

    statusSystem.addStatus(slowed, {
      type: "freeze",
      intensity: 1,
      duration: 1,
      sourceId: "freeze-test",
    });
    statusSystem.update(state, 0.2);
    expect(slowed.movementSpeedMultiplier).toBe(0);
  });

  it("spreads freeze buildup when frost-spreading-freeze is owned", () => {
    const state = makeTestState();
    const statusSystem = new StatusSystem();
    state.ownedUpgradeIds.add("frost-spreading-freeze");

    const source = makeEnemy("enemy-source");
    const nearby = makeEnemy("enemy-nearby", 1.5, 0);
    state.enemies.push(source, nearby);

    statusSystem.addStatus(source, {
      type: "freeze",
      intensity: 1,
      duration: 2,
      sourceId: "source-freeze",
    });

    const before = nearby.freezeBuildup;
    statusSystem.update(state, 0.7);
    expect(nearby.freezeBuildup).toBeGreaterThan(before);
  });

  it("deals extra thermal fracture damage for burning frozen targets", () => {
    const statusSystem = new StatusSystem();

    const baselineState = makeTestState();
    const baselineEnemy = makeEnemy("enemy-baseline");
    baselineState.enemies.push(baselineEnemy);
    statusSystem.addStatus(baselineEnemy, {
      type: "burn",
      intensity: 1,
      duration: 2,
      sourceId: "burn",
    });
    statusSystem.addStatus(baselineEnemy, {
      type: "freeze",
      intensity: 1,
      duration: 2,
      sourceId: "freeze",
    });
    statusSystem.update(baselineState, 1);

    const upgradedState = makeTestState();
    upgradedState.ownedUpgradeIds.add("wild-fire-and-frost");
    const upgradedEnemy = makeEnemy("enemy-upgraded");
    upgradedState.enemies.push(upgradedEnemy);
    statusSystem.addStatus(upgradedEnemy, {
      type: "burn",
      intensity: 1,
      duration: 2,
      sourceId: "burn",
    });
    statusSystem.addStatus(upgradedEnemy, {
      type: "freeze",
      intensity: 1,
      duration: 2,
      sourceId: "freeze",
    });
    statusSystem.update(upgradedState, 1);

    expect(upgradedEnemy.stats.health).toBeLessThan(baselineEnemy.stats.health);
  });

  it("marks enemies as killed when status damage is lethal", () => {
    const state = makeTestState();
    const statusSystem = new StatusSystem();
    const enemy = makeEnemy("enemy-lethal");
    enemy.stats.health = 1;
    state.enemies.push(enemy);

    statusSystem.addStatus(enemy, {
      type: "burn",
      intensity: 2,
      duration: 2,
      sourceId: "burn",
    });
    statusSystem.update(state, 1);

    expect(enemy.isDead).toBe(true);
    expect(enemy.deathOutcome).toBe("killed");
  });
});
