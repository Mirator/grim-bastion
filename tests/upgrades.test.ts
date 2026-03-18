import { describe, expect, it } from "vitest";
import { createUpgradePool } from "../src/game/data/upgrades";
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
});
