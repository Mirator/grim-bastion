import type {
  AbilityArchetype,
  AbilityType,
  EnemyArchetype,
  EnemyType,
  TowerArchetype,
  TowerType,
  TrapArchetype,
  TrapType,
  WeaponArchetype,
  WeaponType,
} from "../types";

export const enemyArchetypes: Record<EnemyType, EnemyArchetype> = {
  grunt: {
    type: "grunt",
    label: "Grunt",
    baseHealth: 90,
    baseSpeed: 1.8,
    contactDamage: 6,
    bountyGold: 12,
    size: 0.45,
    isFlying: false,
    eliteBonusHealth: 0.75,
  },
  hound: {
    type: "hound",
    label: "Hound",
    baseHealth: 70,
    baseSpeed: 2.9,
    contactDamage: 8,
    bountyGold: 13,
    size: 0.4,
    isFlying: false,
    eliteBonusHealth: 0.65,
  },
  brute: {
    type: "brute",
    label: "Brute",
    baseHealth: 230,
    baseSpeed: 1.15,
    contactDamage: 16,
    bountyGold: 26,
    size: 0.7,
    isFlying: false,
    eliteBonusHealth: 0.95,
  },
  witch: {
    type: "witch",
    label: "Witch",
    baseHealth: 160,
    baseSpeed: 1.45,
    contactDamage: 10,
    bountyGold: 24,
    size: 0.55,
    isFlying: false,
    eliteBonusHealth: 0.85,
  },
  wisp: {
    type: "wisp",
    label: "Wisp",
    baseHealth: 95,
    baseSpeed: 2.2,
    contactDamage: 10,
    bountyGold: 18,
    size: 0.35,
    isFlying: true,
    eliteBonusHealth: 0.7,
  },
  juggernaut: {
    type: "juggernaut",
    label: "Juggernaut",
    baseHealth: 520,
    baseSpeed: 0.95,
    contactDamage: 34,
    bountyGold: 70,
    size: 1.05,
    isFlying: false,
    eliteBonusHealth: 1.2,
  },
  boss: {
    type: "boss",
    label: "Boss",
    baseHealth: 2200,
    baseSpeed: 0.9,
    contactDamage: 46,
    bountyGold: 240,
    size: 1.4,
    isFlying: false,
    eliteBonusHealth: 0,
  },
};

export const towerArchetypes: Record<TowerType, TowerArchetype> = {
  "ballista": {
    type: "ballista",
    label: "Ballista",
    baseCost: 110,
    upgradeCost: 90,
    sellRefundFactor: 0.7,
    stats: {
      damage: 34,
      range: 16,
      fireRate: 1.35,
      projectileSpeed: 32,
      splashRadius: 0,
    },
  },
  "frost-obelisk": {
    type: "frost-obelisk",
    label: "Frost Obelisk",
    baseCost: 120,
    upgradeCost: 92,
    sellRefundFactor: 0.7,
    stats: {
      damage: 12,
      range: 12,
      fireRate: 0.9,
      projectileSpeed: 18,
      splashRadius: 0,
    },
  },
  bombard: {
    type: "bombard",
    label: "Bombard",
    baseCost: 165,
    upgradeCost: 130,
    sellRefundFactor: 0.7,
    stats: {
      damage: 50,
      range: 13,
      fireRate: 0.5,
      projectileSpeed: 20,
      splashRadius: 3.8,
    },
  },
  "arc-tower": {
    type: "arc-tower",
    label: "Arc Tower",
    baseCost: 142,
    upgradeCost: 112,
    sellRefundFactor: 0.7,
    stats: {
      damage: 28,
      range: 11,
      fireRate: 1.2,
      projectileSpeed: 24,
      splashRadius: 0,
    },
  },
  shrine: {
    type: "shrine",
    label: "Shrine",
    baseCost: 150,
    upgradeCost: 118,
    sellRefundFactor: 0.75,
    stats: {
      damage: 0,
      range: 10,
      fireRate: 0,
      projectileSpeed: 0,
      splashRadius: 0,
    },
  },
};

export const trapArchetypes: Record<TrapType, TrapArchetype> = {
  "spike-trap": {
    type: "spike-trap",
    label: "Spike Trap",
    baseCost: 75,
    triggerRadius: 1.2,
    cooldown: 6,
  },
  "push-trap": {
    type: "push-trap",
    label: "Push Trap",
    baseCost: 80,
    triggerRadius: 1.4,
    cooldown: 4,
  },
  "flame-trap": {
    type: "flame-trap",
    label: "Flame Trap",
    baseCost: 86,
    triggerRadius: 1.8,
    cooldown: 5,
  },
};

export const weaponArchetypes: Record<WeaponType, WeaponArchetype> = {
  crossbow: {
    type: "crossbow",
    label: "Crossbow",
    damageMultiplier: 1,
    range: 18,
    projectileSpeed: 40,
    firePattern: "single",
  },
  "arc-gauntlet": {
    type: "arc-gauntlet",
    label: "Arc Gauntlet",
    damageMultiplier: 0.7,
    range: 10,
    projectileSpeed: 34,
    firePattern: "chain",
  },
  "shot-relic": {
    type: "shot-relic",
    label: "Shot Relic",
    damageMultiplier: 0.9,
    range: 11,
    projectileSpeed: 38,
    firePattern: "burst",
  },
};

export const abilityArchetypes: Record<AbilityType, AbilityArchetype> = {
  dash: {
    type: "dash",
    label: "Dash",
    cooldown: 5,
    manaCost: 15,
  },
  "explosive-rune": {
    type: "explosive-rune",
    label: "Explosive Rune",
    cooldown: 10,
    manaCost: 26,
  },
  "freezing-pulse": {
    type: "freezing-pulse",
    label: "Freezing Pulse",
    cooldown: 14,
    manaCost: 30,
  },
  "healing-beacon": {
    type: "healing-beacon",
    label: "Healing Beacon",
    cooldown: 18,
    manaCost: 34,
  },
  "overcharge-aura": {
    type: "overcharge-aura",
    label: "Overcharge Aura",
    cooldown: 20,
    manaCost: 36,
  },
};

export const defaultUnlockedTowers: TowerType[] = ["ballista", "frost-obelisk", "bombard", "arc-tower", "shrine"];
export const defaultUnlockedAbilities: AbilityType[] = [
  "dash",
  "explosive-rune",
  "freezing-pulse",
  "healing-beacon",
  "overcharge-aura",
];

export const allWeapons: WeaponType[] = ["crossbow", "arc-gauntlet", "shot-relic"];

export function waveHealthScale(globalWaveNumber: number): number {
  return 1 + globalWaveNumber * 0.15;
}

export function waveGoldScale(globalWaveNumber: number): number {
  return 1 + globalWaveNumber * 0.1;
}
