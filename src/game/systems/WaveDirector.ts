import { biomeSequence } from "../data/biomes";
import type { EnemyType, MutableGameState, WaveTemplate } from "../types";

export interface WaveDirectorHooks {
  spawnEnemy: (enemyType: EnemyType, laneId: string, isElite: boolean, isBoss: boolean) => void;
  onWaveCleared: () => void;
  onBiomeCleared: () => void;
  onRunCompleted: () => void;
}

export class WaveDirector {
  private hooks: WaveDirectorHooks;

  constructor(hooks: WaveDirectorHooks) {
    this.hooks = hooks;
  }

  startCurrentWave(state: MutableGameState): void {
    const biome = biomeSequence[state.currentBiomeIndex];
    if (!biome) {
      return;
    }

    const template = biome.waveTemplates[state.wave.waveIndexInBiome];
    if (!template) {
      return;
    }

    state.mode = "wave";
    state.wave.active = true;
    state.wave.globalWaveNumber += 1;
    state.wave.bossSpawned = false;
    state.wave.enemiesRemainingEstimate = 0;
    state.wave.clearDelay = 0;
    state.wave.spawnQueue = template.groups.map((group) => {
      state.wave.enemiesRemainingEstimate += group.count;
      return {
        group,
        remaining: group.count,
        timer: 0,
        spawned: 0,
      };
    });

    if (template.boss) {
      state.wave.enemiesRemainingEstimate += 1;
    }
  }

  update(state: MutableGameState, dt: number): void {
    if (!state.wave.active) {
      return;
    }

    const biome = biomeSequence[state.currentBiomeIndex];
    if (!biome) {
      return;
    }
    const template = biome.waveTemplates[state.wave.waveIndexInBiome];
    if (!template) {
      return;
    }

    for (const queueEntry of state.wave.spawnQueue) {
      queueEntry.timer -= dt;
      if (queueEntry.remaining <= 0 || queueEntry.timer > 0) {
        continue;
      }

      const shouldElite = queueEntry.group.eliteEvery > 0 && queueEntry.spawned > 0 && queueEntry.spawned % queueEntry.group.eliteEvery === 0;
      this.hooks.spawnEnemy(queueEntry.group.enemyType, queueEntry.group.laneId, shouldElite, false);
      queueEntry.spawned += 1;
      queueEntry.remaining -= 1;
      queueEntry.timer = queueEntry.group.spawnInterval;
    }

    const queueDone = state.wave.spawnQueue.every((entry) => entry.remaining <= 0);

    if (queueDone && template.boss && !state.wave.bossSpawned && !state.enemies.some((enemy) => enemy.isBoss && !enemy.isDead)) {
      this.hooks.spawnEnemy(template.boss, template.groups[0]?.laneId ?? biome.lanes[0]?.id ?? "lane-0", true, true);
      state.wave.bossSpawned = true;
    }

    const livingEnemies = state.enemies.filter((enemy) => !enemy.isDead).length;
    state.wave.enemiesRemainingEstimate = livingEnemies + state.wave.spawnQueue.reduce((sum, entry) => sum + Math.max(0, entry.remaining), 0);

    if (queueDone && livingEnemies === 0) {
      state.wave.clearDelay += dt;
      if (state.wave.clearDelay >= 1.25) {
        this.finishWave(state);
      }
    }
  }

  private finishWave(state: MutableGameState): void {
    state.wave.active = false;
    state.mode = "upgrade";
    state.wave.clearDelay = 0;
    state.runStats.wavesCleared += 1;
    this.hooks.onWaveCleared();

    const biome = biomeSequence[state.currentBiomeIndex];
    if (!biome) {
      return;
    }

    const completedBiome = state.wave.waveIndexInBiome >= biome.waveTemplates.length - 1;
    if (completedBiome) {
      state.currentBiomeIndex += 1;
      state.wave.waveIndexInBiome = 0;
      if (state.currentBiomeIndex >= biomeSequence.length) {
        this.hooks.onRunCompleted();
        return;
      }
      this.hooks.onBiomeCleared();
      return;
    }

    state.wave.waveIndexInBiome += 1;
  }
}

export function currentWaveTemplate(state: MutableGameState): WaveTemplate {
  const biome = biomeSequence[state.currentBiomeIndex] ?? biomeSequence[biomeSequence.length - 1]!;
  return biome.waveTemplates[state.wave.waveIndexInBiome] ?? biome.waveTemplates[biome.waveTemplates.length - 1]!;
}
