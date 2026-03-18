import type { MutableGameState, Rarity, TowerType, UpgradeContext, UpgradeDefinition, UpgradeCategory } from "../types";

interface UpgradeSpec {
  id: string;
  name: string;
  category: UpgradeCategory;
  rarity: Rarity;
  description: string;
  synergyHint: string;
  tags: string[];
  weight: number;
  apply: (state: MutableGameState) => void;
}

function rarityWeight(rarity: Rarity): number {
  switch (rarity) {
    case "common":
      return 1;
    case "uncommon":
      return 0.75;
    case "rare":
      return 0.45;
    case "wild":
      return 0.2;
  }
}

function toUpgrade(spec: UpgradeSpec): UpgradeDefinition {
  return {
    ...spec,
    compatible: (context: UpgradeContext) => !context.ownedUpgradeIds.has(spec.id),
  };
}

function towerLabel(type: TowerType): string {
  switch (type) {
    case "ballista":
      return "Ballista";
    case "frost-obelisk":
      return "Frost Obelisk";
    case "bombard":
      return "Bombard";
    case "arc-tower":
      return "Arc Tower";
    case "shrine":
      return "Shrine";
  }
}

const towerSpecialEffects: Record<TowerType, UpgradeSpec[]> = {
  "ballista": [
    {
      id: "ballista-piercing-bolts",
      name: "Piercing Bolts",
      category: "tower",
      rarity: "rare",
      description: "Ballista bolts pierce one additional target.",
      synergyHint: "Best with long straight lanes.",
      tags: ["ballista", "special"],
      weight: 0.45,
      apply: (state) => {
        state.ownedUpgradeIds.add("ballista-piercing-bolts");
      },
    },
    {
      id: "ballista-double-shot",
      name: "Double Shot Cycle",
      category: "tower",
      rarity: "uncommon",
      description: "Every fifth Ballista attack fires twice.",
      synergyHint: "Pairs with attack speed buffs.",
      tags: ["ballista", "special"],
      weight: 0.65,
      apply: (state) => {
        state.ownedUpgradeIds.add("ballista-double-shot");
      },
    },
  ],
  "frost-obelisk": [
    {
      id: "frost-spreading-freeze",
      name: "Spreading Freeze",
      category: "tower",
      rarity: "rare",
      description: "Frozen enemies pulse freeze buildup to nearby enemies.",
      synergyHint: "Creates chain crowd control at choke points.",
      tags: ["frost", "special", "freeze"],
      weight: 0.48,
      apply: (state) => {
        state.ownedUpgradeIds.add("frost-spreading-freeze");
      },
    },
    {
      id: "frost-brittle-targets",
      name: "Brittle Targets",
      category: "tower",
      rarity: "uncommon",
      description: "Frozen targets take additional splash damage.",
      synergyHint: "Core combo with Bombard.",
      tags: ["frost", "special", "combo"],
      weight: 0.63,
      apply: (state) => {
        state.ownedUpgradeIds.add("frost-brittle-targets");
      },
    },
  ],
  bombard: [
    {
      id: "bombard-fire-pools",
      name: "Incendiary Shells",
      category: "tower",
      rarity: "rare",
      description: "Bombard explosions leave burning pools.",
      synergyHint: "Stack with slow/freeze to trap enemies in fire.",
      tags: ["bombard", "special", "burn"],
      weight: 0.43,
      apply: (state) => {
        state.modifiers.firePoolsOnBombard = true;
      },
    },
    {
      id: "bombard-expanded-blast",
      name: "Expanded Blast",
      category: "tower",
      rarity: "uncommon",
      description: "Bombard splash radius greatly increases.",
      synergyHint: "Strong lane-clearing pressure.",
      tags: ["bombard", "special", "aoe"],
      weight: 0.66,
      apply: (state) => {
        state.ownedUpgradeIds.add("bombard-expanded-blast");
      },
    },
  ],
  "arc-tower": [
    {
      id: "arc-extended-chain",
      name: "Extended Chain",
      category: "tower",
      rarity: "uncommon",
      description: "Arc tower lightning chains to two extra targets.",
      synergyHint: "Dominates dense waves.",
      tags: ["arc", "special", "shock"],
      weight: 0.7,
      apply: (state) => {
        state.ownedUpgradeIds.add("arc-extended-chain");
      },
    },
    {
      id: "arc-ground-strike",
      name: "Ground Strike",
      category: "tower",
      rarity: "rare",
      description: "Shocked enemy deaths trigger a lightning strike.",
      synergyHint: "Pairs with shock explosion wild upgrades.",
      tags: ["arc", "special", "shock"],
      weight: 0.4,
      apply: (state) => {
        state.ownedUpgradeIds.add("arc-ground-strike");
      },
    },
  ],
  shrine: [
    {
      id: "shrine-aura-expansion",
      name: "Greater Aura",
      category: "tower",
      rarity: "uncommon",
      description: "Shrine aura radius increases significantly.",
      synergyHint: "Anchor large tower clusters.",
      tags: ["shrine", "special", "support"],
      weight: 0.74,
      apply: (state) => {
        state.ownedUpgradeIds.add("shrine-aura-expansion");
      },
    },
    {
      id: "shrine-overcharge-pulse",
      name: "Overcharge Pulse",
      category: "tower",
      rarity: "rare",
      description: "Shrines occasionally overcharge nearby towers.",
      synergyHint: "Increases burst windows in boss fights.",
      tags: ["shrine", "special", "support"],
      weight: 0.38,
      apply: (state) => {
        state.modifiers.overchargePulseChance += 0.08;
      },
    },
  ],
};

