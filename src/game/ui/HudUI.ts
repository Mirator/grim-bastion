import { biomeSequence } from "../data/biomes";
import { towerArchetypes, trapArchetypes } from "../data/archetypes";
import { CORE_BUILD_BUFFER_RADIUS, CORE_WORLD_POSITION } from "../constants";
import { BUILD_HOTKEY_ORDER, canToggleCombatView } from "../systems/gameplayRules";
import type { MutableGameState, TowerType, TrapType, UpgradeDefinition, Vec3 } from "../types";

export interface HudEvents {
  onStartRun: () => void;
  onStartWave: () => void;
  onToggleBuild: () => void;
  onSelectBuild: (type: TowerType | TrapType) => void;
  onPickUpgrade: (index: number) => void;
  onSwitchLoadout: () => void;
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatBlockReason(reason: MutableGameState["placementPreview"]["blockReason"]): string {
  if (!reason) {
    return "ready";
  }
  if (reason === "insufficient-gold") {
    return "insufficient gold";
  }
  if (reason === "core-buffer") {
    return "too close to core";
  }
  if (reason === "obstacle") {
    return "overlaps obstacle";
  }
  if (reason === "blocks-path") {
    return "would block enemy path";
  }
  return "overlaps defense";
}

export class HudUI {
  readonly root: HTMLElement;

  private readonly events: HudEvents;

  private readonly resourcesEl: HTMLElement;

  private readonly waveEl: HTMLElement;

  private readonly heroEl: HTMLElement;

  private readonly modeEl: HTMLElement;

  private readonly tipsEl: HTMLElement;

  private readonly buildListEl: HTMLElement;

  private readonly buildActionBarEl: HTMLElement;

  private readonly upgradePanelEl: HTMLElement;

  private readonly upgradeCardsEl: HTMLElement;

  private readonly minimap: HTMLCanvasElement;

  private minimapCtx: CanvasRenderingContext2D;

  private readonly startRunButton: HTMLButtonElement;

  private readonly startWaveButton: HTMLButtonElement;

  private readonly toggleBuildButton: HTMLButtonElement;

  private readonly switchLoadoutButton: HTMLButtonElement;

  constructor(root: HTMLElement, events: HudEvents) {
    this.root = root;
    this.events = events;
    this.root.innerHTML = `
      <div id="crosshair" aria-hidden="true"></div>
      <div class="hud-top">
        <div class="hud-panel" id="resources"></div>
        <div class="hud-panel" id="wave"></div>
        <div class="hud-panel" id="hero"></div>
      </div>
      <div class="hud-right">
        <div class="hud-panel mode" id="mode"></div>
        <div class="hud-panel controls">
          <h3>Controls</h3>
          <p>Mouse look (locked), center crosshair aim, LMB fire, Q/E abilities, Shift dash, Space jump.</p>
          <p>Build mode: LMB place selected defense at reticle, RMB sell nearest defense.</p>
          <p>Enter starts run. N starts wave in-run. B toggles build/combat view in-run.</p>
          <p>Build action bar: 1-8 select slot, mouse wheel or [ / ] cycle slot.</p>
          <p>R weapon, L loadout, F fullscreen.</p>
        </div>
        <div class="hud-panel actions">
          <button id="start-run">Start Run (Enter)</button>
          <button id="start-wave">Start Wave (N)</button>
          <button id="toggle-build">Toggle Build (B)</button>
          <button id="switch-loadout">Switch Loadout (L)</button>
        </div>
      </div>
      <div class="hud-bottom">
        <div class="hud-panel minimap-panel">
          <h3>Minimap</h3>
          <canvas id="minimap" width="220" height="160"></canvas>
        </div>
        <div class="hud-panel tips" id="tips"></div>
      </div>
      <div class="build-action-bar hidden" id="build-action-bar">
        <div id="build-list" class="build-list-horizontal"></div>
      </div>
      <div class="overlay-upgrade hidden" id="upgrade-panel">
        <h2>Choose 1 Upgrade</h2>
        <div id="upgrade-cards"></div>
      </div>
    `;

    this.resourcesEl = this.query("#resources");
    this.waveEl = this.query("#wave");
    this.heroEl = this.query("#hero");
    this.modeEl = this.query("#mode");
    this.tipsEl = this.query("#tips");
    this.buildActionBarEl = this.query("#build-action-bar");
    this.buildListEl = this.query("#build-list");
    this.upgradePanelEl = this.query("#upgrade-panel");
    this.upgradeCardsEl = this.query("#upgrade-cards");

    this.minimap = this.query<HTMLCanvasElement>("#minimap");
    const context = this.minimap.getContext("2d");
    if (!context) {
      throw new Error("Could not create minimap 2D context");
    }
    this.minimapCtx = context;

    this.startRunButton = this.query<HTMLButtonElement>("#start-run");
    this.startWaveButton = this.query<HTMLButtonElement>("#start-wave");
    this.toggleBuildButton = this.query<HTMLButtonElement>("#toggle-build");
    this.switchLoadoutButton = this.query<HTMLButtonElement>("#switch-loadout");

    this.startRunButton.addEventListener("click", () => this.events.onStartRun());
    this.startWaveButton.addEventListener("click", () => this.events.onStartWave());
    this.toggleBuildButton.addEventListener("click", () => this.events.onToggleBuild());
    this.switchLoadoutButton.addEventListener("click", () => this.events.onSwitchLoadout());

    this.renderBuildButtons();
  }

