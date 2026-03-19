import type { EnemyLifecycleOutcome, GameMode, TowerType, TrapType } from "../types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeJumpArcHeight(progress: number, peakHeight: number): number {
  if (!Number.isFinite(progress) || !Number.isFinite(peakHeight) || peakHeight <= 0) {
    return 0;
  }
  const clampedProgress = clamp(progress, 0, 1);
  if (clampedProgress <= 0 || clampedProgress >= 1) {
    return 0;
  }
  return Math.sin(Math.PI * clampedProgress) * peakHeight;
}

export const BUILD_HOTKEY_ORDER: Array<TowerType | TrapType> = [
  "ballista",
  "frost-obelisk",
  "bombard",
  "arc-tower",
  "shrine",
  "spike-trap",
  "push-trap",
  "flame-trap",
];

export function canToggleCombatView(mode: GameMode): boolean {
  return mode === "build" || mode === "wave" || mode === "between-biomes";
}

export function nextCombatViewMode(mode: GameMode): GameMode {
  if (!canToggleCombatView(mode)) {
    return mode;
  }
  if (mode === "between-biomes") {
    return "build";
  }
  return mode === "build" ? "wave" : "build";
}

export function shouldAwardEnemyRewards(outcome: EnemyLifecycleOutcome | null): boolean {
  return outcome === "killed";
}

export function computeWitchAuraMultiplier(nearbyWitches: number, perWitchBonus = 0.08, maxMultiplier = 1.4): number {
  if (!Number.isFinite(nearbyWitches) || nearbyWitches <= 0) {
    return 1;
  }
  return clamp(1 + nearbyWitches * perWitchBonus, 1, maxMultiplier);
}

export function computeStatusMoveMultiplier(slowMultiplier: number, hasFreeze: boolean): number {
  if (hasFreeze) {
    return 0;
  }
  if (!Number.isFinite(slowMultiplier)) {
    return 1;
  }
  return clamp(slowMultiplier, 0, 1);
}

export function computeEnemyMoveSpeed(baseSpeed: number, statusMoveMultiplier: number, witchAuraMultiplier: number): number {
  const safeBase = Number.isFinite(baseSpeed) ? Math.max(0, baseSpeed) : 0;
  const safeStatus = Number.isFinite(statusMoveMultiplier) ? Math.max(0, statusMoveMultiplier) : 0;
  const safeAura = Number.isFinite(witchAuraMultiplier) ? Math.max(0, witchAuraMultiplier) : 1;
  return safeBase * safeStatus * safeAura;
}

export function shouldTriggerLaneEcho(enabled: boolean, chance: number, roll: number): boolean {
  if (!enabled) {
    return false;
  }
  if (!Number.isFinite(chance) || chance <= 0) {
    return false;
  }
  const safeRoll = Number.isFinite(roll) ? roll : 1;
  return safeRoll < clamp(chance, 0, 1);
}

export interface DigitHotkeyAction {
  upgradeIndex: number | null;
  buildIndex: number | null;
}

export function resolveDigitHotkeyAction(mode: GameMode, digitHotkey: number | null, maxBuildChoices: number): DigitHotkeyAction {
  if (digitHotkey === null || digitHotkey < 0) {
    return { upgradeIndex: null, buildIndex: null };
  }

  if (mode === "upgrade") {
    return {
      upgradeIndex: digitHotkey < 3 ? digitHotkey : null,
      buildIndex: null,
    };
  }
  if (mode !== "build") {
    return {
      upgradeIndex: null,
      buildIndex: null,
    };
  }

  return {
    upgradeIndex: null,
    buildIndex: digitHotkey < maxBuildChoices ? digitHotkey : null,
  };
}

export interface FinalStandState {
  active: boolean;
  healthRatio: number;
  multiplier: number;
}

export function resolveFinalStandState(
  baseCoreHealth: number,
  baseCoreMaxHealth: number,
  enabled: boolean,
  threshold = 0.3,
  activeMultiplier = 1.22,
): FinalStandState {
  const safeMax = Math.max(1, baseCoreMaxHealth);
  const safeHealth = clamp(baseCoreHealth, 0, safeMax);
  const healthRatio = safeHealth / safeMax;
  const active = enabled && healthRatio <= threshold;
  return {
    active,
    healthRatio,
    multiplier: active ? activeMultiplier : 1,
  };
}
