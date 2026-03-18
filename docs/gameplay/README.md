# Gameplay Specs

This folder documents implemented gameplay systems in Grim Bastion at design-detail depth.
It standardizes shared vocabulary and links each gameplay part to its dedicated specification.

## Mode Flow Map

```text
menu -> build -> wave -> upgrade -> build/between-biomes -> victory/game-over
```

## Standard Vocabulary

- Modes: `menu`, `build`, `wave`, `upgrade`, `between-biomes`, `victory`, `game-over`.
- Resources: `gold` (build economy), `mana` (active abilities), `essence` (meta progression).
- Archetypes: data-defined templates for enemies, towers, traps, weapons, and abilities.
- Upgrade Groups: `tower`, `hero`, `economy`, and `wild`.

## Gameplay Part Index

- [Run Loop and Modes](./run-loop-and-modes.md)
- [Input and Targeting](./input-and-targeting.md)
- [Hero Combat and Loadouts](./hero-combat-and-loadouts.md)
- [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)
- [Enemies, Waves, and Bosses](./enemies-waves-and-bosses.md)
- [Status Effects and Hazards](./status-effects-and-hazards.md)
- [Upgrades and Synergies](./upgrades-and-synergies.md)
- [Economy and Rewards](./economy-and-rewards.md)
- [Biomes and Encounter Design](./biomes-and-encounter-design.md)
- [Meta Progression and Save](./meta-progression-and-save.md)
- [HUD and Feedback](./hud-and-feedback.md)

## Source-of-Truth Code Anchors

- [GameApp](../../src/game/GameApp.ts)
- [Gameplay Rules](../../src/game/systems/gameplayRules.ts)
- [Archetypes](../../src/game/data/archetypes.ts)
- [Biomes](../../src/game/data/biomes.ts)
- [Upgrades](../../src/game/data/upgrades.ts)
