# Hero Combat and Loadouts

## Purpose

Define the hero's active-combat role, including movement, attacks, abilities, cooldown economy, and loadout identity.

## What It Does

- Gives the player direct lane intervention between automated defenses.
- Supports multiple weapon profiles and ability combinations.
- Provides clutch tools (dash, freeze, healing, overcharge) for threat spikes.
- Adds rotational depth through loadout and weapon switching.

## How It Works

- Movement:
  - Hero movement speed is driven by base stats and multipliers.
  - Position is clamped to arena bounds for readable combat space.
- Attacks:
  - Primary fire is weapon-dependent.
  - `crossbow`: focused projectile shot.
  - `arc-gauntlet`: short-range chain damage.
  - `shot-relic`: burst spread pattern.
  - Targeting uses soft-lock prioritization near reticle and within weapon range.
- Abilities:
  - `dash`: displacement plus brief invulnerability, with optional lightning trail synergies.
  - `explosive-rune`: targeted area burst with shock application.
  - `freezing-pulse`: close-range freeze/slow crowd control.
  - `healing-beacon`: hero sustain and local tower repair.
  - `overcharge-aura`: temporary support window that boosts defense throughput.
- Cooldowns and mana:
  - Abilities require both available mana and zero cooldown.
  - Mana regenerates passively and is capped.
  - Selected upgrades reduce costs/cooldowns or amplify effects.
- Survival:
  - Hero can be downed by contact damage, then respawns after a delay with partial health.

## Key Rules

- Hero cannot cast abilities when dead, on cooldown, or below mana cost.
- Primary fire in `build` mode does not trigger attack behavior.
- Ability effects are intentionally role-distinct: mobility, burst, control, sustain, team buff.
- Loadout switching changes both weapon and ability pair identity to reshape playstyle mid-run.

## Dependencies

- Hero loop and casting: [GameApp](../../src/game/GameApp.ts)
- Weapon and ability definitions: [archetypes](../../src/game/data/archetypes.ts)
- Status application and damage outcomes: [StatusSystem](../../src/game/systems/StatusSystem.ts)
- Related specs:
  - [Input and Targeting](./input-and-targeting.md)
  - [Status Effects and Hazards](./status-effects-and-hazards.md)
  - [Upgrades and Synergies](./upgrades-and-synergies.md)

## Tuning Notes

- Key balance levers are attack cadence, base damage multipliers, ability radius, and cooldown windows.
- Respawn timing strongly affects punishment curve without forcing instant run failure.
- Loadout preset composition should maintain distinct fantasy: precision, support-control, or burst mobility.
