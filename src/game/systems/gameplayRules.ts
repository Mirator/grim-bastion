import type { EnemyLifecycleOutcome, GameMode, ProjectileHitProc, TowerType, TrapType, Vec3, WeaponType } from "../types";

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

function distance2D(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function normalize(direction: Vec3): Vec3 {
  const magnitude = Math.hypot(direction.x, direction.y, direction.z);
  if (magnitude <= 1e-6) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: direction.x / magnitude,
    y: direction.y / magnitude,
    z: direction.z / magnitude,
  };
}

export interface CursorTargetCandidate {
  id: string;
  position: Vec3;
  collisionRadius: number;
  isDead: boolean;
}

export function resolveCursorAimDirection(reticle: Vec3, heroPosition: Vec3, heroFacing: Vec3, minMagnitude = 1e-3): Vec3 {
  const toReticle = {
    x: reticle.x - heroPosition.x,
    y: reticle.y - heroPosition.y,
    z: reticle.z - heroPosition.z,
  };
  if (Math.hypot(toReticle.x, toReticle.y, toReticle.z) > minMagnitude) {
    return normalize(toReticle);
  }

  if (Math.hypot(heroFacing.x, heroFacing.y, heroFacing.z) > minMagnitude) {
    return normalize(heroFacing);
  }

  return { x: 0, y: 0, z: 1 };
}

export function resolveStrictCursorTarget<T extends CursorTargetCandidate>(
  candidates: T[],
  reticle: Vec3,
  heroPosition: Vec3,
  range: number,
  reticleTolerance = 0.25,
): T | null {
  const safeRange = Number.isFinite(range) ? Math.max(0, range) : 0;
  const safeTolerance = Number.isFinite(reticleTolerance) ? Math.max(0, reticleTolerance) : 0;

  let best: T | null = null;
  let bestReticleDistance = Infinity;
  let bestHeroDistance = Infinity;

  for (const candidate of candidates) {
    if (candidate.isDead) {
      continue;
    }
    const heroDistance = distance2D(candidate.position, heroPosition);
    if (heroDistance > safeRange) {
      continue;
    }

    const reticleDistance = distance2D(candidate.position, reticle);
    const reticleLimit = Math.max(0, candidate.collisionRadius + safeTolerance);
    if (reticleDistance > reticleLimit) {
      continue;
    }

    if (
      reticleDistance < bestReticleDistance ||
      (Math.abs(reticleDistance - bestReticleDistance) <= 1e-6 && heroDistance < bestHeroDistance)
    ) {
      best = candidate;
      bestReticleDistance = reticleDistance;
      bestHeroDistance = heroDistance;
    }
  }

  return best;
}

export type HeroProjectileRole = "primary" | "spread-center" | "spread-side" | "mirror";

export function resolveHeroProjectileHitProc(
  weapon: WeaponType,
  projectileRole: HeroProjectileRole,
  options: {
    poisonedAttacks: boolean;
    crit: boolean;
    critLightningEnabled: boolean;
    critLightningDamage: number;
    critLightningChains: number;
  },
): ProjectileHitProc | null {
  const isProcCarrier =
    (weapon === "crossbow" && projectileRole === "primary") || (weapon === "shot-relic" && projectileRole === "spread-center");
  if (!isProcCarrier) {
    return null;
  }

  const canCritLightning =
    options.crit &&
    options.critLightningEnabled &&
    options.critLightningDamage > 0 &&
    options.critLightningChains > 0;
  if (!options.poisonedAttacks && !canCritLightning) {
    return null;
  }

  return {
    applyPoison: options.poisonedAttacks,
    critLightningDamage: canCritLightning ? options.critLightningDamage : 0,
    critLightningChains: canCritLightning ? options.critLightningChains : 0,
  };
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
