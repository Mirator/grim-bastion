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
});