export function createUpgradePool(): UpgradeDefinition[] {
  const specs: UpgradeSpec[] = [];
  const towers: TowerType[] = ["ballista", "frost-obelisk", "bombard", "arc-tower", "shrine"];

  for (const towerType of towers) {
    const label = towerLabel(towerType);
    specs.push({
      id: `${towerType}-damage-core`,
      name: `${label} Damage Core`,
      category: "tower",
      rarity: "common",
      description: `${label} damage +20%.`,
      synergyHint: "Reliable baseline scaling.",
      tags: [towerType, "damage"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.modifiers.towerDamageMultiplier += 0.2;
      },
    });
    specs.push({
      id: `${towerType}-range-core`,
      name: `${label} Long Sight`,
      category: "tower",
      rarity: "common",
      description: `${label} range +15%.`,
      synergyHint: "Better lane uptime.",
      tags: [towerType, "range"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.modifiers.towerRangeMultiplier += 0.15;
      },
    });
    specs.push({
      id: `${towerType}-cadence-core`,
      name: `${label} Cadence`,
      category: "tower",
      rarity: "uncommon",
      description: `${label} attack speed +18%.`,
      synergyHint: "Multiplies damage scaling.",
      tags: [towerType, "attack-speed"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.modifiers.towerAttackSpeedMultiplier += 0.18;
      },
    });
    specs.push({
      id: `${towerType}-utility-core`,
      name: `${label} Utility Matrix`,
      category: "tower",
      rarity: "uncommon",
      description: `${label} status utility improves by 20%.`,
      synergyHint: "Enables stronger status combos.",
      tags: [towerType, "utility"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.modifiers.freezeDurationMultiplier += 0.08;
        state.modifiers.slowStrengthMultiplier += 0.07;
      },
    });

    for (const special of towerSpecialEffects[towerType]) {
      specs.push(special);
    }
  }

  const heroSpecs: UpgradeSpec[] = [
    {
      id: "hero-damage-boost-1",
      name: "Sharpened Resolve",
      category: "hero",
      rarity: "common",
      description: "Hero damage +15%.",
      synergyHint: "Great for lane rescue moments.",
      tags: ["hero", "damage"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.modifiers.heroDamageMultiplier += 0.15;
      },
    },
    {
      id: "hero-damage-boost-2",
      name: "Aggressive Precision",
      category: "hero",
      rarity: "uncommon",
      description: "Hero damage +22%.",
      synergyHint: "Prioritize elites and witches.",
      tags: ["hero", "damage"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.modifiers.heroDamageMultiplier += 0.22;
      },
    },
    {
      id: "hero-attack-speed-1",
      name: "Swift Hands",
      category: "hero",
      rarity: "common",
      description: "Hero attack speed +20%.",
      synergyHint: "Boosts all weapons equally.",
      tags: ["hero", "attack-speed"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.modifiers.heroAttackSpeedMultiplier += 0.2;
      },
    },
    {
      id: "hero-attack-speed-2",
      name: "Relentless Volley",
      category: "hero",
      rarity: "uncommon",
      description: "Hero attack speed +28%.",
      synergyHint: "Synergizes with crit and on-hit effects.",
      tags: ["hero", "attack-speed"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.modifiers.heroAttackSpeedMultiplier += 0.28;
      },
    },
    {
      id: "hero-crit-boost",
      name: "Honed Instinct",
      category: "hero",
      rarity: "uncommon",
      description: "Hero crit chance +12%.",
      synergyHint: "Excellent with shot relic burst.",
      tags: ["hero", "crit"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.hero.stats.critChance += 0.12;
      },
    },
    {
      id: "hero-move-speed",
      name: "Stride of the Warden",
      category: "hero",
      rarity: "common",
      description: "Hero movement speed +14%.",
      synergyHint: "Improves lane rotation.",
      tags: ["hero", "mobility"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.modifiers.heroMoveSpeedMultiplier += 0.14;
      },
    },
    {
      id: "hero-dash-cooldown",
      name: "Dash Reprise",
      category: "hero",
      rarity: "uncommon",
      description: "Dash cooldown reduced by 35%.",
      synergyHint: "Great for emergency defense rotations.",
      tags: ["hero", "ability", "dash"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.ownedUpgradeIds.add("hero-dash-cooldown");
      },
    },
    {
      id: "hero-rune-shock",
      name: "Voltaic Rune",
      category: "hero",
      rarity: "rare",
      description: "Explosive rune applies strong shock.",
      synergyHint: "Pairs with shock death effects.",
      tags: ["hero", "ability", "shock"],
      weight: rarityWeight("rare"),
      apply: (state) => {
        state.ownedUpgradeIds.add("hero-rune-shock");
      },
    },
    {
      id: "hero-freeze-pulse-duration",
      name: "Polar Echo",
      category: "hero",
      rarity: "rare",
      description: "Freezing pulse freeze duration +60%.",
      synergyHint: "Set up bombard kill windows.",
      tags: ["hero", "ability", "freeze"],
      weight: rarityWeight("rare"),
      apply: (state) => {
        state.modifiers.freezeDurationMultiplier += 0.6;
      },
    },
    {
      id: "hero-healing-beacon-boost",
      name: "Beacon Resonance",
      category: "hero",
      rarity: "uncommon",
      description: "Healing beacon restores additional tower health.",
      synergyHint: "Keeps shrine clusters online under pressure.",
      tags: ["hero", "ability", "support"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.ownedUpgradeIds.add("hero-healing-beacon-boost");
      },
    },
    {
      id: "hero-overcharge-extension",
      name: "Extended Overcharge",
      category: "hero",
      rarity: "rare",
      description: "Overcharge aura lasts longer and buffs stronger.",
      synergyHint: "Use before elites or boss phases.",
      tags: ["hero", "ability", "support"],
      weight: rarityWeight("rare"),
      apply: (state) => {
        state.ownedUpgradeIds.add("hero-overcharge-extension");
        state.modifiers.overchargePulseChance += 0.05;
      },
    },
    {
      id: "hero-poison-attacks",
      name: "Venom Coating",
      category: "hero",
      rarity: "rare",
      description: "Hero attacks apply poison.",
      synergyHint: "Sustained damage on high-health enemies.",
      tags: ["hero", "status", "poison"],
      weight: rarityWeight("rare"),
      apply: (state) => {
        state.modifiers.poisonedAttacks = true;
      },
    },
    {
      id: "hero-crit-lightning",
      name: "Storm Crit",
      category: "hero",
      rarity: "rare",
      description: "Critical hits trigger a lightning strike.",
      synergyHint: "Strong with high attack speed builds.",
      tags: ["hero", "crit", "shock"],
      weight: rarityWeight("rare"),
      apply: (state) => {
        state.ownedUpgradeIds.add("hero-crit-lightning");
      },
    },
    {
      id: "hero-mana-efficiency",
      name: "Arcane Conservation",
      category: "hero",
      rarity: "uncommon",
      description: "Ability mana costs reduced by 20%.",
      synergyHint: "Enables frequent active play.",
      tags: ["hero", "mana"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.ownedUpgradeIds.add("hero-mana-efficiency");
      },
    },
    {
      id: "hero-max-health",
      name: "Bastion Vitality",
      category: "hero",
      rarity: "common",
      description: "Hero max health +25%.",
      synergyHint: "Forgiving for risky front-line play.",
      tags: ["hero", "survival"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.hero.stats.maxHealth *= 1.25;
        state.hero.stats.health = Math.min(state.hero.stats.maxHealth, state.hero.stats.health + 35);
      },
    },
    {
      id: "hero-life-on-kill",
      name: "Blood Rite",
      category: "hero",
      rarity: "rare",
      description: "Killing enemies restores hero health.",
      synergyHint: "Encourages aggressive lane cleanup.",
      tags: ["hero", "survival"],
      weight: rarityWeight("rare"),
      apply: (state) => {
        state.ownedUpgradeIds.add("hero-life-on-kill");
      },
    },
    {
      id: "hero-dash-lightning-trail",
      name: "Stormstep",
      category: "hero",
      rarity: "rare",
      description: "Dash leaves a lightning trail.",
      synergyHint: "Great while rotating through dense packs.",
      tags: ["hero", "dash", "shock"],
      weight: rarityWeight("rare"),
      apply: (state) => {
        state.ownedUpgradeIds.add("hero-dash-lightning-trail");
      },
    },
    {
      id: "hero-weapon-swap-bonus",
      name: "Adaptive Arsenal",
      category: "hero",
      rarity: "uncommon",
      description: "Weapon swap grants temporary attack speed.",
      synergyHint: "Rotate tools for burst windows.",
      tags: ["hero", "weapon"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.ownedUpgradeIds.add("hero-weapon-swap-bonus");
      },
    },
  ];

  const economySpecs: UpgradeSpec[] = [
    {
      id: "economy-gold-flow-1",
      name: "Scavenger Ledger",
      category: "economy",
      rarity: "common",
      description: "Gold from all kills +15%.",
      synergyHint: "Supports aggressive early expansion.",
      tags: ["economy", "gold"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.modifiers.economyGoldMultiplier += 0.15;
      },
    },
    {
      id: "economy-gold-flow-2",
      name: "Elite Tax",
      category: "economy",
      rarity: "uncommon",
      description: "Elite enemies drop significantly more gold.",
      synergyHint: "Strong in later biomes.",
      tags: ["economy", "gold", "elite"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.ownedUpgradeIds.add("economy-gold-elite");
      },
    },
    {
      id: "economy-wave-bonus",
      name: "Contract Completion",
      category: "economy",
      rarity: "common",
      description: "Wave clear bonus gold +25%.",
      synergyHint: "Smooths biome transitions.",
      tags: ["economy", "gold", "wave"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.ownedUpgradeIds.add("economy-wave-bonus");
      },
    },
    {
      id: "economy-cheaper-towers-1",
      name: "Field Assembly",
      category: "economy",
      rarity: "common",
      description: "Tower cost -10%.",
      synergyHint: "Faster initial tower grid.",
      tags: ["economy", "tower"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.modifiers.towerCostMultiplier -= 0.1;
      },
    },
    {
      id: "economy-cheaper-towers-2",
      name: "Mass Fabrication",
      category: "economy",
      rarity: "uncommon",
      description: "Tower cost -15%.",
      synergyHint: "Snowballs wide builds.",
      tags: ["economy", "tower"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.modifiers.towerCostMultiplier -= 0.15;
      },
    },
    {
      id: "economy-cheaper-traps",
      name: "Trap Logistics",
      category: "economy",
      rarity: "common",
      description: "Trap cost -18%.",
      synergyHint: "Excellent with push + spike loops.",
      tags: ["economy", "trap"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.modifiers.trapCostMultiplier -= 0.18;
      },
    },
    {
      id: "economy-trap-mana",
      name: "Aether Siphon",
      category: "economy",
      rarity: "uncommon",
      description: "Trap triggers grant mana.",
      synergyHint: "Converts lane control into active abilities.",
      tags: ["economy", "mana", "trap"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.modifiers.economyManaOnTrapTrigger += 3;
      },
    },
    {
      id: "economy-mana-regen",
      name: "Meditation Loop",
      category: "economy",
      rarity: "common",
      description: "Passive mana regeneration increases.",
      synergyHint: "Supports ability-heavy play.",
      tags: ["economy", "mana"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.ownedUpgradeIds.add("economy-mana-regen");
      },
    },
    {
      id: "economy-upgrade-discount",
      name: "Refit Protocol",
      category: "economy",
      rarity: "uncommon",
      description: "Defense refits reduce future tower and trap build costs.",
      synergyHint: "Smooths economy when pivoting defense layouts.",
      tags: ["economy", "upgrade"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.modifiers.towerCostMultiplier = Math.max(0.55, state.modifiers.towerCostMultiplier - 0.08);
        state.modifiers.trapCostMultiplier = Math.max(0.55, state.modifiers.trapCostMultiplier - 0.05);
      },
    },
    {
      id: "economy-sell-refund",
      name: "Recovery Clause",
      category: "economy",
      rarity: "common",
      description: "Sell refund value increases.",
      synergyHint: "Useful for repositioning across biomes.",
      tags: ["economy", "refund"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.ownedUpgradeIds.add("economy-sell-refund");
      },
    },
    {
      id: "economy-starting-gold",
      name: "Prepared Ledger",
      category: "economy",
      rarity: "common",
      description: "Gain immediate bonus gold.",
      synergyHint: "Frontloads opening defense setup.",
      tags: ["economy", "burst"],
      weight: rarityWeight("common"),
      apply: (state) => {
        state.resources.gold += 130;
      },
    },
    {
      id: "economy-essence-bonus",
      name: "Soul Auditor",
      category: "economy",
      rarity: "rare",
      description: "Gain bonus essence from bosses and elites.",
      synergyHint: "Accelerates meta progression.",
      tags: ["economy", "essence"],
      weight: rarityWeight("rare"),
      apply: (state) => {
        state.ownedUpgradeIds.add("economy-essence-bonus");
      },
    },
    {
      id: "economy-combo-dividend",
      name: "Chain Dividend",
      category: "economy",
      rarity: "uncommon",
      description: "Multi-kills grant extra gold.",
      synergyHint: "Pairs with AoE heavy setups.",
      tags: ["economy", "gold", "combo"],
      weight: rarityWeight("uncommon"),
      apply: (state) => {
        state.ownedUpgradeIds.add("economy-combo-dividend");
      },
    },
    {
      id: "economy-boss-bounty",
      name: "Titan Bounty",
      category: "economy",
      rarity: "rare",
      description: "Boss kills grant major gold and mana.",
      synergyHint: "Supports lategame rebuilds.",
      tags: ["economy", "boss"],
      weight: rarityWeight("rare"),
      apply: (state) => {
        state.ownedUpgradeIds.add("economy-boss-bounty");
      },
    },
  ];

  const wildSpecs: UpgradeSpec[] = [
    {
      id: "wild-shock-death-explosion",
      name: "Storm Cascade",
      category: "wild",
      rarity: "wild",
      description: "Shocked enemies explode on death.",
      synergyHint: "Core arc tower build-definer.",
      tags: ["wild", "shock"],
      weight: rarityWeight("wild"),
      apply: (state) => {
        state.modifiers.shockExplosionOnDeath = true;
      },
    },
    {
      id: "wild-poison-spread",
      name: "Virulent Bloom",
      category: "wild",
      rarity: "wild",
      description: "Poison spreads to nearby enemies on tick.",
      synergyHint: "Best with hero poison and flame zones.",
      tags: ["wild", "poison"],
      weight: rarityWeight("wild"),
      apply: (state) => {
        state.ownedUpgradeIds.add("wild-poison-spread");
      },
    },
    {
      id: "wild-double-shot-cycle",
      name: "Rhythmic Barrage",
      category: "wild",
      rarity: "wild",
      description: "All towers fire twice every fourth shot.",
      synergyHint: "Massive multiplicative DPS.",
      tags: ["wild", "tower"],
      weight: rarityWeight("wild"),
      apply: (state) => {
        state.ownedUpgradeIds.add("wild-double-shot-cycle");
      },
    },
    {
      id: "wild-slow-stack",
      name: "Temporal Drag",
      category: "wild",
      rarity: "wild",
      description: "All slow effects stack multiplicatively.",
      synergyHint: "Unlocks extreme control builds.",
      tags: ["wild", "slow"],
      weight: rarityWeight("wild"),
      apply: (state) => {
        state.modifiers.allSlowEffectsStack = true;
      },
    },
    {
      id: "wild-hero-mirror",
      name: "Phantom Volley",
      category: "wild",
      rarity: "wild",
      description: "Hero attacks have a chance to repeat.",
      synergyHint: "Huge with shot relic burst crit chains.",
      tags: ["wild", "hero"],
      weight: rarityWeight("wild"),
      apply: (state) => {
        state.ownedUpgradeIds.add("wild-hero-mirror");
      },
    },
    {
      id: "wild-overcharge-everywhere",
      name: "Networked Shrine",
      category: "wild",
      rarity: "wild",
      description: "Shrine buffs propagate to all towers with reduced power.",
      synergyHint: "Turns support into global scaling.",
      tags: ["wild", "shrine"],
      weight: rarityWeight("wild"),
      apply: (state) => {
        state.ownedUpgradeIds.add("wild-overcharge-everywhere");
      },
    },
    {
      id: "wild-fire-and-frost",
      name: "Thermal Fracture",
      category: "wild",
      rarity: "wild",
      description: "Burning frozen enemies shatter for bonus true damage.",
      synergyHint: "Bombard + Frost keystone combo.",
      tags: ["wild", "combo", "burn", "freeze"],
      weight: rarityWeight("wild"),
      apply: (state) => {
        state.ownedUpgradeIds.add("wild-fire-and-frost");
      },
    },
    {
      id: "wild-mana-overflow",
      name: "Unbound Aether",
      category: "wild",
      rarity: "wild",
      description: "Mana above cap converts into periodic shock pulses.",
      synergyHint: "Use with trap mana loops.",
      tags: ["wild", "mana", "shock"],
      weight: rarityWeight("wild"),
      apply: (state) => {
        state.ownedUpgradeIds.add("wild-mana-overflow");
      },
    },
    {
      id: "wild-lane-echo",
      name: "Echoed Defenses",
      category: "wild",
      rarity: "wild",
      description: "Towers occasionally repeat attacks in nearby lane nodes.",
      synergyHint: "Amplifies choke-point clusters.",
      tags: ["wild", "tower", "lane"],
      weight: rarityWeight("wild"),
      apply: (state) => {
        state.ownedUpgradeIds.add("wild-lane-echo");
      },
    },
    {
      id: "wild-final-stand",
      name: "Last Bastion",
      category: "wild",
      rarity: "wild",
      description: "When core health is low, all towers and hero gain major buffs.",
      synergyHint: "Clutch comeback potential.",
      tags: ["wild", "survival"],
      weight: rarityWeight("wild"),
      apply: (state) => {
        state.ownedUpgradeIds.add("wild-final-stand");
      },
    },
  ];

  specs.push(...heroSpecs, ...economySpecs, ...wildSpecs);

  if (specs.length !== 72) {
    throw new Error(`Upgrade pool must contain exactly 72 entries, got ${specs.length}`);
  }

  return specs.map(toUpgrade);
}
