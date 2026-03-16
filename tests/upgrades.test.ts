import { describe, expect, it } from "vitest";
import { createUpgradePool } from "../src/game/data/upgrades";

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
});
