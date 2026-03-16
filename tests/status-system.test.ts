import { describe, expect, it } from "vitest";
import { StatusSystem } from "../src/game/systems/StatusSystem";
import { makeTestState } from "./testState";

describe("status system", () => {
  it("applies burn damage over time", () => {
    const state = makeTestState();
    const statusSystem = new StatusSystem();

    state.enemies.push({
      id: "enemy-1",
      type: "grunt",
      biomeIndex: 0,
      laneId: "north",
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      pathProgress: 0,
      pathIndex: 0,
      isFlying: false,
      isElite: false,
      isBoss: false,
      isDead: false,
      deathProcessed: false,
      bossPhase: 1,
      stats: {
        maxHealth: 100,
        health: 100,
        speed: 1,
        contactDamage: 2,
        bountyGold: 1,
      },
      freezeBuildup: 0,
      statuses: [],
      targetId: null,
    });

    const enemy = state.enemies[0]!;
    statusSystem.addStatus(enemy, {
      type: "burn",
      intensity: 1,
      duration: 2,
      sourceId: "test",
    });

    statusSystem.update(state, 1);
    expect(enemy.stats.health).toBeLessThan(100);
  });
});
