export type GameMode =
  | "menu"
  | "build"
  | "wave"
  | "upgrade"
  | "between-biomes"
  | "game-over"
  | "victory";

export type Rarity = "common" | "uncommon" | "rare" | "wild";

export type EnemyType =
  | "grunt"
  | "hound"
  | "brute"
  | "witch"
  | "wisp"
  | "juggernaut"
  | "boss";

export type TowerType = "ballista" | "frost-obelisk" | "bombard" | "arc-tower" | "shrine";

export type TrapType = "spike-trap" | "push-trap" | "flame-trap";

export type WeaponType = "crossbow" | "arc-gauntlet" | "shot-relic";

export type AbilityType =
  | "dash"
  | "explosive-rune"
  | "freezing-pulse"
  | "healing-beacon"
  | "overcharge-aura";

export type StatusType = "burn" | "freeze" | "poison" | "shock" | "slow";

export type UpgradeCategory = "tower" | "hero" | "economy" | "wild";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Resources {
  gold: number;
  mana: number;
  essence: number;
}

export interface HeroStats {
  health: number;
  maxHealth: number;
  attackDamage: number;
  attackSpeed: number;
  critChance: number;
  moveSpeed: number;
}

export interface HeroLoadout {
  weapon: WeaponType;
  ability1: AbilityType;
  ability2: AbilityType;
}

export interface HeroState {
  id: string;
  position: Vec3;
  velocity: Vec3;
  facing: Vec3;
  stats: HeroStats;
  loadout: HeroLoadout;
  alive: boolean;
  respawnTimer: number;
  attackCooldown: number;
  abilityCooldowns: Record<AbilityType, number>;
  invulnerabilityTimer: number;
}

export interface StatusStack {
  type: StatusType;
  intensity: number;
  duration: number;
  sourceId: string;
}

export interface EnemyStats {
  maxHealth: number;
  health: number;
  speed: number;
  contactDamage: number;
  bountyGold: number;
}

export interface EnemyState {
  id: string;
  type: EnemyType;
  biomeIndex: number;
  laneId: string;
  position: Vec3;
  velocity: Vec3;
  pathProgress: number;
  pathIndex: number;
  isFlying: boolean;
  isElite: boolean;
  isBoss: boolean;
  isDead: boolean;
  deathProcessed: boolean;
  bossPhase: number;
  stats: EnemyStats;
  freezeBuildup: number;
  statuses: StatusStack[];
  targetId: string | null;
}

export interface BuildNode {
  id: string;
  position: Vec3;
  laneId: string;
  allowsTower: boolean;
  allowsTrap: boolean;
  occupiedBy: string | null;
}

export interface TowerStats {
  damage: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  splashRadius: number;
}

export interface TowerState {
  id: string;
  type: TowerType;
  position: Vec3;
  laneId: string;
  level: number;
  attackTimer: number;
  shotsFired: number;
  stats: TowerStats;
  buffMultiplier: number;
  upgrades: string[];
  health: number;
  maxHealth: number;
}

export interface TrapState {
  id: string;
  type: TrapType;
  position: Vec3;
  laneId: string;
  cooldown: number;
  triggerRadius: number;
  upgrades: string[];
  activeZoneTimer: number;
}

export type ProjectileSource = "hero" | "tower" | "ability";

export interface ProjectileState {
  id: string;
  source: ProjectileSource;
  ownerId: string;
  type: "bolt" | "arc" | "shot" | "bomb" | "pulse";
  position: Vec3;
  velocity: Vec3;
  damage: number;
  radius: number;
  ttl: number;
  chainRemaining: number;
  targetId: string | null;
  tags: string[];
}

export interface FloatingText {
  id: string;
  position: Vec3;
  text: string;
  color: string;
  ttl: number;
}

export interface WaveGroup {
  enemyType: EnemyType;
  count: number;
  spawnInterval: number;
  laneId: string;
  eliteEvery: number;
}

export interface WaveTemplate {
  id: string;
  biome: string;
  waveNumber: number;
  groups: WaveGroup[];
  boss: EnemyType | null;
  modifiers: string[];
}

export interface LaneDefinition {
  id: string;
  points: Vec3[];
  flyingPoints: Vec3[];
}

export interface HazardZone {
  id: string;
  type: "slow-field" | "damage-pool" | "frost-field";
  center: Vec3;
  radius: number;
  dps: number;
  slowMultiplier: number;
}

export interface BiomeDefinition {
  id: string;
  name: string;
  color: string;
  lanes: LaneDefinition[];
  buildNodes: BuildNode[];
  hazards: HazardZone[];
  waveTemplates: WaveTemplate[];
}

export interface UpgradeContext {
  hero: HeroState;
  towers: TowerState[];
  traps: TrapState[];
  resources: Resources;
  ownedUpgradeIds: Set<string>;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  category: UpgradeCategory;
  rarity: Rarity;
  description: string;
  synergyHint: string;
  tags: string[];
  weight: number;
  compatible: (context: UpgradeContext) => boolean;
  apply: (state: MutableGameState) => void;
}

