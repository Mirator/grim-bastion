import RAPIER from "@dimforge/rapier3d-compat";

import { AudioManager } from "./audio/AudioManager";
import {
  abilityArchetypes,
  allWeapons,
  enemyArchetypes,
  towerArchetypes,
  trapArchetypes,
  waveGoldScale,
  waveHealthScale,
  weaponArchetypes,
} from "./data/archetypes";
import { biomeSequence } from "./data/biomes";
import {
  ARENA_MAX_X,
  ARENA_MAX_Z,
  ARENA_MIN_X,
  ARENA_MIN_Z,
  CORE_BUILD_BUFFER_RADIUS,
  CORE_REACH_RADIUS,
  CORE_WORLD_POSITION,
  DEFENSE_MIN_SPACING,
  HERO_COLLISION_RADIUS,
  SELL_TARGET_RADIUS,
} from "./constants";
import { Renderer3D } from "./render/Renderer3D";
import { InputController, type InputState } from "./systems/InputController";
import {
  findSellTarget,
  resolveNearestLaneId,
  validatePlacement,
} from "./systems/buildPlacement";
import {
  BUILD_HOTKEY_ORDER,
  canToggleCombatView,
  computeJumpArcHeight,
  computeEnemyMoveSpeed,
  computeWitchAuraMultiplier,
  nextCombatViewMode,
  resolveDigitHotkeyAction,
  resolveFinalStandState,
  shouldTriggerLaneEcho,
  shouldAwardEnemyRewards,
} from "./systems/gameplayRules";
import { buildReticleFrameData, type ReticleFrameData } from "./systems/reticleFrame";
import { loadSave, patchSave } from "./systems/SaveSystem";
import { StatusSystem } from "./systems/StatusSystem";
import { UpgradeSystem } from "./systems/UpgradeSystem";
import { WaveDirector } from "./systems/WaveDirector";
import { NavigationGrid } from "./systems/navigationGrid";
import type {
  AbilityType,
  BuildPlacementPreview,
  EnemyState,
  EnemyType,
  MutableGameState,
  ProjectileState,
  RenderTextSnapshot,
  SaveGameV1,
  TowerState,
  TowerType,
  TrapState,
  TrapType,
  Vec3,
} from "./types";
import {
  add,
  clamp,
  copyVec3,
  dirToYaw,
  distance,
  distance2D,
  length2D,
  mul,
  normalize,
  sub,
  v3,
} from "./utils/math";
import { Random } from "./utils/random";
import { HudUI } from "./ui/HudUI";

const FIXED_DT = 1 / 60;
const MAX_FRAME = 1 / 20;
const MAX_MANA = 100;
const LANE_ECHO_CHANCE = 0.22;
const LANE_ECHO_DAMAGE_MULTIPLIER = 0.55;
const FINAL_STAND_THRESHOLD = 0.3;
const FINAL_STAND_MULTIPLIER = 1.22;
const JUMP_DURATION = 0.42;
const JUMP_PEAK_HEIGHT = 1.05;
const DASH_MOTION_DURATION = 0.3;

