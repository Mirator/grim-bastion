# Hero Combat and Loadouts

## Purpose

Define implemented hero combat behavior: movement, aiming, attacks, abilities, cooldown/mana constraints, and loadout cycling.

## What It Does

- Gives the player an active lane-intervention role alongside automated defenses.
- Supports three weapons with distinct targeting/output patterns.
- Provides survivability and control abilities with upgrade-driven modifiers.
- Uses fixed loadout presets that rotate on command.

## How It Works

- Movement and facing:
  - Movement input is camera-relative and clamped to arena bounds.
  - Hero collision resolves against hero blockers (obstacles, towers, core structure).
  - Facing tracks reticle direction when valid.
- Primary attacks (disabled in `build` mode):
  - `crossbow`: single bolt projectile.
  - `arc-gauntlet`: chain lightning only if strict cursor target exists in range; otherwise attack can whiff while still consuming cadence.
  - `shot-relic`: five spread projectiles per attack.
  - Aim direction is resolved from reticle to hero (fallback to facing only when needed).
  - Proc payloads (poison / crit-lightning) are attached only to designated projectile roles (crossbow primary, shot-relic center pellet).
  - `wild-hero-mirror` can add an extra mirror bolt on chance.
- Attack cadence:
  - Cooldown is `max(0.04, 1 / finalAttackSpeed)`.
  - Final attack speed includes hero base attack speed, modifiers, and final-stand multiplier when active.
- Abilities:
  - `dash`: 5.5-unit displacement over short motion window, brief invulnerability, optional lightning pulse on dash end (`hero-dash-lightning-trail`).
  - `explosive-rune`: reticle-targeted AoE damage plus shock.
  - `freezing-pulse`: hero-centered freeze + slow application.
  - `healing-beacon`: self-heal and nearby tower repair.
  - `overcharge-aura`: temporary tower overcharge window (duration can be extended by upgrade).
- Cooldowns and mana:
  - Cast requires hero alive, ability cooldown <= 0, and enough mana for base cost check.
  - `hero-mana-efficiency` reduces mana spent after the cast check.
  - `hero-dash-cooldown` reduces dash cooldown.
- Loadouts:
  - `L` cycles three fixed presets:
    - Preset 1: `crossbow` + `explosive-rune` / `freezing-pulse`
    - Preset 2: `arc-gauntlet` + `healing-beacon` / `overcharge-aura`
    - Preset 3: `shot-relic` + `dash` / `explosive-rune`
  - `R` cycles weapon independently through all weapon archetypes.
- Survival loop:
  - Enemy contact deals damage over time on overlap.
  - On death, hero respawns after 6s at 60% max health.

## Key Rules

- Hero cannot cast abilities when dead or while ability cooldown/mana checks fail.
- Primary fire is mode-gated off in `build`.
- Arc-gauntlet is strict-cursor-target dependent (no soft lock fallback target acquisition).
- Dash invulnerability and dash lightning are separate effects.
- Loadout switching is preset-driven, not free slot editing.

## Dependencies

- Hero movement/attack/ability loop: [GameApp](../../src/game/GameApp.ts)
- Weapon and ability baselines: [archetypes](../../src/game/data/archetypes.ts)
- Cursor targeting and projectile proc rules: [gameplayRules](../../src/game/systems/gameplayRules.ts)
- Damage/status resolution: [StatusSystem](../../src/game/systems/StatusSystem.ts)
- Related specs:
  - [Input and Targeting](./input-and-targeting.md)
  - [Status Effects and Hazards](./status-effects-and-hazards.md)
  - [Upgrades and Synergies](./upgrades-and-synergies.md)

## Tuning Notes

- Core levers: attack cadence, weapon multipliers, crit chance, ability radii, and cooldowns.
- Dash feel is governed by dash distance, motion duration, and invulnerability window.
- Preset identity currently emphasizes precision/control, support/control, and burst mobility mixes.
