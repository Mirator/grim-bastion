import { createUpgradePool } from "../data/upgrades";
import type { MutableGameState, UpgradeDefinition } from "../types";
import { Random } from "../utils/random";

export class UpgradeSystem {
  readonly pool: UpgradeDefinition[];

  private rng: Random;

  constructor(seed = 0x6f4f3f2f) {
    this.pool = createUpgradePool();
    this.rng = new Random(seed);
  }

  rollChoices(state: MutableGameState, count = 3): UpgradeDefinition[] {
    const compatible = this.pool.filter((upgrade) => upgrade.compatible(this.contextFromState(state)) && !state.ownedUpgradeIds.has(upgrade.id));

    const results: UpgradeDefinition[] = [];
    const used = new Set<string>();

    while (results.length < count && compatible.length > 0) {
      const weighted = compatible
        .filter((candidate) => !used.has(candidate.id))
        .map((candidate) => ({ item: candidate, weight: Math.max(0.05, candidate.weight) }));
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