function createEmptyPlacementPreview(position: Vec3 = v3()): BuildPlacementPreview {
  return {
    position: copyVec3(position),
    canPlace: false,
    blockReason: null,
    sellTarget: null,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

interface PhysicsHandles {
  world: RAPIER.World;
  heroBody: RAPIER.RigidBody;
  heroCollider: RAPIER.Collider;
  enemyBodies: Map<string, RAPIER.RigidBody>;
}

interface DashMotionState {
  remaining: number;
  velocity: Vec3;
  target: Vec3;
  lightningTrail: boolean;
}

export class GameApp {
  private readonly canvas: HTMLCanvasElement;

  private renderer: Renderer3D;

  private hud: HudUI;

  private input: InputController;

  private audio: AudioManager;

  private statusSystem = new StatusSystem();

  private upgradeSystem = new UpgradeSystem();

  private waveDirector: WaveDirector;

  private save: SaveGameV1;

  private physics: PhysicsHandles;

  private rng = new Random(0x7a3f4d19);

  private state: MutableGameState;

  private currentInput: InputState;

  private reticleFrame: ReticleFrameData;

  private frameHandle = 0;

  private accumulator = 0;

  private previousTime = 0;

  private running = false;

  private idCounter = 0;

  private pendingOverchargeTimer = 0;

  private loadoutCycle = 0;

  private dashMotion: DashMotionState | null = null;

  private pendingDashTrailPulse = false;

  private navigation = new NavigationGrid();

  private navigationBiomeIndex = -1;

  private navigationTowersDirty = true;

  constructor(canvas: HTMLCanvasElement, hudRoot: HTMLElement, renderer: Renderer3D, physics: PhysicsHandles) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.physics = physics;
    this.save = loadSave();

    this.input = new InputController(canvas);
    this.audio = new AudioManager(this.save.settings.masterVolume);

    this.state = this.createInitialState();
    this.renderer.initializeCameraRig(this.state.hero.position, this.state.hero.facing);
    this.currentInput = this.sampleInput();
    this.reticleFrame = buildReticleFrameData(v3(), v3());

    this.waveDirector = new WaveDirector({
      spawnEnemy: (enemyType, laneId, isElite, isBoss) => this.spawnEnemy(enemyType, laneId, isElite, isBoss),
      onWaveCleared: () => this.handleWaveCleared(),
      onBiomeCleared: () => this.handleBiomeCleared(),
      onRunCompleted: () => this.handleRunCompleted(),
    });

    this.hud = new HudUI(hudRoot, {
      onStartRun: () => this.startRun(),
      onStartWave: () => this.startWave(),
      onToggleBuild: () => {
        if (!canToggleCombatView(this.state.mode)) {
          return;
        }
        this.requestCombatViewToggle();
      },
      onSelectBuild: (type) => {
        if (this.state.mode !== "build") {
          return;
        }
        this.state.selectedBuildType = type;
      },
      onPickUpgrade: (index) => this.pickUpgrade(index),
      onSwitchLoadout: () => this.switchLoadout(),
    });

    this.exposeAutomationHooks();
    this.updateReticleFrame(FIXED_DT);
    this.hud.update(this.state);
    this.renderer.render(this.state, FIXED_DT);
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.previousTime = performance.now() / 1000;
    this.frameHandle = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    this.input.dispose();
    this.renderer.dispose();
  }

  private sampleInput(): InputState {
    return this.input.sample(this.canvas.getBoundingClientRect());
  }

  private currentBiome() {
    return biomeSequence[this.state.currentBiomeIndex] ?? biomeSequence[biomeSequence.length - 1]!;
  }

  private markNavigationDirty(): void {
    this.navigationTowersDirty = true;
  }

  private currentGroundSpawnPoints(): Vec3[] {
    const biome = this.currentBiome();
    return biome.lanes
      .map((lane) => lane.points[0] ?? null)
      .filter((entry): entry is Vec3 => entry !== null);
  }

  private ensureNavigationState(): void {
    const biomeChanged = this.navigationBiomeIndex !== this.state.currentBiomeIndex;
    if (biomeChanged) {
      this.navigation.setStaticObstacles(this.currentBiome().obstacles);
      this.navigationBiomeIndex = this.state.currentBiomeIndex;
      this.navigationTowersDirty = true;
    }

    if (this.navigationTowersDirty) {
      this.navigation.setTowerBlockers(this.state.towers);
      this.navigationTowersDirty = false;
    }

    this.navigation.ensureDistanceField(CORE_WORLD_POSITION);
  }

  private loop = (): void => {
    if (!this.running) {
      return;
    }

    const time = performance.now() / 1000;
    const frameDt = Math.min(MAX_FRAME, time - this.previousTime);
    this.previousTime = time;

    this.currentInput = this.sampleInput();
    this.handleGlobalInput(this.currentInput);
    this.renderer.stepCameraRig(this.state.hero.position, this.currentInput.lookDeltaX, this.currentInput.lookDeltaY, frameDt);
    this.accumulator += frameDt;
    while (this.accumulator >= FIXED_DT) {
      this.update(FIXED_DT, this.currentInput);
      this.accumulator -= FIXED_DT;
    }

    this.renderer.render(this.state, frameDt);
    this.hud.update(this.state);

    this.frameHandle = requestAnimationFrame(this.loop);
  };

  advanceTime(ms: number): void {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    const dt = ms / 1000 / steps;
    let lastStepDt = FIXED_DT;
    for (let i = 0; i < steps; i += 1) {
      this.currentInput = this.sampleInput();
      this.handleGlobalInput(this.currentInput);
      this.renderer.stepCameraRig(this.state.hero.position, this.currentInput.lookDeltaX, this.currentInput.lookDeltaY, dt);
      this.update(dt, this.currentInput);
      lastStepDt = dt;
    }
    this.renderer.render(this.state, lastStepDt);
    this.hud.update(this.state);
  }

  private createInitialState(): MutableGameState {
    return {
      mode: "menu",
      time: 0,
      resources: {
        gold: 360,
        mana: 60,
        essence: this.save.meta.essence,
      },
      hero: {
        id: "hero",
        position: v3(8, 0, 0),
        velocity: v3(),
        facing: v3(-1, 0, 0),
        stats: {
          health: 220,
          maxHealth: 220,
          attackDamage: 22,
          attackSpeed: 1.65,
          critChance: 0.08,
          moveSpeed: 5.8,
        },
        loadout: {
          weapon: "crossbow",
          ability1: "explosive-rune",
          ability2: "freezing-pulse",
        },
        alive: true,
        respawnTimer: 0,
        attackCooldown: 0,
        abilityCooldowns: {
          dash: 0,
          "explosive-rune": 0,
          "freezing-pulse": 0,
          "healing-beacon": 0,
          "overcharge-aura": 0,
        },
        invulnerabilityTimer: 0,
        jumpActive: false,
        jumpElapsed: 0,
        jumpDuration: JUMP_DURATION,
        jumpPeakHeight: JUMP_PEAK_HEIGHT,
      },
      enemies: [],
      towers: [],
      traps: [],
      projectiles: [],
      floatingTexts: [],
      placementPreview: createEmptyPlacementPreview(v3(8, 0, 0)),
      selectedBuildType: "ballista",
      selectedTargetId: null,
      currentBiomeIndex: 0,
      wave: {
        active: false,
        biomeIndex: 0,
        waveIndexInBiome: 0,
        globalWaveNumber: 0,
        bossSpawned: false,
        spawnQueue: [],
        enemiesRemainingEstimate: 0,
        clearDelay: 0,
      },
      availableUpgrades: [],
      ownedUpgradeIds: new Set(this.save.meta.unlockedUpgradeIds),
      baseCoreHealth: 420,
      baseCoreMaxHealth: 420,
      minimapDirty: true,
      settings: {
        ...this.save.settings,
      },
      modifiers: {
        heroDamageMultiplier: 1,
        heroAttackSpeedMultiplier: 1,
        heroMoveSpeedMultiplier: 1,
        towerDamageMultiplier: 1,
        towerRangeMultiplier: 1,
        towerAttackSpeedMultiplier: 1,
        trapDamageMultiplier: 1,
        freezeDurationMultiplier: 0,
        slowStrengthMultiplier: 0,
        shockVulnerabilityBonus: 0,
        poisonedAttacks: false,
        shockExplosionOnDeath: false,
        firePoolsOnBombard: false,
        overchargePulseChance: 0,
        economyGoldMultiplier: 1,
        economyManaOnTrapTrigger: 0,
        towerCostMultiplier: 1,
        trapCostMultiplier: 1,
        allSlowEffectsStack: false,
      },
      runStats: {
        kills: 0,
        wavesCleared: 0,
        bossesDefeated: 0,
        goldSpent: 0,
        damageDealt: 0,
      },
    };
  }

  private resetRunState(): void {
    const fresh = this.createInitialState();
    this.state = fresh;
    this.pendingOverchargeTimer = 0;
    this.loadoutCycle = 0;
    this.dashMotion = null;
    this.pendingDashTrailPulse = false;
    this.navigationBiomeIndex = -1;
    this.navigationTowersDirty = true;
    this.renderer.initializeCameraRig(this.state.hero.position, this.state.hero.facing);
    this.updateReticleFrame(FIXED_DT);
    this.syncHeroPhysics();
    this.hud.update(this.state);
  }

  private startRun(): void {
    if (this.state.mode === "wave") {
      return;
    }
    this.resetRunState();
    this.state.mode = "build";
    this.audio.play("wave-start");
  }

  private startWave(): void {
    if (this.state.mode === "menu") {
      this.startRun();
      return;
    }

    if (this.state.mode === "upgrade") {
      return;
    }

    if (this.state.wave.active) {
      return;
    }

    if (this.state.mode === "between-biomes") {
      this.state.mode = "build";
    }

    if (this.state.mode === "build" || this.state.mode === "wave") {
      this.waveDirector.startCurrentWave(this.state);
      this.audio.play("wave-start", 1.1);
    }
  }

  private requestCombatViewToggle(): void {
    this.state.mode = nextCombatViewMode(this.state.mode);
  }

  private handleGlobalInput(input: InputState): void {
    if (input.toggleFullscreen) {
      this.toggleFullscreen();
    }

    if (input.startRun && (this.state.mode === "menu" || this.state.mode === "game-over" || this.state.mode === "victory")) {
      this.startRun();
    }

    if (input.startWave) {
      this.startWave();
    }

    if (input.toggleBuild) {
      if (this.state.mode === "menu" || this.state.mode === "game-over" || this.state.mode === "victory") {
        this.startRun();
      } else if (canToggleCombatView(this.state.mode)) {
        this.requestCombatViewToggle();
      }
    }

    if (input.cycleWeapon) {
      this.cycleWeapon();
    }

    if (input.switchLoadout) {
      this.switchLoadout();
    }

    if (this.state.mode === "build" && input.cycleBuildNext) {
      this.cycleBuildSelection(1);
    }

    if (this.state.mode === "build" && input.cycleBuildPrev) {
      this.cycleBuildSelection(-1);
    }

    const digitAction = resolveDigitHotkeyAction(this.state.mode, input.digitHotkey, BUILD_HOTKEY_ORDER.length);
    if (digitAction.upgradeIndex !== null) {
      this.pickUpgrade(digitAction.upgradeIndex);
    } else if (digitAction.buildIndex !== null) {
      this.selectBuildByIndex(digitAction.buildIndex);
    }

    if (this.state.mode === "build" && input.firePrimary) {
      this.tryPlaceAtReticle();
    }

    if (this.state.mode === "build" && input.fireSecondary) {
      this.sellAtReticle();
    }
  }

  private update(dt: number, input: InputState): void {
    this.state.time += dt;
    this.ensureNavigationState();
    this.updateReticleFrame(dt);
    this.updateHero(dt, input);
    this.updateHeroAbilities(dt, input);
    this.updateShrines(dt);
    this.updateTowers(dt);
    this.updateTraps(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.statusSystem.update(this.state, dt);
    this.applyHazards(dt);
    this.cleanupDeadEnemies();

    if (this.state.wave.active) {
      this.waveDirector.update(this.state, dt);
    }

    this.regenMana(dt);
    this.pendingOverchargeTimer = Math.max(0, this.pendingOverchargeTimer - dt);

    this.syncHeroPhysics();

    this.state.hero.invulnerabilityTimer = Math.max(0, this.state.hero.invulnerabilityTimer - dt);

    for (const floatingText of this.state.floatingTexts) {
      floatingText.ttl -= dt;
      floatingText.position.y += dt * 0.7;
    }
    this.state.floatingTexts = this.state.floatingTexts.filter((entry) => entry.ttl > 0);

    if (this.state.baseCoreHealth <= 0 && this.state.mode !== "game-over" && this.state.mode !== "victory") {
      this.finishRun("defeat");
      this.state.mode = "game-over";
    }
  }

  private regenMana(dt: number): void {
    const regenBoost = this.state.ownedUpgradeIds.has("economy-mana-regen") ? 1.6 : 1;
    this.state.resources.mana = clamp(this.state.resources.mana + dt * 2.1 * regenBoost, 0, MAX_MANA);
  }

  private finalStandMultiplier(): number {
    const snapshot = resolveFinalStandState(
      this.state.baseCoreHealth,
      this.state.baseCoreMaxHealth,
      this.state.ownedUpgradeIds.has("wild-final-stand"),
      FINAL_STAND_THRESHOLD,
      FINAL_STAND_MULTIPLIER,
    );
    return snapshot.multiplier;
  }

  private updateHero(dt: number, input: InputState): void {
    if (!this.state.hero.alive) {
      this.dashMotion = null;
      this.pendingDashTrailPulse = false;
      this.state.hero.respawnTimer -= dt;
      if (this.state.hero.respawnTimer <= 0) {
        this.state.hero.alive = true;
        this.state.hero.stats.health = this.state.hero.stats.maxHealth * 0.6;
        this.state.hero.position = v3(8, 0, 0);
        this.state.hero.velocity = v3();
        this.state.hero.jumpActive = false;
        this.state.hero.jumpElapsed = 0;
      }
      return;
    }

    this.state.hero.attackCooldown = Math.max(0, this.state.hero.attackCooldown - dt);
    (Object.keys(this.state.hero.abilityCooldowns) as AbilityType[]).forEach((ability) => {
      this.state.hero.abilityCooldowns[ability] = Math.max(0, this.state.hero.abilityCooldowns[ability] - dt);
    });

    const movementBasis = this.renderer.getMovementBasis();
    const inputDir = normalize(
      add(
        mul(movementBasis.right, input.moveX),
        mul(movementBasis.forward, input.moveZ),
      ),
    );
    const speed = this.state.hero.stats.moveSpeed * this.state.modifiers.heroMoveSpeedMultiplier * this.finalStandMultiplier();
    const previousPosition = copyVec3(this.state.hero.position);
    if (this.dashMotion) {
      const dashStep = this.advanceDashMotion(dt);
      this.state.hero.position = add(this.state.hero.position, dashStep);
    } else {
      const moveVelocity = mul(inputDir, speed);
      this.state.hero.position = add(this.state.hero.position, mul(moveVelocity, dt));
    }

    this.state.hero.position.x = clamp(this.state.hero.position.x, ARENA_MIN_X, ARENA_MAX_X);
    this.state.hero.position.z = clamp(this.state.hero.position.z, ARENA_MIN_Z, ARENA_MAX_Z);
    this.state.hero.position = this.navigation.resolvePositionAgainstBlockers(
      this.state.hero.position,
      HERO_COLLISION_RADIUS,
      this.navigation.getHeroCollisionBlockers(),
    );
    if (this.pendingDashTrailPulse) {
      this.pendingDashTrailPulse = false;
      this.applyDashLightningTrail();
    }
    if (input.jump && !this.state.hero.jumpActive) {
      this.state.hero.jumpActive = true;
      this.state.hero.jumpElapsed = 0;
    }
    if (this.state.hero.jumpActive) {
      this.state.hero.jumpElapsed += dt;
      const progress = this.state.hero.jumpDuration > 0 ? this.state.hero.jumpElapsed / this.state.hero.jumpDuration : 1;
      if (progress >= 1) {
        this.state.hero.jumpActive = false;
        this.state.hero.jumpElapsed = this.state.hero.jumpDuration;
        this.state.hero.position.y = 0;
      } else {
        this.state.hero.position.y = computeJumpArcHeight(progress, this.state.hero.jumpPeakHeight);
      }
    } else {
      this.state.hero.position.y = 0;
    }
    const invDt = 1 / Math.max(dt, 1e-6);
    this.state.hero.velocity.x = (this.state.hero.position.x - previousPosition.x) * invDt;
    this.state.hero.velocity.y = (this.state.hero.position.y - previousPosition.y) * invDt;
    this.state.hero.velocity.z = (this.state.hero.position.z - previousPosition.z) * invDt;

    const reticle = this.reticleFrame.aimPoint3D;
    const facing = normalize(sub(reticle, this.state.hero.position));
    if (length2D(facing) > 0.001) {
      this.state.hero.facing.x = facing.x;
      this.state.hero.facing.z = facing.z;
    }

    if (this.state.mode !== "build" && input.firePrimary && this.state.hero.attackCooldown <= 0) {
      this.heroAttack(reticle);
    }
  }

  private heroAttack(reticle: Vec3): void {
    const weapon = this.state.hero.loadout.weapon;
    const weaponData = weaponArchetypes[weapon];
    const finalStandMultiplier = this.finalStandMultiplier();
    const attackSpeed = this.state.hero.stats.attackSpeed * this.state.modifiers.heroAttackSpeedMultiplier * finalStandMultiplier;
    this.state.hero.attackCooldown = Math.max(0.04, 1 / attackSpeed);

    const crit = this.rng.next() < this.state.hero.stats.critChance;
    const critMultiplier = crit ? 1.8 : 1;
    const baseDamage =
      this.state.hero.stats.attackDamage * weaponData.damageMultiplier * this.state.modifiers.heroDamageMultiplier * finalStandMultiplier * critMultiplier;

    const target = this.findSoftLockTarget(reticle, weaponData.range);
    if (weapon === "arc-gauntlet") {
      this.fireArcChain(this.state.hero.position, target, baseDamage, 2 + (this.state.ownedUpgradeIds.has("arc-extended-chain") ? 2 : 0));
    } else if (weapon === "shot-relic") {
      for (let i = -2; i <= 2; i += 1) {
        const spreadYaw = dirToYaw(this.state.hero.facing) + i * 0.1;
        const direction = v3(Math.sin(spreadYaw), 0, Math.cos(spreadYaw));
        this.spawnProjectile("hero", this.state.hero.id, this.state.hero.position, direction, {
          type: "shot",
          damage: baseDamage * 0.45,
          speed: weaponData.projectileSpeed,
          ttl: 0.8,
          radius: 0.38,
          targetId: target?.id ?? null,
          chainRemaining: 0,
          tags: ["hero", "shot-relic"],
        });
      }
    } else {
      const direction = normalize(sub(target?.position ?? reticle, this.state.hero.position));
      this.spawnProjectile("hero", this.state.hero.id, this.state.hero.position, direction, {
        type: "bolt",
        damage: baseDamage,
        speed: weaponData.projectileSpeed,
        ttl: 1.1,
        radius: 0.45,
        targetId: target?.id ?? null,
        chainRemaining: this.state.ownedUpgradeIds.has("ballista-piercing-bolts") ? 1 : 0,
        tags: ["hero", "crossbow"],
      });
    }

    if (this.state.modifiers.poisonedAttacks && target) {
      this.statusSystem.addStatus(target, {
        type: "poison",
        intensity: 1,
        duration: 4,
        sourceId: "hero-poison",
      });
    }

    if (crit && this.state.ownedUpgradeIds.has("hero-crit-lightning") && target) {
      this.fireArcChain(target.position, target, baseDamage * 0.45, 1);
    }

    if (this.state.ownedUpgradeIds.has("wild-hero-mirror") && this.rng.next() < 0.2) {
      const direction = normalize(sub(target?.position ?? reticle, this.state.hero.position));
      this.spawnProjectile("hero", this.state.hero.id, this.state.hero.position, direction, {
        type: "bolt",
        damage: baseDamage * 0.6,
        speed: weaponData.projectileSpeed,
        ttl: 0.8,
        radius: 0.4,
        targetId: target?.id ?? null,
        chainRemaining: 0,
        tags: ["hero", "mirror"],
      });
    }

    this.audio.play("hero-fire", 0.98 + this.rng.next() * 0.08);
  }

  private updateHeroAbilities(dt: number, input: InputState): void {
    const ability1 = this.state.hero.loadout.ability1;
    const ability2 = this.state.hero.loadout.ability2;

    if (input.useDash) {
      this.tryCastAbility("dash", dt);
    }
    if (input.useAbility1) {
      this.tryCastAbility(ability1, dt);
    }
    if (input.useAbility2) {
      this.tryCastAbility(ability2, dt);
    }
  }

  private advanceDashMotion(dt: number): Vec3 {
    if (!this.dashMotion) {
      return v3();
    }

    const stepTime = Math.min(dt, this.dashMotion.remaining);
    this.dashMotion.remaining = Math.max(0, this.dashMotion.remaining - stepTime);

    let step = mul(this.dashMotion.velocity, stepTime);
    if (this.dashMotion.remaining <= 0) {
      const expectedEndX = this.state.hero.position.x + step.x;
      const expectedEndZ = this.state.hero.position.z + step.z;
      step = v3(
        step.x + (this.dashMotion.target.x - expectedEndX),
        0,
        step.z + (this.dashMotion.target.z - expectedEndZ),
      );
      if (this.dashMotion.lightningTrail) {
        this.pendingDashTrailPulse = true;
      }
      this.dashMotion = null;
    }

    return step;
  }

  private applyDashLightningTrail(): void {
    for (const enemy of this.state.enemies) {
      if (enemy.isDead) {
        continue;
      }
      if (distance(enemy.position, this.state.hero.position) <= 3.2) {
        this.statusSystem.damageEnemy(this.state, enemy, 18, "dash-lightning");
        this.statusSystem.addStatus(enemy, {
          type: "shock",
          intensity: 1,
          duration: 2,
          sourceId: "dash-lightning",
        });
      }
    }
  }

  private tryCastAbility(ability: AbilityType, dt: number): void {
    const data = abilityArchetypes[ability];
    if (!data || this.state.hero.abilityCooldowns[ability] > 0 || this.state.resources.mana < data.manaCost || !this.state.hero.alive) {
      return;
    }

    const manaEfficiency = this.state.ownedUpgradeIds.has("hero-mana-efficiency") ? 0.8 : 1;
    this.state.resources.mana -= data.manaCost * manaEfficiency;

    let cooldown = data.cooldown;
    if (ability === "dash" && this.state.ownedUpgradeIds.has("hero-dash-cooldown")) {
      cooldown *= 0.65;
    }

    this.state.hero.abilityCooldowns[ability] = cooldown;

    switch (ability) {
      case "dash": {
        const dashDistance = 5.5;
        const currentPosition = copyVec3(this.state.hero.position);
        const rawDestination = add(currentPosition, mul(this.state.hero.facing, dashDistance));
        const destination = v3(
          clamp(rawDestination.x, ARENA_MIN_X, ARENA_MAX_X),
          currentPosition.y,
          clamp(rawDestination.z, ARENA_MIN_Z, ARENA_MAX_Z),
        );
        const dashVector = sub(destination, currentPosition);
        const hasLightningTrail = this.state.ownedUpgradeIds.has("hero-dash-lightning-trail");

        if (distance2D(destination, currentPosition) <= 0.001) {
          this.state.hero.position.x = destination.x;
          this.state.hero.position.z = destination.z;
          if (hasLightningTrail) {
            this.applyDashLightningTrail();
          }
        } else {
          const speed = DASH_MOTION_DURATION > 0 ? 1 / DASH_MOTION_DURATION : 0;
          this.dashMotion = {
            remaining: DASH_MOTION_DURATION,
            velocity: mul(dashVector, speed),
            target: destination,
            lightningTrail: hasLightningTrail,
          };
        }
        this.state.hero.invulnerabilityTimer = Math.max(this.state.hero.invulnerabilityTimer, 0.35);
        break;
      }
      case "explosive-rune": {
        const target = this.reticleFrame.abilityTarget;
        const shockIntensity = this.state.ownedUpgradeIds.has("hero-rune-shock") ? 1.2 : 0.5;
        for (const enemy of this.state.enemies) {
          if (enemy.isDead) {
            continue;
          }
          const dist = distance2D(enemy.position, target);
          if (dist <= 4.5) {
            this.statusSystem.damageEnemy(this.state, enemy, 55 * (1 - dist / 5), "rune-splash");
            this.statusSystem.addStatus(enemy, {
              type: "shock",
              intensity: shockIntensity,
              duration: 3,
              sourceId: "explosive-rune",
            });
          }
        }
        break;
      }
      case "freezing-pulse": {
        const radius = 5.2;
        const duration = 2.2 * (1 + this.state.modifiers.freezeDurationMultiplier);
        for (const enemy of this.state.enemies) {
          if (enemy.isDead) {
            continue;
          }
          const dist = distance2D(enemy.position, this.state.hero.position);
          if (dist <= radius) {
            this.statusSystem.addStatus(enemy, {
              type: "freeze",
              intensity: 1.3,
              duration,
              sourceId: "freezing-pulse",
            });
            this.statusSystem.addStatus(enemy, {
              type: "slow",
              intensity: 1.5,
              duration: 3.2,
              sourceId: "freezing-pulse",
            });
          }
        }
        break;
      }
      case "healing-beacon": {
        const bonus = this.state.ownedUpgradeIds.has("hero-healing-beacon-boost") ? 1.4 : 1;
        this.state.hero.stats.health = clamp(this.state.hero.stats.health + 32 * bonus, 0, this.state.hero.stats.maxHealth);
        for (const tower of this.state.towers) {
          if (distance2D(tower.position, this.state.hero.position) <= 7) {
            tower.health = clamp(tower.health + 42 * bonus, 0, tower.maxHealth);
          }
        }
        break;
      }
      case "overcharge-aura": {
        this.pendingOverchargeTimer = this.state.ownedUpgradeIds.has("hero-overcharge-extension") ? 9 : 6;
        break;
      }
      default:
        break;
    }

    void dt;
  }

  private updateShrines(dt: number): void {
    for (const tower of this.state.towers) {
      tower.buffMultiplier = 1;
    }

    const shrines = this.state.towers.filter((tower) => tower.type === "shrine");
    for (const shrine of shrines) {
      const extraRadius = this.state.ownedUpgradeIds.has("shrine-aura-expansion") ? 3 : 0;
      const auraRadius = 8 + extraRadius + shrine.level * 0.65;
      for (const tower of this.state.towers) {
        if (tower.id === shrine.id) {
          continue;
        }
        const dist = distance2D(tower.position, shrine.position);
        if (dist <= auraRadius) {
          const globalPropagate = this.state.ownedUpgradeIds.has("wild-overcharge-everywhere") ? 0.08 : 0;
          tower.buffMultiplier += 0.18 + shrine.level * 0.04 + globalPropagate;
        }
      }

      if (this.state.modifiers.overchargePulseChance > 0 && this.rng.next() < this.state.modifiers.overchargePulseChance * dt) {
        this.pendingOverchargeTimer = Math.max(this.pendingOverchargeTimer, 2.5);
      }
    }
  }

  private updateTowers(dt: number): void {
    for (const tower of this.state.towers) {
      tower.attackTimer -= dt;
      if (tower.type === "shrine") {
        continue;
      }
      if (tower.attackTimer > 0) {
        continue;
      }

      const stats = tower.stats;
      const finalStandMultiplier = this.finalStandMultiplier();
      const overchargeMultiplier = this.pendingOverchargeTimer > 0 ? 1.25 : 1;
      const fireRate =
        stats.fireRate *
        this.state.modifiers.towerAttackSpeedMultiplier *
        tower.buffMultiplier *
        overchargeMultiplier *
        finalStandMultiplier;
      tower.attackTimer = fireRate > 0 ? 1 / fireRate : 999;

      const range = stats.range * this.state.modifiers.towerRangeMultiplier * (1 + (this.state.ownedUpgradeIds.has("shrine-aura-expansion") ? 0.05 : 0));
      const target = this.findTowerTarget(tower.position, range);
      if (!target) {
        continue;
      }

      const baseDamage =
        stats.damage * this.state.modifiers.towerDamageMultiplier * tower.buffMultiplier * overchargeMultiplier * finalStandMultiplier;

      if (tower.type === "ballista") {
        const eliteBonus = target.isElite ? 1.5 : 1;
        this.spawnProjectile("tower", tower.id, tower.position, normalize(sub(target.position, tower.position)), {
          type: "bolt",
          damage: baseDamage * eliteBonus,
          speed: stats.projectileSpeed,
          ttl: 1.4,
          radius: 0.4,
          targetId: target.id,
          chainRemaining: this.state.ownedUpgradeIds.has("ballista-piercing-bolts") ? 1 : 0,
          tags: ["tower", "ballista"],
        });

        if (this.state.ownedUpgradeIds.has("ballista-double-shot") && tower.shotsFired > 0 && tower.shotsFired % 5 === 0) {
          this.spawnProjectile("tower", tower.id, tower.position, normalize(sub(target.position, tower.position)), {
            type: "bolt",
            damage: baseDamage * 0.8,
            speed: stats.projectileSpeed,
            ttl: 1.1,
            radius: 0.35,
            targetId: target.id,
            chainRemaining: 0,
            tags: ["tower", "ballista", "double"],
          });
        }
      } else if (tower.type === "frost-obelisk") {
        this.spawnProjectile("tower", tower.id, tower.position, normalize(sub(target.position, tower.position)), {
          type: "bolt",
          damage: baseDamage,
          speed: stats.projectileSpeed,
          ttl: 1.6,
          radius: 0.5,
          targetId: target.id,
          chainRemaining: 0,
          tags: ["tower", "frost"],
        });
      } else if (tower.type === "bombard") {
        this.spawnProjectile("tower", tower.id, tower.position, normalize(sub(target.position, tower.position)), {
          type: "bomb",
          damage: baseDamage,
          speed: stats.projectileSpeed,
          ttl: 2.0,
          radius: (this.state.ownedUpgradeIds.has("bombard-expanded-blast") ? 1.6 : 1) * (stats.splashRadius + 0.25 * tower.level),
          targetId: target.id,
          chainRemaining: 0,
          tags: ["tower", "bombard"],
        });
      } else if (tower.type === "arc-tower") {
        this.fireArcChain(tower.position, target, baseDamage, this.state.ownedUpgradeIds.has("arc-extended-chain") ? 4 : 2);
      }

      tower.shotsFired += 1;
      this.audio.play("tower-fire", 0.92 + this.rng.next() * 0.12);

      if (shouldTriggerLaneEcho(this.state.ownedUpgradeIds.has("wild-lane-echo"), LANE_ECHO_CHANCE, this.rng.next())) {
        this.triggerLaneEchoShot(tower, target, range, baseDamage, stats);
      }

      if (this.state.ownedUpgradeIds.has("wild-double-shot-cycle") && tower.shotsFired % 4 === 0) {
        const bonusTarget = this.findTowerTarget(tower.position, range);
        if (bonusTarget) {
          this.spawnProjectile("tower", tower.id, tower.position, normalize(sub(bonusTarget.position, tower.position)), {
            type: "bolt",
            damage: baseDamage * 0.65,
            speed: stats.projectileSpeed,
            ttl: 1,
            radius: 0.4,
            targetId: bonusTarget.id,
            chainRemaining: 0,
            tags: ["tower", "wild-double"],
          });
        }
      }
    }
  }

  private triggerLaneEchoShot(tower: TowerState, primaryTarget: EnemyState, range: number, baseDamage: number, stats: TowerState["stats"]): void {
    const echoTarget = this.findSecondaryTowerTarget(tower.position, range, primaryTarget.id);
    if (!echoTarget) {
      return;
    }

    const damage = baseDamage * LANE_ECHO_DAMAGE_MULTIPLIER;
    const direction = normalize(sub(echoTarget.position, tower.position));

    if (tower.type === "arc-tower") {
      this.fireArcChain(tower.position, echoTarget, damage, this.state.ownedUpgradeIds.has("arc-extended-chain") ? 2 : 1);
      return;
    }

    if (tower.type === "bombard") {
      this.spawnProjectile("tower", tower.id, tower.position, direction, {
        type: "bomb",
        damage,
        speed: stats.projectileSpeed,
        ttl: 1.4,
        radius: (this.state.ownedUpgradeIds.has("bombard-expanded-blast") ? 1.4 : 0.9) * (stats.splashRadius + 0.2 * tower.level),
        targetId: echoTarget.id,
        chainRemaining: 0,
        tags: ["tower", "bombard", "lane-echo"],
      });
      return;
    }

    this.spawnProjectile("tower", tower.id, tower.position, direction, {
      type: "bolt",
      damage,
      speed: stats.projectileSpeed,
      ttl: 1.1,
      radius: 0.36,
      targetId: echoTarget.id,
      chainRemaining: 0,
      tags: ["tower", tower.type, "lane-echo"],
    });
  }

  private updateTraps(dt: number): void {
    for (const trap of this.state.traps) {
      trap.cooldown = Math.max(0, trap.cooldown - dt);
      trap.activeZoneTimer = Math.max(0, trap.activeZoneTimer - dt);

      if (trap.type === "flame-trap" && trap.activeZoneTimer > 0) {
        for (const enemy of this.state.enemies) {
          if (enemy.isDead || enemy.isFlying) {
            continue;
          }
          if (distance2D(enemy.position, trap.position) <= trap.triggerRadius + 1.2) {
            this.statusSystem.addStatus(enemy, {
              type: "burn",
              intensity: 1.1,
              duration: 2,
              sourceId: trap.id,
            });
          }
        }
      }

      if (trap.cooldown > 0) {
        continue;
      }

      const target = this.state.enemies.find(
        (enemy) => !enemy.isDead && !enemy.isFlying && distance2D(enemy.position, trap.position) <= trap.triggerRadius,
      );

      if (!target) {
        continue;
      }

      if (trap.type === "spike-trap") {
        this.statusSystem.damageEnemy(this.state, target, 62 * this.state.modifiers.trapDamageMultiplier, "trap-spike");
      } else if (trap.type === "push-trap") {
        target.pathProgress = Math.max(0, target.pathProgress - 3.2);
        this.statusSystem.addStatus(target, {
          type: "slow",
          intensity: 1,
          duration: 1.2,
          sourceId: trap.id,
        });
      } else if (trap.type === "flame-trap") {
        trap.activeZoneTimer = 3.2;
        this.statusSystem.addStatus(target, {
          type: "burn",
          intensity: 1.4,
          duration: 3,
          sourceId: trap.id,
        });
      }

      trap.cooldown = trap.type === "push-trap" ? 4 : trap.type === "spike-trap" ? 6 : 5;

      if (this.state.modifiers.economyManaOnTrapTrigger > 0) {
        this.state.resources.mana = clamp(this.state.resources.mana + this.state.modifiers.economyManaOnTrapTrigger, 0, MAX_MANA);
      }
    }
  }

  private updateProjectiles(dt: number): void {
    const next: ProjectileState[] = [];

    for (const projectile of this.state.projectiles) {
      projectile.ttl -= dt;
      if (projectile.ttl <= 0) {
        continue;
      }

      projectile.position = add(projectile.position, mul(projectile.velocity, dt));

      let hitEnemy: EnemyState | null = null;
      for (const enemy of this.state.enemies) {
        if (enemy.isDead) {
          continue;
        }
        if (distance2D(enemy.position, projectile.position) <= projectile.radius + (enemy.isBoss ? 1.1 : 0.65)) {
          hitEnemy = enemy;
          break;
        }
      }

      if (!hitEnemy) {
        next.push(projectile);
        continue;
      }

      const damageSource = projectile.type === "bomb" ? "projectile-splash" : "projectile-hit";
      this.statusSystem.damageEnemy(this.state, hitEnemy, projectile.damage, damageSource);
      this.audio.play("enemy-hit", 0.9 + this.rng.next() * 0.2);

      if (projectile.tags.includes("frost")) {
        this.statusSystem.addStatus(hitEnemy, {
          type: "slow",
          intensity: 1.2,
          duration: 2.4,
          sourceId: projectile.ownerId,
        });
        hitEnemy.freezeBuildup += 34;
      }

      if (projectile.tags.includes("tower") && projectile.tags.includes("bombard") && this.state.modifiers.firePoolsOnBombard) {
        for (const enemy of this.state.enemies) {
          if (enemy.isDead) {
            continue;
          }
          if (distance2D(enemy.position, hitEnemy.position) <= projectile.radius + 1.3) {
            this.statusSystem.addStatus(enemy, {
              type: "burn",
              intensity: 1.3,
              duration: 3,
              sourceId: projectile.ownerId,
            });
          }
        }
      }

      if (projectile.type === "bomb") {
        for (const enemy of this.state.enemies) {
          if (enemy.isDead || enemy.id === hitEnemy.id) {
            continue;
          }
          const dist = distance2D(enemy.position, hitEnemy.position);
          if (dist <= projectile.radius) {
            const falloff = Math.max(0.25, 1 - dist / Math.max(0.1, projectile.radius));
            this.statusSystem.damageEnemy(this.state, enemy, projectile.damage * falloff, "projectile-splash");
            if (this.state.ownedUpgradeIds.has("frost-brittle-targets") && enemy.statuses.some((status) => status.type === "freeze")) {
              this.statusSystem.damageEnemy(this.state, enemy, projectile.damage * 0.35, "projectile-frozen-bonus");
            }
          }
        }
      }

      if (projectile.chainRemaining > 0) {
        const bounceTarget = this.findNearestEnemy(hitEnemy.position, 6, new Set([hitEnemy.id]));
        if (bounceTarget) {
          this.spawnProjectile(projectile.source, projectile.ownerId, hitEnemy.position, normalize(sub(bounceTarget.position, hitEnemy.position)), {
            type: projectile.type,
            damage: projectile.damage * 0.68,
            speed: length2D(projectile.velocity),
            ttl: 0.65,
            radius: projectile.radius,
            targetId: bounceTarget.id,
            chainRemaining: projectile.chainRemaining - 1,
            tags: [...projectile.tags],
          });
        }
      }
    }

    this.state.projectiles = next;
  }
  private updateEnemies(dt: number): void {
    const biome = this.currentBiome();
    const laneMap = new Map(biome.lanes.map((lane) => [lane.id, lane]));
    const livingWitches = this.state.enemies.filter((enemy) => !enemy.isDead && enemy.type === "witch");
    const groundBlockers = this.navigation.getGroundCollisionBlockers();

    for (const enemy of this.state.enemies) {
      if (enemy.isDead) {
        continue;
      }

      const lane = laneMap.get(enemy.laneId) ?? biome.lanes[0]!;
      let direction = v3();
      let corePoint = CORE_WORLD_POSITION;

      if (enemy.isFlying) {
        const path = lane.flyingPoints;
        corePoint = path[path.length - 1] ?? CORE_WORLD_POSITION;
        const targetPoint = path[Math.min(path.length - 1, enemy.pathIndex + 1)] ?? corePoint;
        const toTarget = sub(targetPoint, enemy.position);
        direction = normalize(v3(toTarget.x, 0, toTarget.z));
        if (distance2D(enemy.position, targetPoint) <= 0.7) {
          enemy.pathIndex += 1;
          enemy.pathProgress = Math.max(enemy.pathProgress, enemy.pathIndex);
        }
      } else {
        const flowTarget = this.navigation.sampleFlowTarget(enemy.position, CORE_WORLD_POSITION);
        const toTarget = flowTarget ? sub(flowTarget, enemy.position) : sub(CORE_WORLD_POSITION, enemy.position);
        direction = normalize(v3(toTarget.x, 0, toTarget.z));
      }

      let nearbyWitches = 0;
      for (const witch of livingWitches) {
        if (witch.id === enemy.id) {
          continue;
        }
        if (distance2D(enemy.position, witch.position) <= 6) {
          nearbyWitches += 1;
        }
      }
      const witchAuraMultiplier = computeWitchAuraMultiplier(nearbyWitches);
      const speed = computeEnemyMoveSpeed(enemy.stats.speed, enemy.movementSpeedMultiplier, witchAuraMultiplier);
      enemy.velocity = mul(direction, speed);
      const nextPosition = add(enemy.position, mul(enemy.velocity, dt));
      enemy.position = enemy.isFlying
        ? nextPosition
        : this.navigation.resolvePositionAgainstBlockers(nextPosition, enemy.collisionRadius, groundBlockers);

      if (!enemy.isFlying) {
        const sampledDistance = this.navigation.sampleDistanceToCore(enemy.position, CORE_WORLD_POSITION);
        const currentDistance = Number.isFinite(sampledDistance)
          ? sampledDistance
          : distance2D(enemy.position, CORE_WORLD_POSITION);
        enemy.lastDistanceToCore = currentDistance;
        enemy.pathProgress = Math.max(enemy.pathProgress, Math.max(0, enemy.spawnDistanceToCore - currentDistance));
      }

      const reachedCore = distance2D(enemy.position, corePoint) <= CORE_REACH_RADIUS;
      if (reachedCore) {
        this.hitCore(enemy.stats.contactDamage, enemy);
        enemy.isDead = true;
        enemy.deathOutcome = "escaped";
        continue;
      }

      if (enemy.type === "hound" && this.rng.next() < 0.18 * dt && this.rng.next() < 0.12) {
        enemy.pathProgress = Math.max(0, enemy.pathProgress - 0.9);
      }

      if (enemy.isBoss) {
        this.updateBossBehavior(enemy, dt);
      }

      const heroDistance = distance2D(enemy.position, this.state.hero.position);
      if (heroDistance <= 1.2 && this.state.hero.alive && this.state.hero.invulnerabilityTimer <= 0) {
        this.state.hero.stats.health -= enemy.stats.contactDamage * dt;
        if (this.state.hero.stats.health <= 0) {
          this.state.hero.alive = false;
          this.state.hero.respawnTimer = 6;
          this.state.hero.stats.health = 0;
        }
      }
    }
  }

  private updateBossBehavior(enemy: EnemyState, dt: number): void {
    const hpRatio = enemy.stats.health / enemy.stats.maxHealth;
    if (hpRatio < 0.66 && enemy.bossPhase < 2) {
      enemy.bossPhase = 2;
      for (let i = 0; i < 4; i += 1) {
        const lane = biomeSequence[this.state.currentBiomeIndex]?.lanes[i % (biomeSequence[this.state.currentBiomeIndex]?.lanes.length ?? 1)]?.id ?? enemy.laneId;
        this.spawnEnemy("grunt", lane, false, false);
      }
    }

    if (hpRatio < 0.33 && enemy.bossPhase < 3) {
      enemy.bossPhase = 3;
      for (const candidate of this.state.towers) {
        if (distance2D(candidate.position, enemy.position) <= 6) {
          candidate.health = Math.max(1, candidate.health - 35);
        }
      }
    }

    if (enemy.bossPhase >= 2 && this.rng.next() < 0.45 * dt) {
      for (const tower of this.state.towers) {
        if (distance2D(tower.position, enemy.position) <= 4) {
          tower.health = Math.max(1, tower.health - 4);
        }
      }
    }
  }

  private applyHazards(dt: number): void {
    const hazards = biomeSequence[this.state.currentBiomeIndex]?.hazards ?? [];
    for (const hazard of hazards) {
      for (const enemy of this.state.enemies) {
        if (enemy.isDead) {
          continue;
        }
        const dist = distance2D(enemy.position, hazard.center);
        if (dist > hazard.radius) {
          continue;
        }

        if (hazard.slowMultiplier < 1) {
          this.statusSystem.addStatus(enemy, {
            type: "slow",
            intensity: (1 - hazard.slowMultiplier) * 5,
            duration: dt + 0.2,
            sourceId: hazard.id,
          });
        }

        if (hazard.dps > 0) {
          this.statusSystem.damageEnemy(this.state, enemy, hazard.dps * dt, `${hazard.id}-hazard`);
        }

        if (hazard.type === "frost-field") {
          enemy.freezeBuildup += 14 * dt;
        }
      }
    }

    if (this.state.ownedUpgradeIds.has("wild-mana-overflow") && this.state.resources.mana > 95 && this.rng.next() < dt * 0.9) {
      for (const enemy of this.state.enemies) {
        if (enemy.isDead) {
          continue;
        }
        if (distance2D(enemy.position, this.state.hero.position) <= 4.5) {
          this.statusSystem.addStatus(enemy, {
            type: "shock",
            intensity: 1,
            duration: 1.8,
            sourceId: "mana-overflow",
          });
          this.statusSystem.damageEnemy(this.state, enemy, 10, "mana-overflow");
        }
      }
    }
  }

  private cleanupDeadEnemies(): void {
    for (const enemy of this.state.enemies) {
      if (!enemy.isDead || enemy.deathProcessed) {
        continue;
      }

      enemy.deathProcessed = true;
      if (shouldAwardEnemyRewards(enemy.deathOutcome)) {
        const goldGain = enemy.stats.bountyGold * this.state.modifiers.economyGoldMultiplier * waveGoldScale(this.state.wave.globalWaveNumber);
        this.state.resources.gold += goldGain;
        this.state.resources.essence += enemy.isBoss ? 20 : enemy.isElite ? 3 : 1;

        if (enemy.isElite && (this.state.ownedUpgradeIds.has("economy-gold-elite") || this.state.ownedUpgradeIds.has("economy-gold-flow-2"))) {
          this.state.resources.gold += 30;
        }

        if (enemy.isBoss) {
          this.state.runStats.bossesDefeated += 1;
          this.audio.play("boss-intro", 0.7);
          if (this.state.ownedUpgradeIds.has("economy-boss-bounty")) {
            this.state.resources.gold += 120;
            this.state.resources.mana = clamp(this.state.resources.mana + 35, 0, MAX_MANA);
          }
        }

        if (this.state.ownedUpgradeIds.has("economy-combo-dividend") && this.state.runStats.kills % 5 === 0) {
          this.state.resources.gold += 18;
        }

        if (this.state.ownedUpgradeIds.has("economy-essence-bonus") && (enemy.isElite || enemy.isBoss)) {
          this.state.resources.essence += enemy.isBoss ? 15 : 2;
        }

        if (enemy.type === "juggernaut") {
          this.applyJuggernautDeathShockwave(enemy);
        }

        this.audio.play("enemy-death", 0.92 + this.rng.next() * 0.2);
      }
    }

    this.state.enemies = this.state.enemies.filter((enemy) => !(enemy.isDead && enemy.deathProcessed && this.state.time % 0.35 < 0.03));
    for (const [id, body] of this.physics.enemyBodies.entries()) {
      if (!this.state.enemies.some((enemy) => enemy.id === id && !enemy.isDead)) {
        this.physics.world.removeRigidBody(body);
        this.physics.enemyBodies.delete(id);
      }
    }
  }

  private applyJuggernautDeathShockwave(enemy: EnemyState): void {
    for (const tower of this.state.towers) {
      if (distance2D(tower.position, enemy.position) <= 4.5) {
        tower.health = Math.max(1, tower.health - 20);
      }
    }
  }

  private hitCore(amount: number, enemy: EnemyState): void {
    this.state.baseCoreHealth = Math.max(0, this.state.baseCoreHealth - amount);
    if (enemy.type === "juggernaut") {
      this.state.baseCoreHealth = Math.max(0, this.state.baseCoreHealth - 8);
    }
  }

  private spawnEnemy(enemyType: EnemyType, laneId: string, isElite: boolean, isBoss: boolean): void {
    const biome = this.currentBiome();
    const lane = biome.lanes.find((entry) => entry.id === laneId) ?? biome.lanes[0]!;
    const archetype = enemyArchetypes[enemyType];
    const scale = waveHealthScale(this.state.wave.globalWaveNumber);
    const eliteMultiplier = isElite ? 1 + archetype.eliteBonusHealth : 1;
    const id = this.nextId(`enemy-${enemyType}`);

    const spawnPoint = archetype.isFlying ? lane.flyingPoints[0] : lane.points[0];
    this.ensureNavigationState();
    const sampledSpawnDistance = archetype.isFlying
      ? distance2D(spawnPoint, CORE_WORLD_POSITION)
      : this.navigation.sampleDistanceToCore(spawnPoint, CORE_WORLD_POSITION);
    const spawnDistance = Number.isFinite(sampledSpawnDistance)
      ? sampledSpawnDistance
      : distance2D(spawnPoint, CORE_WORLD_POSITION);
    const enemy: EnemyState = {
      id,
      type: enemyType,
      biomeIndex: this.state.currentBiomeIndex,
      laneId: lane.id,
      position: copyVec3(spawnPoint),
      velocity: v3(),
      pathProgress: 0,
      pathIndex: 0,
      isFlying: archetype.isFlying,
      isElite,
      isBoss,
      isDead: false,
      deathProcessed: false,
      deathOutcome: null,
      bossPhase: 1,
      stats: {
        maxHealth: archetype.baseHealth * scale * eliteMultiplier,
        health: archetype.baseHealth * scale * eliteMultiplier,
        speed: archetype.baseSpeed * (1 + this.state.currentBiomeIndex * 0.04),
        contactDamage: archetype.contactDamage,
        bountyGold: archetype.bountyGold,
      },
      movementSpeedMultiplier: 1,
      collisionRadius: archetype.isFlying ? Math.max(0.35, archetype.size) : Math.max(0.45, archetype.size),
      spawnDistanceToCore: spawnDistance,
      lastDistanceToCore: spawnDistance,
      freezeBuildup: 0,
      freezePulseTimer: 0,
      thermalFractureTimer: 0,
      statuses: [],
      targetId: null,
    };

    this.state.enemies.push(enemy);

    const enemyBody = this.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(enemy.position.x, 0.45, enemy.position.z),
    );
    this.physics.world.createCollider(RAPIER.ColliderDesc.ball(archetype.size).setSensor(true), enemyBody);
    this.physics.enemyBodies.set(enemy.id, enemyBody);

    if (enemy.isElite) {
      this.audio.play("elite-warning");
    }
    if (enemy.isBoss) {
      this.audio.play("boss-intro", 0.85);
    }
  }

  private findTowerTarget(position: Vec3, range: number): EnemyState | null {
    let best: EnemyState | null = null;
    let bestScore = -Infinity;
    for (const enemy of this.state.enemies) {
      if (enemy.isDead) {
        continue;
      }
      const dist = distance2D(position, enemy.position);
      if (dist > range) {
        continue;
      }
      const score = enemy.pathProgress * 10 + (enemy.isElite ? 4 : 0) + (enemy.isBoss ? 8 : 0) - dist * 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = enemy;
      }
    }
    return best;
  }

  private findSecondaryTowerTarget(position: Vec3, range: number, excludedEnemyId: string): EnemyState | null {
    let best: EnemyState | null = null;
    let bestScore = -Infinity;
    for (const enemy of this.state.enemies) {
      if (enemy.isDead || enemy.id === excludedEnemyId) {
        continue;
      }
      const dist = distance2D(position, enemy.position);
      if (dist > range) {
        continue;
      }
      const score = enemy.pathProgress * 10 + (enemy.isElite ? 3 : 0) + (enemy.isBoss ? 5 : 0) - dist * 0.25;
      if (score > bestScore) {
        bestScore = score;
        best = enemy;
      }
    }
    return best;
  }

  private findSoftLockTarget(reticle: Vec3, range: number): EnemyState | null {
    let best: EnemyState | null = null;
    let bestScore = Infinity;

    for (const enemy of this.state.enemies) {
      if (enemy.isDead) {
        continue;
      }
      const distToReticle = distance2D(enemy.position, reticle);
      const distToHero = distance2D(enemy.position, this.state.hero.position);
      if (distToHero > range) {
        continue;
      }
      const score = distToReticle * 0.8 + distToHero * 0.3 - (enemy.isElite ? 1.4 : 0) - (enemy.isBoss ? 2.2 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = enemy;
      }
    }

    return best;
  }

  private findNearestEnemy(position: Vec3, radius: number, excluded: Set<string>): EnemyState | null {
    let best: EnemyState | null = null;
    let bestDist = radius;
    for (const enemy of this.state.enemies) {
      if (enemy.isDead || excluded.has(enemy.id)) {
        continue;
      }
      const dist = distance2D(enemy.position, position);
      if (dist < bestDist) {
        bestDist = dist;
        best = enemy;
      }
    }
    return best;
  }

  private fireArcChain(origin: Vec3, firstTarget: EnemyState | null, baseDamage: number, chains: number): void {
    const hitIds = new Set<string>();
    let current = firstTarget ?? this.findNearestEnemy(origin, 9.5, hitIds);
    let remaining = chains + 1;
    while (current && remaining > 0) {
      hitIds.add(current.id);
      this.statusSystem.damageEnemy(this.state, current, baseDamage, "arc-chain");
      this.statusSystem.addStatus(current, {
        type: "shock",
        intensity: 1,
        duration: 2.6,
        sourceId: "arc-chain",
      });

      if (this.state.ownedUpgradeIds.has("arc-ground-strike") && current.isDead) {
        for (const enemy of this.state.enemies) {
          if (enemy.isDead) {
            continue;
          }
          if (distance2D(enemy.position, current.position) <= 2.2) {
            this.statusSystem.damageEnemy(this.state, enemy, baseDamage * 0.35, "arc-ground-strike");
          }
        }
      }

      current = this.findNearestEnemy(current.position, 7.5, hitIds);
      remaining -= 1;
      baseDamage *= 0.75;
    }
  }
  private spawnProjectile(
    source: ProjectileState["source"],
    ownerId: string,
    from: Vec3,
    direction: Vec3,
    payload: {
      type: ProjectileState["type"];
      damage: number;
      speed: number;
      ttl: number;
      radius: number;
      targetId: string | null;
      chainRemaining: number;
      tags: string[];
    },
  ): void {
    const projectile: ProjectileState = {
      id: this.nextId("proj"),
      source,
      ownerId,
      type: payload.type,
      position: copyVec3(from),
      velocity: mul(direction, payload.speed),
      damage: payload.damage,
      radius: payload.radius,
      ttl: payload.ttl,
      chainRemaining: payload.chainRemaining,
      targetId: payload.targetId,
      tags: payload.tags,
    };

    this.state.projectiles.push(projectile);
  }

  private pickUpgrade(index: number): void {
    if (this.state.mode !== "upgrade") {
      return;
    }

    const picked = this.upgradeSystem.applyChoice(this.state, index);
    if (!picked) {
      return;
    }

    this.audio.play("upgrade-pick", 1.02);
    if (this.state.mode === "upgrade") {
      this.state.mode = "build";
    }
  }

  private handleWaveCleared(): void {
    const bonus = this.state.ownedUpgradeIds.has("economy-wave-bonus") ? 90 : 70;
    this.state.resources.gold += bonus;
    this.state.resources.essence += 5;
    this.upgradeSystem.rollChoices(this.state, 3);
    this.state.mode = "upgrade";
  }

  private handleBiomeCleared(): void {
    this.state.resources.gold += 110;
    this.state.resources.essence += 15;
    this.state.hero.stats.health = Math.min(this.state.hero.stats.maxHealth, this.state.hero.stats.health + 60);
    this.state.mode = "between-biomes";
  }

  private handleRunCompleted(): void {
    this.state.mode = "victory";
    this.finishRun("victory");
  }

  private finishRun(result: "victory" | "defeat"): void {
    const essenceGained = Math.round(this.state.resources.essence - this.save.meta.essence);
    this.finishMetaProgression(essenceGained, result);
  }

  private finishMetaProgression(essenceGained: number, result: "victory" | "defeat"): void {
    const updated = patchSave((save) => {
      save.meta.essence += Math.max(0, essenceGained);
      save.meta.unlockedUpgradeIds = Array.from(new Set([...save.meta.unlockedUpgradeIds, ...this.state.ownedUpgradeIds]));
      save.meta.unlockedDifficultyTier = Math.max(save.meta.unlockedDifficultyTier, result === "victory" ? 2 : save.meta.unlockedDifficultyTier);
      save.runHistory.push({
        endedAt: nowIso(),
        result,
        biomeReached: this.state.currentBiomeIndex + 1,
        wavesCleared: this.state.runStats.wavesCleared,
        essenceGained: Math.max(0, essenceGained),
      });
      if (save.runHistory.length > 40) {
        save.runHistory.splice(0, save.runHistory.length - 40);
      }
    });
    this.save = updated;
  }

  private updateReticleFrame(dt: number): void {
    const aimSample = this.renderer.sampleAimTarget();
    this.reticleFrame = buildReticleFrameData(aimSample.aimPoint3D, aimSample.groundPoint);
    this.state.placementPreview = this.computePlacementPreview(this.reticleFrame.placementPoint);
    this.renderer.setReticle(this.reticleFrame.aimPoint3D, dt);
  }

  private computePlacementPreview(position: Vec3): BuildPlacementPreview {
    this.ensureNavigationState();
    const cost = this.currentBuildCost();
    const biome = this.currentBiome();
    let validation = validatePlacement(
      position,
      this.state.resources.gold,
      cost,
      this.state.towers,
      this.state.traps,
      CORE_WORLD_POSITION,
      CORE_BUILD_BUFFER_RADIUS,
      DEFENSE_MIN_SPACING,
      biome.obstacles,
    );

    if (validation.canPlace && this.state.mode === "build" && this.isTowerType(this.state.selectedBuildType)) {
      const blocksPath = this.navigation.wouldTowerPlacementBlockPaths(position, this.currentGroundSpawnPoints(), CORE_WORLD_POSITION);
      if (blocksPath) {
        validation = {
          canPlace: false,
          blockReason: "blocks-path",
        };
      }
    }

    const sellTarget = findSellTarget(position, this.state.towers, this.state.traps, SELL_TARGET_RADIUS);

    return {
      position: copyVec3(position),
      canPlace: validation.canPlace,
      blockReason: validation.blockReason,
      sellTarget: sellTarget ? { id: sellTarget.id, kind: sellTarget.kind } : null,
    };
  }

  private selectBuildByIndex(index: number): void {
    if (index < 0 || index >= BUILD_HOTKEY_ORDER.length) {
      return;
    }
    this.state.selectedBuildType = BUILD_HOTKEY_ORDER[index]!;
  }

  private cycleBuildSelection(step: number): void {
    const count = BUILD_HOTKEY_ORDER.length;
    if (count === 0) {
      return;
    }
    const current = BUILD_HOTKEY_ORDER.indexOf(this.state.selectedBuildType);
    const safeCurrent = current >= 0 ? current : 0;
    const next = (safeCurrent + step + count) % count;
    this.state.selectedBuildType = BUILD_HOTKEY_ORDER[next]!;
  }

  private currentBuildCost(): number {
    if (this.isTowerType(this.state.selectedBuildType)) {
      const towerType = this.state.selectedBuildType as TowerType;
      const archetype = towerArchetypes[towerType];
      return Math.round(archetype.baseCost * this.state.modifiers.towerCostMultiplier);
    }
    const trapType = this.state.selectedBuildType as TrapType;
    const archetype = trapArchetypes[trapType];
    return Math.round(archetype.baseCost * this.state.modifiers.trapCostMultiplier);
  }

  private resolvePlacementLaneId(position: Vec3): string {
    const biome = this.currentBiome();
    return resolveNearestLaneId(position, biome.lanes);
  }

  private tryPlaceAtReticle(): void {
    const placementPoint = this.reticleFrame.placementPoint;
    const preview = this.computePlacementPreview(placementPoint);
    this.state.placementPreview = preview;
    if (!preview.canPlace) {
      return;
    }

    const laneId = this.resolvePlacementLaneId(placementPoint);

    if (this.isTowerType(this.state.selectedBuildType)) {
      const towerType = this.state.selectedBuildType as TowerType;
      const archetype = towerArchetypes[towerType];
      const cost = Math.round(archetype.baseCost * this.state.modifiers.towerCostMultiplier);
      if (this.state.resources.gold < cost) {
        this.state.placementPreview = this.computePlacementPreview(placementPoint);
        return;
      }
      this.state.resources.gold -= cost;
      this.state.runStats.goldSpent += cost;
      const tower: TowerState = {
        id: this.nextId(towerType),
        type: towerType,
        position: copyVec3(placementPoint),
        laneId,
        level: 1,
        attackTimer: 0,
        shotsFired: 0,
        stats: { ...archetype.stats },
        buffMultiplier: 1,
        upgrades: [],
        health: 120,
        maxHealth: 120,
      };
      this.state.towers.push(tower);
      this.markNavigationDirty();
      this.ensureNavigationState();
      this.state.placementPreview = this.computePlacementPreview(placementPoint);
      return;
    }

    const trapType = this.state.selectedBuildType as TrapType;
    const archetype = trapArchetypes[trapType];
    const cost = Math.round(archetype.baseCost * this.state.modifiers.trapCostMultiplier);
    if (this.state.resources.gold < cost) {
      this.state.placementPreview = this.computePlacementPreview(placementPoint);
      return;
    }
    this.state.resources.gold -= cost;
    this.state.runStats.goldSpent += cost;

    const trap: TrapState = {
      id: this.nextId(trapType),
      type: trapType,
      position: copyVec3(placementPoint),
      laneId,
      cooldown: 0,
      triggerRadius: archetype.triggerRadius,
      upgrades: [],
      activeZoneTimer: 0,
    };
    this.state.traps.push(trap);
    this.state.placementPreview = this.computePlacementPreview(placementPoint);
  }

  private sellAtReticle(): void {
    const placementPoint = this.reticleFrame.placementPoint;
    const sellTarget = findSellTarget(placementPoint, this.state.towers, this.state.traps, SELL_TARGET_RADIUS);
    if (!sellTarget) {
      this.state.placementPreview = this.computePlacementPreview(placementPoint);
      return;
    }

    if (sellTarget.kind === "tower") {
      const towerIndex = this.state.towers.findIndex((tower) => tower.id === sellTarget.id);
      if (towerIndex < 0) {
        this.state.placementPreview = this.computePlacementPreview(placementPoint);
        return;
      }

      const tower = this.state.towers[towerIndex]!;
      const archetype = towerArchetypes[tower.type];
      let refund = archetype.baseCost * archetype.sellRefundFactor;
      if (this.state.ownedUpgradeIds.has("economy-sell-refund")) {
        refund *= 1.18;
      }
      this.state.resources.gold += Math.round(refund);
      this.state.towers.splice(towerIndex, 1);
      this.markNavigationDirty();
      this.ensureNavigationState();
      this.state.placementPreview = this.computePlacementPreview(placementPoint);
      return;
    }

    const trapIndex = this.state.traps.findIndex((trap) => trap.id === sellTarget.id);
    if (trapIndex >= 0) {
      const trap = this.state.traps[trapIndex]!;
      const archetype = trapArchetypes[trap.type];
      let refund = archetype.baseCost * 0.7;
      if (this.state.ownedUpgradeIds.has("economy-sell-refund")) {
        refund *= 1.18;
      }
      this.state.resources.gold += Math.round(refund);
      this.state.traps.splice(trapIndex, 1);
      this.state.placementPreview = this.computePlacementPreview(placementPoint);
    }
  }

  private isTowerType(value: TowerType | TrapType): value is TowerType {
    return value in towerArchetypes;
  }

  private cycleWeapon(): void {
    const index = allWeapons.indexOf(this.state.hero.loadout.weapon);
    const next = allWeapons[(index + 1) % allWeapons.length]!;
    this.state.hero.loadout.weapon = next;

    if (this.state.ownedUpgradeIds.has("hero-weapon-swap-bonus")) {
      this.state.modifiers.heroAttackSpeedMultiplier = Math.max(this.state.modifiers.heroAttackSpeedMultiplier, 1.2);
      this.pendingOverchargeTimer = Math.max(this.pendingOverchargeTimer, 1.2);
    }
  }

  private switchLoadout(): void {
    this.loadoutCycle = (this.loadoutCycle + 1) % 3;
    if (this.loadoutCycle === 0) {
      this.state.hero.loadout.ability1 = "explosive-rune";
      this.state.hero.loadout.ability2 = "freezing-pulse";
      this.state.hero.loadout.weapon = "crossbow";
    } else if (this.loadoutCycle === 1) {
      this.state.hero.loadout.ability1 = "healing-beacon";
      this.state.hero.loadout.ability2 = "overcharge-aura";
      this.state.hero.loadout.weapon = "arc-gauntlet";
    } else {
      this.state.hero.loadout.ability1 = "dash";
      this.state.hero.loadout.ability2 = "explosive-rune";
      this.state.hero.loadout.weapon = "shot-relic";
    }
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // no-op
      });
      return;
    }
    document.exitFullscreen().catch(() => {
      // no-op
    });
  }

  private syncHeroPhysics(): void {
    this.physics.heroBody.setTranslation(
      {
        x: this.state.hero.position.x,
        y: 0.6 + this.state.hero.position.y,
        z: this.state.hero.position.z,
      },
      true,
    );

    for (const enemy of this.state.enemies) {
      const body = this.physics.enemyBodies.get(enemy.id);
      if (!body) {
        continue;
      }
      body.setNextKinematicTranslation({ x: enemy.position.x, y: 0.5, z: enemy.position.z });
    }

    this.physics.world.step();
  }

  private exposeAutomationHooks(): void {
    (window as unknown as { render_game_to_text: () => string }).render_game_to_text = () => {
      const biome = biomeSequence[this.state.currentBiomeIndex] ?? biomeSequence[biomeSequence.length - 1]!;
      const camera = this.renderer.getCameraDiagnostics();
      const snapshot: RenderTextSnapshot = {
        coordinateSystem: "Right-handed world: origin at arena center, +x right, +z forward toward bastion, y up.",
        mode: this.state.mode,
        biome: biome.name,
        wave: {
          biomeIndex: this.state.currentBiomeIndex,
          waveInBiome: this.state.wave.waveIndexInBiome + 1,
          globalWave: this.state.wave.globalWaveNumber,
          active: this.state.wave.active,
          enemiesRemaining: this.state.wave.enemiesRemainingEstimate,
        },
        resources: { ...this.state.resources },
        baseCore: {
          health: this.state.baseCoreHealth,
          maxHealth: this.state.baseCoreMaxHealth,
        },
        hero: {
          position: copyVec3(this.state.hero.position),
          velocity: copyVec3(this.state.hero.velocity),
          health: this.state.hero.stats.health,
          maxHealth: this.state.hero.stats.maxHealth,
          weapon: this.state.hero.loadout.weapon,
          abilityCooldowns: { ...this.state.hero.abilityCooldowns },
          jumpActive: this.state.hero.jumpActive,
          jumpProgress: this.state.hero.jumpDuration > 0 ? clamp(this.state.hero.jumpElapsed / this.state.hero.jumpDuration, 0, 1) : 0,
        },
        enemies: this.state.enemies
          .filter((enemy) => !enemy.isDead)
          .slice(0, 50)
          .map((enemy) => ({
            id: enemy.id,
            type: enemy.type,
            position: copyVec3(enemy.position),
            hp: enemy.stats.health,
            maxHp: enemy.stats.maxHealth,
            laneId: enemy.laneId,
            elite: enemy.isElite,
            boss: enemy.isBoss,
            statuses: enemy.statuses.map((status) => ({ type: status.type, intensity: status.intensity, duration: status.duration })),
          })),
        towers: this.state.towers.map((tower) => ({
          id: tower.id,
          type: tower.type,
          position: copyVec3(tower.position),
          level: tower.level,
          health: tower.health,
        })),
        traps: this.state.traps.map((trap) => ({
          id: trap.id,
          type: trap.type,
          position: copyVec3(trap.position),
          cooldown: trap.cooldown,
        })),
        obstacles: biome.obstacles.map((obstacle) => ({
          id: obstacle.id,
          center: copyVec3(obstacle.center),
          radius: obstacle.radius,
          blocksGround: obstacle.blocksGround,
          blocksHero: obstacle.blocksHero,
        })),
        placementPreview: {
          position: copyVec3(this.state.placementPreview.position),
          canPlace: this.state.placementPreview.canPlace,
          blockReason: this.state.placementPreview.blockReason,
          sellTarget: this.state.placementPreview.sellTarget
            ? {
                id: this.state.placementPreview.sellTarget.id,
                kind: this.state.placementPreview.sellTarget.kind,
              }
            : null,
        },
        camera: {
          position: camera.position,
          focus: camera.focus,
          yaw: camera.yaw,
          pitch: camera.pitch,
          aimPoint: camera.aimPoint,
        },
      };

      return JSON.stringify(snapshot);
    };

    (window as unknown as { advanceTime: (ms: number) => void }).advanceTime = (ms: number) => {
      this.advanceTime(ms);
    };
  }
}

export async function bootstrapGame(canvas: HTMLCanvasElement, hudRoot: HTMLElement): Promise<GameApp> {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });

  const heroBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(8, 0.6, 0));
  const heroCollider = world.createCollider(RAPIER.ColliderDesc.ball(0.45).setMass(1), heroBody);
  void heroCollider;

  const renderer = new Renderer3D(canvas);

  const app = new GameApp(canvas, hudRoot, renderer, {
    world,
    heroBody,
    heroCollider,
    enemyBodies: new Map(),
  });
  return app;
}
