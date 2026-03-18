import type { EnemyState, MutableGameState, StatusStack, StatusType } from "../types";
import { computeStatusMoveMultiplier } from "./gameplayRules";

function statusTickDamage(type: StatusType, intensity: number): number {
  switch (type) {
    case "burn":
      return 7 * intensity;
    case "poison":
      return 5 * intensity;
    case "shock":
      return 0;
    case "freeze":
      return 0;
    case "slow":
      return 0;
  }
}

export class StatusSystem {
  addStatus(enemy: EnemyState, status: StatusStack): void {
    const existing = enemy.statuses.find((entry) => entry.type === status.type && entry.sourceId === status.sourceId);
    if (existing) {
      existing.intensity = Math.max(existing.intensity, status.intensity);
      existing.duration = Math.max(existing.duration, status.duration);
      return;
    }

    if (status.type === "freeze") {
      enemy.freezeBuildup += status.intensity;
    }

    enemy.statuses.push(status);
  }

  update(state: MutableGameState, dt: number): void {
    for (const enemy of state.enemies) {
      if (enemy.isDead) {
        continue;
      }

      let slowMultiplier = 1;
      let shockVulnerable = 1;

      for (const status of enemy.statuses) {
        status.duration -= dt;
        if (status.duration <= 0) {
          continue;
        }

        if (status.type === "slow") {
          const baseSlow = 1 - Math.min(0.75, 0.12 * status.intensity * (1 + state.modifiers.slowStrengthMultiplier));
          slowMultiplier = state.modifiers.allSlowEffectsStack ? slowMultiplier * baseSlow : Math.min(slowMultiplier, baseSlow);
        }

        if (status.type === "shock") {
          shockVulnerable += 0.1 + state.modifiers.shockVulnerabilityBonus;
        }

        const dotDamage = statusTickDamage(status.type, status.intensity);
        if (dotDamage > 0) {
          this.damageEnemy(state, enemy, dotDamage * dt * shockVulnerable, `${status.type}-dot`);
          if (enemy.isDead) {
            break;
          }

          if (status.type === "poison" && state.ownedUpgradeIds.has("wild-poison-spread")) {
            this.spreadPoison(state, enemy, status.intensity * 0.45, status.duration * 0.65);
          }
        }
      }

      if (enemy.isDead) {
        continue;
      }

      enemy.statuses = enemy.statuses.filter((entry) => entry.duration > 0);
      let hasFreeze = enemy.statuses.some((entry) => entry.type === "freeze");

      if (enemy.freezeBuildup >= 100 && !hasFreeze) {
        enemy.freezeBuildup = 0;
        enemy.statuses.push({
          type: "freeze",
          intensity: 1,
          duration: 1.4 * (1 + state.modifiers.freezeDurationMultiplier),
          sourceId: "freeze-threshold",
        });
        hasFreeze = true;
      }

      if (state.ownedUpgradeIds.has("frost-spreading-freeze")) {
        this.applyFrostSpreadingFreeze(state, enemy, dt, hasFreeze);
      } else {
        enemy.freezePulseTimer = 0;
      }

      if (state.ownedUpgradeIds.has("wild-fire-and-frost")) {
        this.applyThermalFracture(state, enemy, dt, hasFreeze);
      } else {
        enemy.thermalFractureTimer = 0;
      }

      enemy.movementSpeedMultiplier = computeStatusMoveMultiplier(slowMultiplier, hasFreeze);
    }
  }

  damageEnemy(state: MutableGameState, enemy: EnemyState, damage: number, sourceId: string): void {
    if (enemy.isDead) {
      return;
    }

    const freezeBonus = enemy.statuses.some((entry) => entry.type === "freeze") && sourceId.includes("splash") ? 1.25 : 1;
    const finalDamage = damage * freezeBonus;
    enemy.stats.health -= finalDamage;
    state.runStats.damageDealt += finalDamage;

    if (enemy.stats.health <= 0) {
      enemy.isDead = true;
      enemy.deathOutcome ??= "killed";
      this.handleEnemyDeath(state, enemy);
    }
  }

  private applyFrostSpreadingFreeze(state: MutableGameState, enemy: EnemyState, dt: number, hasFreeze: boolean): void {
    enemy.freezePulseTimer = Math.max(0, enemy.freezePulseTimer - dt);
    if (!hasFreeze || enemy.freezePulseTimer > 0) {
      return;
    }

    enemy.freezePulseTimer = 0.65;
    for (const other of state.enemies) {
      if (other.isDead || other.id === enemy.id) {
        continue;
      }
      const dx = other.position.x - enemy.position.x;
      const dz = other.position.z - enemy.position.z;
      if (dx * dx + dz * dz > 4 * 4) {
        continue;
      }
      other.freezeBuildup += 20;
      this.addStatus(other, {
        type: "slow",
        intensity: 0.65,
        duration: 1.2,
        sourceId: `frost-spread:${enemy.id}`,
      });
    }
  }

  private applyThermalFracture(state: MutableGameState, enemy: EnemyState, dt: number, hasFreeze: boolean): void {
    enemy.thermalFractureTimer = Math.max(0, enemy.thermalFractureTimer - dt);
    if (!hasFreeze || enemy.thermalFractureTimer > 0) {
      return;
    }

    const hasBurn = enemy.statuses.some((status) => status.type === "burn");
    if (!hasBurn) {
      return;
    }

    enemy.thermalFractureTimer = 0.9;
    this.damageEnemy(state, enemy, 12, "thermal-fracture");
  }

  private spreadPoison(state: MutableGameState, origin: EnemyState, intensity: number, duration: number): void {
    for (const other of state.enemies) {
      if (other.id === origin.id || other.isDead) {
        continue;
      }
      const dx = other.position.x - origin.position.x;
      const dz = other.position.z - origin.position.z;
      if (dx * dx + dz * dz > 7 * 7) {
        continue;
      }
      this.addStatus(other, {
        type: "poison",
        intensity,
        duration,
        sourceId: `poison-spread:${origin.id}`,
      });
    }
  }

  private handleEnemyDeath(state: MutableGameState, enemy: EnemyState): void {
    state.runStats.kills += 1;

    if (state.modifiers.shockExplosionOnDeath && enemy.statuses.some((entry) => entry.type === "shock")) {
      for (const candidate of state.enemies) {
        if (candidate.isDead || candidate.id === enemy.id) {
          continue;
        }
        const dx = candidate.position.x - enemy.position.x;
        const dz = candidate.position.z - enemy.position.z;
        if (dx * dx + dz * dz <= 3.8 * 3.8) {
          this.damageEnemy(state, candidate, 26, "shock-explosion");
          this.addStatus(candidate, {
            type: "shock",
            intensity: 1,
            duration: 1.25,
            sourceId: "shock-explosion",
          });
        }
      }
    }

    if (state.ownedUpgradeIds.has("hero-life-on-kill")) {
      state.hero.stats.health = Math.min(state.hero.stats.maxHealth, state.hero.stats.health + 3.5);
    }
  }
}
