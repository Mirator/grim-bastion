import { describe, expect, it } from "vitest";
import { biomeSequence } from "../src/game/data/biomes";
import { WaveDirector } from "../src/game/systems/WaveDirector";
import { makeTestState } from "./testState";

describe("wave director", () => {
  it("creates spawn queue when wave starts", () => {
    const state = makeTestState();
    const wave = new WaveDirector({
      spawnEnemy: () => true,
      onWaveCleared: () => {
        // test hook
      },
      onBiomeCleared: () => {
        // test hook
      },
      onRunCompleted: () => {
        // test hook
      },
    });

    wave.startCurrentWave(state);
    expect(state.wave.active).toBe(true);
    expect(state.wave.spawnQueue.length).toBeGreaterThan(0);
  });

  it("keeps mode in upgrade on biome completion and defers transition to hook handlers", () => {
    const state = makeTestState();
    state.mode = "wave";
    state.currentBiomeIndex = 0;
    state.wave.active = true;
    state.wave.waveIndexInBiome = biomeSequence[0]!.waveTemplates.length - 1;
    state.wave.spawnQueue = [];
    state.enemies = [];
    state.wave.clearDelay = 1.24;

    let waveCleared = 0;
    let biomeCleared = 0;
    const director = new WaveDirector({
      spawnEnemy: () => true,
      onWaveCleared: () => {
        waveCleared += 1;
      },
      onBiomeCleared: () => {
        biomeCleared += 1;
      },
      onRunCompleted: () => {
        // no-op
      },
    });

    director.update(state, 0.02);

    expect(waveCleared).toBe(1);
    expect(biomeCleared).toBe(1);
    expect(state.mode).toBe("upgrade");
    expect(state.currentBiomeIndex).toBe(1);
    expect(state.wave.waveIndexInBiome).toBe(0);
  });

  it("keeps mode in upgrade on final completion while signaling run completion hook", () => {
    const state = makeTestState();
    const finalBiomeIndex = biomeSequence.length - 1;
    state.mode = "wave";
    state.currentBiomeIndex = finalBiomeIndex;
    state.wave.active = true;
    state.wave.waveIndexInBiome = biomeSequence[finalBiomeIndex]!.waveTemplates.length - 1;
    state.wave.spawnQueue = [];
    state.enemies = [];
    state.wave.clearDelay = 1.24;

    let runCompleted = 0;
    const director = new WaveDirector({
      spawnEnemy: () => true,
      onWaveCleared: () => {
        // no-op
      },
      onBiomeCleared: () => {
        // no-op
      },
      onRunCompleted: () => {
        runCompleted += 1;
      },
    });

    director.update(state, 0.02);

    expect(runCompleted).toBe(1);
    expect(state.mode).toBe("upgrade");
  });

  it("retries blocked group spawns without consuming queue counts", () => {
    const state = makeTestState();
    const spawnResults = [false, true];
    let spawnCalls = 0;
    const director = new WaveDirector({
      spawnEnemy: () => {
        spawnCalls += 1;
        return spawnResults.shift() ?? true;
      },
      onWaveCleared: () => {
        // no-op
      },
      onBiomeCleared: () => {
        // no-op
      },
      onRunCompleted: () => {
        // no-op
      },
    });

    director.startCurrentWave(state);
    state.wave.spawnQueue = [state.wave.spawnQueue[0]!];
    const queueEntry = state.wave.spawnQueue[0]!;
    state.wave.enemiesRemainingEstimate = queueEntry.remaining;
    const initialRemaining = queueEntry.remaining;

    director.update(state, 0.02);
    expect(spawnCalls).toBe(1);
    expect(queueEntry.remaining).toBe(initialRemaining);
    expect(queueEntry.spawned).toBe(0);
    expect(queueEntry.timer).toBeCloseTo(0.1, 5);

    director.update(state, 0.05);
    expect(spawnCalls).toBe(1);
    expect(queueEntry.remaining).toBe(initialRemaining);

    director.update(state, 0.06);
    expect(spawnCalls).toBe(2);
    expect(queueEntry.remaining).toBe(initialRemaining - 1);
    expect(queueEntry.spawned).toBe(1);
    expect(queueEntry.timer).toBeCloseTo(queueEntry.group.spawnInterval, 5);
  });

  it("retries boss spawns until the entrance clears", () => {
    const state = makeTestState();
    state.currentBiomeIndex = 0;
    state.wave.active = true;
    state.wave.waveIndexInBiome = biomeSequence[0]!.waveTemplates.length - 1;
    state.wave.spawnQueue = [];
    state.wave.bossSpawned = false;
    state.wave.bossSpawnRetryTimer = 0;
    state.enemies = [];

    const spawnResults = [false, true];
    let spawnCalls = 0;
    const director = new WaveDirector({
      spawnEnemy: () => {
        spawnCalls += 1;
        return spawnResults.shift() ?? true;
      },
      onWaveCleared: () => {
        // no-op
      },
      onBiomeCleared: () => {
        // no-op
      },
      onRunCompleted: () => {
        // no-op
      },
    });

    director.update(state, 0.02);
    expect(spawnCalls).toBe(1);
    expect(state.wave.bossSpawned).toBe(false);
    expect(state.wave.bossSpawnRetryTimer).toBeCloseTo(0.1, 5);
    expect(state.wave.enemiesRemainingEstimate).toBe(1);

    director.update(state, 0.05);
    expect(spawnCalls).toBe(1);
    expect(state.wave.bossSpawned).toBe(false);

    director.update(state, 0.06);
    expect(spawnCalls).toBe(2);
    expect(state.wave.bossSpawned).toBe(true);
  });
});
