import { describe, expect, it } from "vitest";
import { createUpgradePool } from "../src/game/data/upgrades";
import { UpgradeSystem } from "../src/game/systems/UpgradeSystem";
import { resolveFinalStandState, shouldTriggerLaneEcho } from "../src/game/systems/gameplayRules";
import { makeTestState } from "./testState";

describe("upgrade pool", () => {
  it("contains exactly 72 upgrades", () => {
    const pool = createUpgradePool();
    expect(pool).toHaveLength(72);
  });

  it("contains no duplicate IDs", () => {
    const pool = createUpgradePool();
    const ids = pool.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("applies economy-upgrade-discount as an immediate build-cost reducer", () => {
    const pool = createUpgradePool();
    const upgrade = pool.find((entry) => entry.id === "economy-upgrade-discount");
    const state = makeTestState();
    if (!upgrade) {
      throw new Error("Missing economy-upgrade-discount");
    }

    upgrade.apply(state);
    expect(state.modifiers.towerCostMultiplier).toBeLessThan(1);
    expect(state.modifiers.trapCostMultiplier).toBeLessThan(1);
  });

  it("activates wild final-stand behavior after applying the upgrade", () => {
    const pool = createUpgradePool();
    const upgrade = pool.find((entry) => entry.id === "wild-final-stand");
    const state = makeTestState();
    if (!upgrade) {
      throw new Error("Missing wild-final-stand");
    }

    upgrade.apply(state);
    const snapshot = resolveFinalStandState(40, 200, state.ownedUpgradeIds.has("wild-final-stand"));
    expect(snapshot.active).toBe(true);
    expect(snapshot.multiplier).toBeGreaterThan(1);
  });

  it("activates lane-echo trigger behavior after applying the upgrade", () => {
    const pool = createUpgradePool();
    const upgrade = pool.find((entry) => entry.id === "wild-lane-echo");
    const state = makeTestState();
    if (!upgrade) {
      throw new Error("Missing wild-lane-echo");
    }

    upgrade.apply(state);
    const trigger = shouldTriggerLaneEcho(state.ownedUpgradeIds.has("wild-lane-echo"), 0.5, 0.2);
    expect(trigger).toBe(true);
  });

  it("biases rolls toward matching tags for the current build profile", () => {
    const trials = 220;
    let baselineBallistaHits = 0;
    let affinityBallistaHits = 0;

    for (let seed = 1; seed <= trials; seed += 1) {
      const baselineSystem = new UpgradeSystem(seed);
      const baselineState = makeTestState();
      baselineState.resources.gold = 420;
      baselineState.resources.mana = 80;
      const baselineChoices = baselineSystem.rollChoices(baselineState, 3);
      baselineBallistaHits += baselineChoices.filter((choice) => choice.tags.includes("ballista")).length;

      const affinitySystem = new UpgradeSystem(seed);
      const affinityState = makeTestState();
      affinityState.resources.gold = 420;
      affinityState.resources.mana = 80;
      affinityState.towers.push(
        {
          id: "ballista-1",
          type: "ballista",
          position: { x: -8, y: 0, z: -4 },
          laneId: "north",
          level: 1,
          attackTimer: 0,
          shotsFired: 0,
          stats: { damage: 24, range: 12, fireRate: 1, projectileSpeed: 20, splashRadius: 0 },
          buffMultiplier: 1,
          upgrades: [],
          health: 120,
          maxHealth: 120,
        },
        {
          id: "ballista-2",
          type: "ballista",
          position: { x: -4, y: 0, z: -1 },
          laneId: "north",
          level: 1,
          attackTimer: 0,
          shotsFired: 0,
          stats: { damage: 24, range: 12, fireRate: 1, projectileSpeed: 20, splashRadius: 0 },
          buffMultiplier: 1,
          upgrades: [],
          health: 120,
          maxHealth: 120,
        },
      );
      affinityState.ownedUpgradeIds.add("ballista-piercing-bolts");
      const affinityChoices = affinitySystem.rollChoices(affinityState, 3);
      affinityBallistaHits += affinityChoices.filter((choice) => choice.tags.includes("ballista")).length;
    }

    expect(affinityBallistaHits).toBeGreaterThan(baselineBallistaHits);
    expect(affinityBallistaHits - baselineBallistaHits).toBeGreaterThanOrEqual(4);
  });

  it("keeps wild upgrades rare under affinity weighting", () => {
    const trials = 180;
    let wildPickCount = 0;
    const totalPicks = trials * 3;

    for (let seed = 900; seed < 900 + trials; seed += 1) {
      const system = new UpgradeSystem(seed);
      const state = makeTestState();
      state.resources.gold = 110;
      state.resources.mana = 18;
      state.hero.loadout.weapon = "arc-gauntlet";
      state.hero.loadout.ability1 = "dash";
      state.hero.loadout.ability2 = "overcharge-aura";
      state.towers.push({
        id: "arc-1",
        type: "arc-tower",
        position: { x: -6, y: 0, z: 2 },
        laneId: "north",
        level: 1,
        attackTimer: 0,
        shotsFired: 0,
        stats: { damage: 24, range: 11, fireRate: 1, projectileSpeed: 20, splashRadius: 0 },
        buffMultiplier: 1,
        upgrades: [],
        health: 120,
        maxHealth: 120,
      });
      state.ownedUpgradeIds.add("arc-extended-chain");
      state.ownedUpgradeIds.add("hero-dash-cooldown");
      const choices = system.rollChoices(state, 3);
      wildPickCount += choices.filter((choice) => choice.category === "wild").length;
    }

    expect(wildPickCount).toBeGreaterThan(0);
    expect(wildPickCount).toBeLessThan(totalPicks * 0.25);
  });
});