export interface EnemyArchetype {
  type: EnemyType;
  label: string;
  baseHealth: number;
  baseSpeed: number;
  contactDamage: number;
  bountyGold: number;
  size: number;
  isFlying: boolean;
  eliteBonusHealth: number;
}

export interface TowerArchetype {
  type: TowerType;
  label: string;
  baseCost: number;
  upgradeCost: number;
  sellRefundFactor: number;
  stats: TowerStats;
}

export interface TrapArchetype {
  type: TrapType;
  label: string;
  baseCost: number;
  triggerRadius: number;
  cooldown: number;
}

export interface WeaponArchetype {
  type: WeaponType;
  label: string;
  damageMultiplier: number;
  range: number;
  projectileSpeed: number;
  firePattern: "single" | "chain" | "burst";
}

export interface AbilityArchetype {
  type: AbilityType;
  label: string;
  cooldown: number;
  manaCost: number;
}

export interface WaveRuntimeState {
  active: boolean;
  biomeIndex: number;
  waveIndexInBiome: number;
  globalWaveNumber: number;
  bossSpawned: boolean;
  spawnQueue: Array<{
    group: WaveGroup;
    remaining: number;
    timer: number;
    spawned: number;
  }>;
  enemiesRemainingEstimate: number;
  clearDelay: number;
}

export interface GameSettings {
  difficultyTier: number;
  quality: "low" | "medium" | "high";
  masterVolume: number;
}

export interface SaveGameV1 {
  version: 1;
  createdAt: string;
  updatedAt: string;
  meta: {
    essence: number;
    unlockedTowers: TowerType[];
    unlockedAbilities: AbilityType[];
    unlockedUpgradeIds: string[];
    unlockedDifficultyTier: number;
  };
  settings: GameSettings;
  runHistory: Array<{
    endedAt: string;
    result: "victory" | "defeat";
    biomeReached: number;
    wavesCleared: number;
    essenceGained: number;
  }>;
}

export interface MutableGameState {
  mode: GameMode;
  time: number;
  resources: Resources;
  hero: HeroState;
  enemies: EnemyState[];
  towers: TowerState[];
  traps: TrapState[];
  projectiles: ProjectileState[];
  floatingTexts: FloatingText[];
  buildNodes: BuildNode[];
  selectedBuildType: TowerType | TrapType;
  selectedNodeId: string | null;
  selectedTargetId: string | null;
  currentBiomeIndex: number;
  wave: WaveRuntimeState;
  availableUpgrades: UpgradeDefinition[];
  ownedUpgradeIds: Set<string>;
  baseCoreHealth: number;
  baseCoreMaxHealth: number;
  minimapDirty: boolean;
  settings: GameSettings;
  modifiers: {
    heroDamageMultiplier: number;
    heroAttackSpeedMultiplier: number;
    heroMoveSpeedMultiplier: number;
    towerDamageMultiplier: number;
    towerRangeMultiplier: number;
    towerAttackSpeedMultiplier: number;
    trapDamageMultiplier: number;
    freezeDurationMultiplier: number;
    slowStrengthMultiplier: number;
    shockVulnerabilityBonus: number;
    poisonedAttacks: boolean;
    shockExplosionOnDeath: boolean;
    firePoolsOnBombard: boolean;
    overchargePulseChance: number;
    economyGoldMultiplier: number;
    economyManaOnTrapTrigger: number;
    towerCostMultiplier: number;
    trapCostMultiplier: number;
    allSlowEffectsStack: boolean;
  };
  runStats: {
    kills: number;
    wavesCleared: number;
    bossesDefeated: number;
    goldSpent: number;
    damageDealt: number;
  };
}

export interface RenderTextSnapshot {
  coordinateSystem: string;
  mode: GameMode;
  biome: string;
  wave: {
    biomeIndex: number;
    waveInBiome: number;
    globalWave: number;
    active: boolean;
    enemiesRemaining: number;
  };
  resources: Resources;
  baseCore: {
    health: number;
    maxHealth: number;
  };
  hero: {
    position: Vec3;
    velocity: Vec3;
    health: number;
    maxHealth: number;
    weapon: WeaponType;
    abilityCooldowns: Record<AbilityType, number>;
  };
  enemies: Array<{
    id: string;
    type: EnemyType;
    position: Vec3;
    hp: number;
    maxHp: number;
    laneId: string;
    elite: boolean;
    boss: boolean;
    statuses: Array<{ type: StatusType; intensity: number; duration: number }>;
  }>;
  towers: Array<{
    id: string;
    type: TowerType;
    position: Vec3;
    level: number;
    health: number;
  }>;
  traps: Array<{
    id: string;
    type: TrapType;
    position: Vec3;
    cooldown: number;
  }>;
  camera?: {
    position: Vec3;
    focus: Vec3;
    lockTargetId: string | null;
  };
}
