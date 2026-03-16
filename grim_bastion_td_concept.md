# Grim Bastion — Game Design Document

## 1. Executive Overview

**Grim Bastion** is a low‑poly 3D **roguelite tower defense with action‑RPG elements**.

Players defend a magical fortress core against waves of corrupted enemies. Between waves they construct defenses, choose roguelite upgrades, and reposition their hero. During waves they actively fight alongside towers to stabilize lanes and prevent breakthroughs.

The design focuses on:

- **Low production complexity (low‑poly stylized art)**
- **Deep emergent gameplay from tower synergies**
- **Replayability through roguelite upgrades**
- **Active player engagement via hero combat**

Inspirations include:

- Orcs Must Die
- Rogue Tower
- Dungeon Defenders
- Risk of Rain (upgrade design philosophy)

Target platform: **PC (Steam)**.

Primary player fantasy:

> "Build clever defenses, discover broken synergies, and survive overwhelming waves."

---

# 2. Core Design Pillars

## 2.1 Synergy Over Quantity

The game avoids large content catalogs. Instead it focuses on **interactions between a small number of systems**.

Examples:

- freeze + bombard splash
- lightning + wet enemies
- push traps + spike traps

Players should constantly discover new combinations.

---

## 2.2 Active Defense

Players are not passive observers.

They:

- attack enemies
- trigger abilities
- rescue collapsing lanes
- support tower performance

The hero adds **moment‑to‑moment decision pressure**.

---

## 2.3 Short Replayable Runs

Runs last **25–35 minutes**.

Each run should feel different because of:

- randomized upgrades
- different enemy modifiers
- different build paths

---

## 2.4 Readable Low‑Poly Visual Style

The visual style prioritizes:

- strong silhouettes
- clear color coding
- readable battlefield
- atmospheric lighting

This reduces production cost while improving gameplay clarity.

---

# 3. Player Experience

## 3.1 Player Fantasy

The player becomes a **warden of a magical fortress** defending the last safe bastion against corrupted forces.

They are both:

- a battlefield commander
- a combatant within the defense

---

## 3.2 Emotional Beats

A good run should create the following emotional arc:

1. Early setup and experimentation
2. Discovering powerful upgrades
3. Mid‑run pressure as enemy waves intensify
4. Near‑collapse moments where the hero saves the defense
5. A climactic boss fight
6. Post‑run progression and reflection

---

# 4. Core Gameplay Loop

## 4.1 Macro Loop (Meta Progression)

```text
start run
→ survive waves
→ gain upgrades
→ defeat boss or die
→ earn meta currency
→ unlock new content
→ start next run
```

---

## 4.2 Run Loop

```text
prepare defenses
→ wave begins
→ player fights alongside towers
→ enemies drop rewards
→ wave ends
→ choose upgrade
→ rebuild defenses
→ next wave
```

---

# 5. Game Structure

## 5.1 Run Length

Typical run:

- 3 biomes
- 3–4 waves per biome
- final boss

Estimated runtime:

**25–35 minutes**.

---

## 5.2 Difficulty Curve

Each biome introduces:

- new enemies
- stronger modifiers
- environmental hazards

Wave pressure increases through:

- higher enemy counts
- elites
- faster enemies

---

# 6. Player Character

## 6.1 Role

The hero supports defenses rather than replacing them.

Primary responsibilities:

- eliminating priority targets
- stabilizing collapsing lanes
- activating abilities

---

## 6.2 Hero Stats

- health
- attack damage
- attack speed
- crit chance
- movement speed

---

## 6.3 Equipment System

Hero has **three slots**:

- weapon
- ability 1
- ability 2

---

## 6.4 Weapons

### Crossbow
Balanced ranged weapon.

### Arc Gauntlet
Short range lightning weapon that chains between enemies.

### Shot Relic
Short range burst weapon ideal for elites.

---

## 6.5 Abilities

Examples:

Dash
- mobility tool

Explosive Rune
- AoE damage

Freezing Pulse
- area crowd control

Healing Beacon
- tower repair and healing

Overcharge Aura
- temporary tower buff

---

# 7. Towers and Traps

## 7.1 Tower Design Philosophy

Towers are designed around **clear battlefield roles** and **strong interactions**. Each tower should:

- solve a specific tactical problem
- interact with at least one status effect
- scale through upgrades
- combine with other towers to create emergent strategies

Instead of large numbers of towers, depth comes from:

- positioning
- synergy
- upgrades

---

## 7.2 Core Tower Roster

The base game includes a small roster of towers that form the foundation of most builds.

| Tower | Role | Base Damage | Range | Fire Rate | Special Mechanic |
|------|------|-------------|------|-----------|------------------|
| Ballista | Single-target DPS | Medium | Long | Medium | Bonus damage to elites |
| Frost Obelisk | Crowd control | Low | Medium | Slow | Applies freeze buildup |
| Bombard | AoE siege | High | Medium | Slow | Splash explosion damage |
| Arc Tower | Chain damage | Medium | Medium | Medium | Lightning jumps between enemies |
| Shrine | Support | None | Medium aura | Passive | Buffs nearby towers |

