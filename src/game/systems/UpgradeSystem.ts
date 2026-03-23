import { createUpgradePool } from "../data/upgrades";
import type { AbilityType, MutableGameState, UpgradeDefinition } from "../types";
import { Random } from "../utils/random";

const MIN_EFFECTIVE_WEIGHT = 0.05;
const NORMAL_AFFINITY_MULTIPLIER = 0.1;
const WILD_AFFINITY_MULTIPLIER = 0.065;
const NORMAL_AFFINITY_CAP = 1.7;
const WILD_AFFINITY_CAP = 1.22;

function addAffinity(affinity: Map<string, number>, tag: string, amount: number): void {
  if (!tag || !Number.isFinite(amount) || amount <= 0) {
    return;
  }
  affinity.set(tag, (affinity.get(tag) ?? 0) + amount);
}

export class UpgradeSystem {
  readonly pool: UpgradeDefinition[];

  private rng: Random;

  private upgradeById: Map<string, UpgradeDefinition>;

  constructor(seed = 0x6f4f3f2f) {
    this.pool = createUpgradePool();
    this.rng = new Random(seed);
    this.upgradeById = new Map(this.pool.map((upgrade) => [upgrade.id, upgrade]));
  }

  rollChoices(state: MutableGameState, count = 3): UpgradeDefinition[] {
    const compatible = this.pool.filter((upgrade) => upgrade.compatible(this.contextFromState(state)) && !state.ownedUpgradeIds.has(upgrade.id));
    const affinity = this.buildAffinityProfile(state);

    const results: UpgradeDefinition[] = [];
    const used = new Set<string>();

    while (results.length < count && compatible.length > 0) {
      const weighted = compatible
        .filter((candidate) => !used.has(candidate.id))
        .map((candidate) => ({
          item: candidate,
          weight: this.effectiveWeight(candidate, affinity),
        }));
      if (weighted.length === 0) {
        break;
      }
      const picked = this.rng.weightedPick(weighted);
      used.add(picked.id);
      results.push(picked);
    }

    state.availableUpgrades = results;
    return results;
  }

  applyChoice(state: MutableGameState, choiceIndex: number): UpgradeDefinition | null {
    const choice = state.availableUpgrades[choiceIndex];
    if (!choice) {
      return null;
    }

    choice.apply(state);
    state.ownedUpgradeIds.add(choice.id);
    state.availableUpgrades = [];
    return choice;
  }

  private effectiveWeight(candidate: UpgradeDefinition, affinity: Map<string, number>): number {
    let score = Math.min(2, affinity.get(candidate.category) ?? 0);
    for (const tag of candidate.tags) {
      score += Math.min(3.5, affinity.get(tag) ?? 0);
    }

    const multiplierStep = candidate.category === "wild" ? WILD_AFFINITY_MULTIPLIER : NORMAL_AFFINITY_MULTIPLIER;
    const maxMultiplier = candidate.category === "wild" ? WILD_AFFINITY_CAP : NORMAL_AFFINITY_CAP;
    const affinityMultiplier = Math.min(maxMultiplier, 1 + score * multiplierStep);
    return Math.max(MIN_EFFECTIVE_WEIGHT, candidate.weight * affinityMultiplier);
  }

  private buildAffinityProfile(state: MutableGameState): Map<string, number> {
    const affinity = new Map<string, number>();

    for (const tower of state.towers) {
      addAffinity(affinity, "tower", 0.35);
      addAffinity(affinity, tower.type, 1.4);
      if (tower.type === "frost-obelisk") {
        addAffinity(affinity, "frost", 0.8);
        addAffinity(affinity, "freeze", 0.6);
      } else if (tower.type === "bombard") {
        addAffinity(affinity, "bombard", 0.9);
        addAffinity(affinity, "aoe", 0.7);
        addAffinity(affinity, "burn", 0.45);
      } else if (tower.type === "arc-tower") {
        addAffinity(affinity, "arc", 0.9);
        addAffinity(affinity, "shock", 0.75);
      } else if (tower.type === "shrine") {
        addAffinity(affinity, "shrine", 0.9);
        addAffinity(affinity, "support", 0.75);
      }
    }

    for (const trap of state.traps) {
      addAffinity(affinity, "trap", 0.45);
      addAffinity(affinity, trap.type, 1.1);
      if (trap.type === "push-trap") {
        addAffinity(affinity, "slow", 0.8);
      } else if (trap.type === "flame-trap") {
        addAffinity(affinity, "burn", 0.9);
      }
    }

    addAffinity(affinity, "hero", 0.25);
    addAffinity(affinity, "weapon", 0.35);
    if (state.hero.loadout.weapon === "crossbow") {
      addAffinity(affinity, "crit", 0.45);
    } else if (state.hero.loadout.weapon === "arc-gauntlet") {
      addAffinity(affinity, "shock", 0.8);
      addAffinity(affinity, "ability", 0.35);
    } else if (state.hero.loadout.weapon === "shot-relic") {
      addAffinity(affinity, "crit", 0.9);
      addAffinity(affinity, "hero", 0.2);
    }

    this.addAbilityAffinity(affinity, state.hero.loadout.ability1);
    this.addAbilityAffinity(affinity, state.hero.loadout.ability2);

    for (const upgradeId of state.ownedUpgradeIds) {
      const upgrade = this.upgradeById.get(upgradeId);
      if (!upgrade) {
        continue;
      }
      addAffinity(affinity, upgrade.category, 0.25);
      for (const tag of upgrade.tags) {
        addAffinity(affinity, tag, 0.4);
      }
    }

    if (state.resources.gold < 180) {
      addAffinity(affinity, "economy", 1.1);
      addAffinity(affinity, "gold", 0.95);
      addAffinity(affinity, "tower", 0.35);
      addAffinity(affinity, "trap", 0.25);
    }

    if (state.resources.mana < 35) {
      addAffinity(affinity, "mana", 1.2);
      addAffinity(affinity, "ability", 0.55);
      addAffinity(affinity, "economy", 0.25);
    }

    const healthRatio = state.hero.stats.maxHealth > 0 ? state.hero.stats.health / state.hero.stats.maxHealth : 1;
    if (healthRatio < 0.55) {
      addAffinity(affinity, "survival", 0.9);
      addAffinity(affinity, "support", 0.45);
    }

    if (state.towers.length >= state.traps.length + 2) {
      addAffinity(affinity, "tower", 0.4);
    }
    if (state.traps.length > state.towers.length) {
      addAffinity(affinity, "trap", 0.55);
    }

    return affinity;
  }

  private addAbilityAffinity(affinity: Map<string, number>, ability: AbilityType): void {
    addAffinity(affinity, "ability", 0.35);

    switch (ability) {
      case "dash":
        addAffinity(affinity, "dash", 1.3);
        addAffinity(affinity, "mobility", 0.9);
        break;
      case "explosive-rune":
        addAffinity(affinity, "shock", 0.85);
        addAffinity(affinity, "aoe", 0.45);
        break;
      case "freezing-pulse":
        addAffinity(affinity, "freeze", 0.95);
        addAffinity(affinity, "slow", 0.8);
        break;
      case "healing-beacon":
        addAffinity(affinity, "support", 1);
        addAffinity(affinity, "survival", 0.8);
        break;
      case "overcharge-aura":
        addAffinity(affinity, "support", 1.1);
        addAffinity(affinity, "tower", 0.45);
        break;
    }
  }

  private contextFromState(state: MutableGameState) {
    return {
      hero: state.hero,
      towers: state.towers,
      traps: state.traps,
      resources: state.resources,
      ownedUpgradeIds: state.ownedUpgradeIds,
    };
  }
}
