import { describe, expect, it } from "vitest";
import { createDefaultSave, migrateSave } from "../src/game/systems/SaveSystem";

describe("save migration", () => {
  it("returns default for invalid payload", () => {
    const save = migrateSave({ bad: true });
    expect(save.version).toBe(1);
    expect(save.meta.unlockedTowers.length).toBeGreaterThan(0);
  });

  it("preserves valid payload values", () => {
    const base = createDefaultSave();
    base.meta.essence = 321;
    base.settings.masterVolume = 0.45;

    const migrated = migrateSave(base);
    expect(migrated.meta.essence).toBe(321);
    expect(migrated.settings.masterVolume).toBeCloseTo(0.45, 5);
  });

  it("sanitizes malformed unlock arrays and clamped settings", () => {
    const migrated = migrateSave({
      version: 1,
      meta: {
        essence: -44,
        unlockedTowers: ["ballista", "not-a-tower"],
        unlockedAbilities: ["dash", "not-an-ability"],
        unlockedUpgradeIds: ["a", 4, null],
        unlockedDifficultyTier: 999,
      },
      settings: {
        difficultyTier: -2,
        quality: "ultra",
        masterVolume: 9,
      },
      runHistory: [],
    });

    expect(migrated.meta.essence).toBe(0);
    expect(migrated.meta.unlockedTowers).toEqual(["ballista"]);
    expect(migrated.meta.unlockedAbilities).toEqual(["dash"]);
    expect(migrated.meta.unlockedUpgradeIds).toEqual(["a"]);
    expect(migrated.meta.unlockedDifficultyTier).toBeGreaterThanOrEqual(1);
    expect(migrated.settings.difficultyTier).toBeGreaterThanOrEqual(1);
    expect(migrated.settings.masterVolume).toBe(1);
    expect(migrated.settings.quality).toBe("medium");
  });

  it("keeps only valid run history records", () => {
    const migrated = migrateSave({
      version: 1,
      meta: createDefaultSave().meta,
      settings: createDefaultSave().settings,
      runHistory: [
        { endedAt: "2026-01-01T00:00:00.000Z", result: "victory", biomeReached: 2, wavesCleared: 6, essenceGained: 14 },
        { endedAt: "broken", result: "unknown", biomeReached: -1, wavesCleared: "a", essenceGained: -7 },
      ],
    });

    expect(migrated.runHistory).toHaveLength(1);
    expect(migrated.runHistory[0]?.result).toBe("victory");
    expect(migrated.runHistory[0]?.biomeReached).toBeGreaterThanOrEqual(1);
  });
});