---

## 7.3 Trap Roster

Traps provide **positional battlefield control** and often create the strongest synergy chains.

| Trap | Role | Trigger | Cooldown | Special Effect |
|-----|------|---------|----------|---------------|
| Spike Trap | Burst damage | Ground | Medium | High damage burst |
| Push Trap | Displacement | Ground | Short | Pushes enemies backwards |
| Flame Trap | Area denial | Ground | Medium | Leaves burning ground |

---

## 7.4 Detailed Tower Specifications

### Ballista

Role: single-target damage and elite removal

Base stats:

- damage: medium
- range: long
- fire rate: moderate

Special rule:

- deals +50% damage to elite enemies

Upgrade examples:

- piercing bolts
- critical strikes
- double shot every 5 attacks

Strategic use:

- eliminate priority enemies
- defend long straight lanes

---

### Frost Obelisk

Role: battlefield control

Base stats:

- damage: low
- range: medium
- attack speed: slow

Special rule:

- applies freeze buildup

When buildup reaches threshold:

- enemy freezes temporarily

Upgrade examples:

- freeze spreads to nearby enemies
- frozen enemies take bonus damage
- increased freeze duration

Strategic use:

- combine with AoE towers
- stall dangerous waves

---

### Bombard

Role: large-scale wave clearing

Base stats:

- damage: high
- range: medium
- fire rate: slow

Special rule:

- splash explosion damage

Upgrade examples:

- explosions leave burning ground
- double explosion radius
- bonus damage to frozen targets

Strategic use:

- choke points
- synergy with slow effects

---

### Arc Tower

Role: chain damage

Base stats:

- damage: medium
- range: medium
- fire rate: medium

Special rule:

- lightning chains between enemies

Upgrade examples:

- chain hits more targets
- shock effect applies vulnerability
- lightning strikes ground on enemy death

Strategic use:

- dense enemy waves
- combo with wet or frozen enemies

---

### Shrine

Role: support tower

Base stats:

- no direct damage

Effect:

- buffs nearby towers

Buff examples:

- increased attack speed
- increased range
- increased status effect chance

Upgrade examples:

- aura radius increases
- buffs stack with multiple shrines
- shrine occasionally overcharges towers

Strategic use:

- central build anchor
- amplify strong tower clusters

---

## 7.5 Tower Upgrade Structure

Each tower supports **three upgrade paths**.

Example structure:

| Path | Focus | Example Upgrade |
|----|----|----|
| Damage Path | raw DPS | +30% attack damage |
| Utility Path | control | status effect duration increased |
| Special Path | unique mechanics | attacks split or chain |

Players can specialize towers depending on the run.

---

## 7.6 Tower Synergy Examples

Example combo chains:

Slow + AoE

```text
frost obelisk → enemies cluster → bombard splash damage
```

Displacement traps

```text
push trap → enemies knocked back → spike trap triggers again
```

Status reactions

```text
freeze → bombard → bonus splash damage
```

Shock explosions

```text
arc tower → shocked enemy dies → chain explosion
```

These interactions create the **emergent gameplay depth** central to the game.

---

# 8. Status Effects


Status effects drive most build interactions.

## Core Effects

- burn
- freeze
- poison
- shock
- slow

Example interaction:

- frozen enemies take increased splash damage
- shocked enemies explode on death

---

# 9. Enemy Design

Enemies must be visually readable.

## Enemy Types

### Grunt
Standard melee enemy.

### Hound
Fast enemy that pressures weak lanes.

### Brute
Slow tank enemy.

### Witch
Support enemy that buffs allies.

### Wisp
Flying enemy ignoring ground traps.

### Juggernaut
Elite enemy with high durability.

### Boss
Biome capstone challenge.

---

# 10. Biomes

## Ruined Gate

Linear map teaching choke point defense.

## Frozen Pass

Split lanes with elevation changes.

## Blight Marsh

Open chaotic map with multiple pressure points.

Each biome introduces different strategic problems.

---

# 11. Roguelite Upgrade System

Upgrades appear after waves.

Player chooses **one of three options**.

---

## Tower Upgrades

Examples:

- frost towers double slow duration
- bombard explosions leave fire pools
- shrines buff additional towers

---

## Hero Upgrades

Examples:

- dash leaves lightning trail
- crits reduce ability cooldowns

---

## Economy Upgrades

Examples:

- elites drop bonus gold
- traps generate mana

---

## Build‑Defining Upgrades

These radically alter runs.

Examples:

- shocked enemies explode on death
- poison spreads between enemies

---

# 12. Meta Progression

Meta progression unlocks variety rather than raw power.

Unlockables:

- new towers
- new hero abilities
- new upgrade cards
- harder difficulties

---

# 13. Art Direction

## Style

Low‑poly stylized fantasy.

Characteristics:

- bold geometry
- bright color coding
- stylized lighting

---

## Visual Clarity

Players must instantly recognize:

- enemy roles
- tower functions
- dangerous threats