  update(state: MutableGameState): void {
    const biome = biomeSequence[state.currentBiomeIndex] ?? biomeSequence[biomeSequence.length - 1]!;

    this.resourcesEl.innerHTML = [
      `<strong>Resources</strong>`,
      `Gold: ${formatNumber(state.resources.gold)}`,
      `Mana: ${formatNumber(state.resources.mana)}`,
      `Essence: ${formatNumber(state.resources.essence)}`,
      `Core HP: ${formatNumber(state.baseCoreHealth)} / ${formatNumber(state.baseCoreMaxHealth)}`,
    ].join("<br />");

    this.waveEl.innerHTML = [
      `<strong>Wave</strong>`,
      `Biome: ${biome.name}`,
      `Wave in biome: ${state.wave.waveIndexInBiome + 1} / ${biome.waveTemplates.length}`,
      `Global wave: ${state.wave.globalWaveNumber}`,
      `Enemies left: ${state.wave.enemiesRemainingEstimate}`,
      `Bosses defeated: ${state.runStats.bossesDefeated}`,
    ].join("<br />");

    this.heroEl.innerHTML = [
      `<strong>Hero</strong>`,
      `HP: ${formatNumber(state.hero.stats.health)} / ${formatNumber(state.hero.stats.maxHealth)}`,
      `Weapon: ${state.hero.loadout.weapon}`,
      `Ability 1: ${state.hero.loadout.ability1} (${state.hero.abilityCooldowns[state.hero.loadout.ability1].toFixed(1)}s)`,
      `Ability 2: ${state.hero.loadout.ability2} (${state.hero.abilityCooldowns[state.hero.loadout.ability2].toFixed(1)}s)`,
      `Attack CD: ${state.hero.attackCooldown.toFixed(2)}s`,
    ].join("<br />");

    this.modeEl.innerHTML = [
      `<strong>Mode</strong>`,
      state.mode,
      state.mode === "build" ? "Place defenses at reticle position (freeform)." : "Fight and stabilize lanes.",
    ].join("<br />");

    this.tipsEl.innerHTML = [
      `<strong>Run Stats</strong>`,
      `Kills: ${formatNumber(state.runStats.kills)}`,
      `Damage: ${formatNumber(state.runStats.damageDealt)}`,
      `Gold spent: ${formatNumber(state.runStats.goldSpent)}`,
      `Owned upgrades: ${state.ownedUpgradeIds.size}`,
      state.selectedBuildType ? `Build selection: ${state.selectedBuildType}` : "Build selection: none",
      `Reticle build pos: ${state.placementPreview.position.x.toFixed(1)}, ${state.placementPreview.position.z.toFixed(1)}`,
      `Placement: ${state.placementPreview.canPlace ? "valid" : `blocked (${formatBlockReason(state.placementPreview.blockReason)})`}`,
      state.placementPreview.sellTarget
        ? `Sell target: ${state.placementPreview.sellTarget.kind} ${state.placementPreview.sellTarget.id}`
        : "Sell target: none",
    ].join("<br />");

    this.renderUpgradePanel(state);
    this.renderMinimap(state);
    this.buildActionBarEl.classList.toggle("hidden", state.mode !== "build");
    this.updateBuildSelection(state.selectedBuildType);

    const canStartRun = state.mode === "menu" || state.mode === "game-over" || state.mode === "victory";
    const canStartWave = !state.wave.active && (state.mode === "build" || state.mode === "wave" || state.mode === "between-biomes");
    const canToggleView = canToggleCombatView(state.mode);
    this.startRunButton.disabled = !canStartRun;
    this.startWaveButton.disabled = !canStartWave;
    this.toggleBuildButton.disabled = !canToggleView;
  }

