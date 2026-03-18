import { describe, expect, it } from "vitest";
import {
  canToggleCombatView,
  computeEnemyMoveSpeed,
  computeStatusMoveMultiplier,
  computeWitchAuraMultiplier,
  nextCombatViewMode,
  resolveDigitHotkeyAction,
  resolveFinalStandState,
  shouldTriggerLaneEcho,
  shouldAwardEnemyRewards,
} from "../src/game/systems/gameplayRules";

describe("gameplay rules", () => {
  it("allows combat view toggle only when a wave is active", () => {
    expect(canToggleCombatView("build", true)).toBe(true);
    expect(canToggleCombatView("wave", true)).toBe(true);
    expect(canToggleCombatView("menu", true)).toBe(false);
    expect(canToggleCombatView("build", false)).toBe(false);
  });

  it("keeps mode unchanged when toggle is invalid", () => {
    expect(nextCombatViewMode("menu", false)).toBe("menu");
    expect(nextCombatViewMode("upgrade", true)).toBe("upgrade");
  });

  it("swaps between build and wave views during active wave", () => {
    expect(nextCombatViewMode("build", true)).toBe("wave");
    expect(nextCombatViewMode("wave", true)).toBe("build");
  });

  it("awards rewards only for killed enemies", () => {
    expect(shouldAwardEnemyRewards("killed")).toBe(true);
    expect(shouldAwardEnemyRewards("escaped")).toBe(false);
    expect(shouldAwardEnemyRewards(null)).toBe(false);
  });

  it("derives movement multiplier from freeze/slow state", () => {
    expect(computeStatusMoveMultiplier(0.6, false)).toBeCloseTo(0.6, 5);
    expect(computeStatusMoveMultiplier(0.6, true)).toBe(0);
    expect(computeStatusMoveMultiplier(5, false)).toBe(1);
  });

  it("caps witch aura multipliers and computes resulting speed", () => {
    const baseSpeed = 2;
    const aura = computeWitchAuraMultiplier(10);
    expect(aura).toBeLessThanOrEqual(1.4);
    expect(computeEnemyMoveSpeed(baseSpeed, 0.5, aura)).toBeGreaterThan(1);
    expect(baseSpeed).toBe(2);
  });

  it("activates final stand multiplier below threshold", () => {
    const inactive = resolveFinalStandState(300, 400, true);
    expect(inactive.active).toBe(false);
    expect(inactive.multiplier).toBe(1);

    const active = resolveFinalStandState(100, 400, true);
    expect(active.active).toBe(true);
    expect(active.multiplier).toBeGreaterThan(1);
  });

  it("triggers lane echo only when enabled and rolled within chance", () => {
    expect(shouldTriggerLaneEcho(false, 0.2, 0.1)).toBe(false);
    expect(shouldTriggerLaneEcho(true, 0.2, 0.25)).toBe(false);
    expect(shouldTriggerLaneEcho(true, 0.2, 0.15)).toBe(true);
  });

  it("routes digit hotkeys to upgrade or build action by mode", () => {
    expect(resolveDigitHotkeyAction("upgrade", 1, 8)).toEqual({ upgradeIndex: 1, buildIndex: null });
    expect(resolveDigitHotkeyAction("upgrade", 5, 8)).toEqual({ upgradeIndex: null, buildIndex: null });
    expect(resolveDigitHotkeyAction("build", 5, 8)).toEqual({ upgradeIndex: null, buildIndex: 5 });
  });
});