---

# 14. Audio Design

Audio communicates battlefield information.

Examples:

- tower firing sounds
- enemy death cues
- elite warning sounds
- boss introduction music

---

# 15. Technical Architecture

## Engine

Three.js with TypeScript.

## Supporting Libraries

- Rapier (physics)
- Howler (audio)

---

## Systems

Core gameplay systems:

- wave system
- targeting system
- combat system
- status effect system
- upgrade system

---

# 16. Performance Considerations

Tower defense games can spawn hundreds of entities.

Optimization strategies:

- object pooling
- instanced meshes
- limited dynamic lighting
- simple collision volumes

---

# 17. MVP Development Plan

## Month 1

Movement, enemy spawning, pathfinding.

## Month 2

Tower placement and combat.

## Month 3

Wave system and upgrades.

## Month 4

Second map and additional enemies.

## Month 5

Polish and visual feedback.

## Month 6

Balancing and demo release.

---

# 18. Prototype Success Criteria

Before expanding development, the prototype must prove:

1. tower placement is fun
2. waves create tension
3. tower synergy feels powerful
4. hero combat feels responsive
5. upgrades change strategy

If these succeed, the game has a strong foundation for expansion.

---

# 19. Why This Project Is Feasible

The project scope is intentionally constrained.

Advantages:

- low art complexity
- reusable assets
- systemic gameplay depth
- strong replayability

Even a small launch version can feel complete with:

- 2 biomes
- 6 towers
- 1 hero
- 1 boss

This makes the project achievable for a **solo developer or small team**.


---

# 20. Enemy Behavior Specifications

Enemies follow clearly defined AI behaviors to create tactical variety.

| Enemy | Health | Speed | Behavior | Special Ability | Counter Strategy |
|------|-------|------|----------|-----------------|-----------------|
| Grunt | Low | Medium | Follows path directly | None | Basic DPS towers |
| Hound | Low | Very Fast | Prioritizes weak lanes | Dodge chance | Slow / freeze |
| Brute | High | Slow | Tanks damage | Damage resistance | Single-target DPS |
| Witch | Medium | Medium | Stays behind enemies | Buffs nearby enemies | Focus fire / hero |
| Wisp | Low | Fast | Flying path ignoring ground traps | Phase movement | Anti-air towers |
| Juggernaut | Very High | Slow | Breaks through choke points | Shockwave on death | Burst damage |
| Boss | Extreme | Slow | Multi-phase encounter | Unique per biome | Mixed strategy |

Enemy AI rules:

- enemies follow navigation path
- if path blocked they recalculate route
- elites gain simple tactical behavior (target shrines, destroy traps)

---

# 21. Roguelite Upgrade Pool

Upgrade pool contains **60–80 potential upgrades**.

Upgrades are divided into categories.

## Tower Upgrades

Examples:

- towers gain +20% damage
- frost effects last 40% longer
- lightning chains hit 2 additional targets
- bombard explosions leave fire zones

## Hero Upgrades

Examples:

- dash cooldown reduced
- hero attacks apply poison
- critical hits trigger lightning strike

## Economy Upgrades

Examples:

- enemies drop additional gold
- towers cost less
- traps generate mana

## Wild Upgrades (rare)

Examples:

- enemies explode on death
- towers attack twice every 4 shots
- all slow effects stack

Rare upgrades dramatically change run strategies.

---

# 22. Economy System

Resources drive the pacing of tower placement and upgrades.

Primary resources:

| Resource | Purpose |
|--------|--------|
| Gold | build and upgrade towers |
| Mana | activate hero abilities |
| Essence | meta progression currency |

Gold sources:

- enemy kills
- wave completion
- elite enemies

Scaling model:

- enemy health increases each wave
- gold rewards increase slightly slower

This forces players to make **strategic spending decisions**.

Example formula:

```
enemy_health = base_health * (1 + wave * 0.15)
```

---

# 23. Wave Generation System

Waves are generated from predefined templates.

Wave parameters:

- enemy type
- spawn count
- spawn rate
- elite modifiers

Example wave progression:

| Wave | Composition |
|-----|-------------|
| 1 | basic grunts |
| 2 | grunts + hounds |
| 3 | armored brutes |
| 4 | mixed wave |
| 5 | elite enemy |

Biome waves introduce unique enemy combinations.

Boss waves occur at the end of each biome.

Boss mechanics example:

- phase 1: spawn minions
- phase 2: area attacks
- phase 3: enraged mode

---

# 24. User Interface and UX

Clear interface is critical for tower defense games.

## Core UI Elements

- resource display
- wave indicator
- tower build menu
- hero ability cooldowns
- minimap

## Build Mode

When placing towers:

- valid tiles highlight
- range indicator visible
- cost preview shown

## Upgrade Selection

After waves, player selects 1 of 3 upgrades.

Display includes:

- icon
- short description
- synergy hints

## Combat Feedback

Important visual feedback:

- damage numbers
- status effect icons
- elite enemy indicators
- boss health bar

Good UI ensures players understand the battlefield instantly.