  private renderBuildButtons(): void {
    const entries: Array<{ id: TowerType | TrapType; label: string; cost: number; hotkey: number }> = BUILD_HOTKEY_ORDER.map(
      (type, index) => {
        if (type in towerArchetypes) {
          const tower = towerArchetypes[type as TowerType];
          return {
            id: tower.type,
            label: tower.label,
            cost: tower.baseCost,
            hotkey: index + 1,
          };
        }
        const trap = trapArchetypes[type as TrapType];
        return {
          id: trap.type,
          label: trap.label,
          cost: trap.baseCost,
          hotkey: index + 1,
        };
      },
    );

    this.buildListEl.innerHTML = entries
      .map(
        (entry) =>
          `<button class="build-item action-slot" data-build="${entry.id}">
            <span class="build-slot-hotkey">${entry.hotkey}</span>
            <span class="build-slot-name">${entry.label}</span>
            <span class="build-slot-cost">${entry.cost}g</span>
          </button>`,
      )
      .join("");

    this.buildListEl.querySelectorAll<HTMLButtonElement>(".build-item").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.dataset.build as TowerType | TrapType;
        this.events.onSelectBuild(type);
      });
    });
  }

  private updateBuildSelection(selected: TowerType | TrapType): void {
    this.buildListEl.querySelectorAll<HTMLButtonElement>(".build-item").forEach((button) => {
      button.classList.toggle("selected", button.dataset.build === selected);
    });
  }

  private renderUpgradePanel(state: MutableGameState): void {
    if (state.mode !== "upgrade") {
      this.upgradePanelEl.classList.add("hidden");
      this.upgradeCardsEl.innerHTML = "";
      return;
    }

    this.upgradePanelEl.classList.remove("hidden");
    this.upgradeCardsEl.innerHTML = state.availableUpgrades
      .map(
        (upgrade, index) => `
          <button class="upgrade-card" data-upgrade-index="${index}">
            <h3>${upgrade.name}</h3>
            <p class="upgrade-category">${upgrade.category} / ${upgrade.rarity}</p>
            <p>${upgrade.description}</p>
            <p class="synergy">Synergy: ${upgrade.synergyHint}</p>
            <p class="hotkey">Press ${index + 1} to select</p>
          </button>
        `,
      )
      .join("");

    this.upgradeCardsEl.querySelectorAll<HTMLButtonElement>(".upgrade-card").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.upgradeIndex ?? "-1");
        if (Number.isFinite(index) && index >= 0) {
          this.events.onPickUpgrade(index);
        }
      });
    });
  }

  private renderMinimap(state: MutableGameState): void {
    const ctx = this.minimapCtx;
    const { width, height } = this.minimap;
    const biome = biomeSequence[state.currentBiomeIndex] ?? biomeSequence[biomeSequence.length - 1]!;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(20, 24, 33, 0.95)";
    ctx.fillRect(0, 0, width, height);

    const mapScale = 3.5;
    const ox = width * 0.5;
    const oy = height * 0.5;

    const project = (position: Vec3) => ({
      x: ox + position.x * mapScale,
      y: oy + position.z * mapScale,
    });

    ctx.save();
    ctx.strokeStyle = "rgba(156, 214, 255, 0.72)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 3]);
    ctx.lineDashOffset = -state.time * 26;
    state.enemyRoutePreview.forEach((laneRoute) => {
      if (laneRoute.points.length === 0) {
        return;
      }
      ctx.beginPath();
      laneRoute.points.forEach((lanePoint, index) => {
        const p = project(lanePoint);
        if (index === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      });
      ctx.stroke();
    });
    ctx.restore();

    ctx.fillStyle = "rgba(122, 142, 156, 0.62)";
    for (const obstacle of biome.obstacles) {
      const p = project(obstacle.center);
      ctx.beginPath();
      ctx.arc(p.x, p.y, obstacle.radius * mapScale, 0, Math.PI * 2);
      ctx.fill();
    }

    const core = project(CORE_WORLD_POSITION);
    ctx.strokeStyle = "rgba(144, 213, 255, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(core.x, core.y, CORE_BUILD_BUFFER_RADIUS * mapScale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#4cf8c6";
    const hero = project(state.hero.position);
    ctx.beginPath();
    ctx.arc(hero.x, hero.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffaa6d";
    for (const tower of state.towers) {
      const p = project(tower.position);
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }

    ctx.fillStyle = "#e85b5b";
    for (const enemy of state.enemies) {
      if (enemy.isDead) {
        continue;
      }
      const p = project(enemy.position);
      ctx.fillRect(p.x - (enemy.isBoss ? 3 : 2), p.y - (enemy.isBoss ? 3 : 2), enemy.isBoss ? 6 : 4, enemy.isBoss ? 6 : 4);
    }

    ctx.fillStyle = "#8fd5ff";
    ctx.beginPath();
    ctx.arc(core.x, core.y, 5, 0, Math.PI * 2);
    ctx.fill();

    if (state.mode === "build") {
      const buildPos = project(state.placementPreview.position);
      ctx.fillStyle = state.placementPreview.canPlace ? "#65f2a6" : "#ff8b7a";
      ctx.beginPath();
      ctx.arc(buildPos.x, buildPos.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector(selector);
    if (!element) {
      throw new Error(`Missing HUD element for selector: ${selector}`);
    }
    return element as T;
  }

  showUpgradeChoices(choices: UpgradeDefinition[]): void {
    this.upgradeCardsEl.innerHTML = choices
      .map(
        (upgrade, index) => `
          <button class="upgrade-card" data-upgrade-index="${index}">
            <h3>${upgrade.name}</h3>
            <p>${upgrade.description}</p>
            <p class="synergy">${upgrade.synergyHint}</p>
          </button>
        `,
      )
      .join("");
  }
}
