import type { EnemyLifecycleOutcome, GameMode } from "../types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function canToggleCombatView(mode: GameMode, waveActive: boolean): boolean {
  if (!waveActive) {
    return false;
  }
  return mode === "build" || mode === "wave";
}

export function nextCombatViewMode(mode: GameMode, waveActive: boolean): GameMode {
  if (!canToggleCombatView(mode, waveActive)) {
    return mode;
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
