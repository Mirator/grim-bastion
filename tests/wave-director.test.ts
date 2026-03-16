import { describe, expect, it } from "vitest";
import { WaveDirector } from "../src/game/systems/WaveDirector";
import { makeTestState } from "./testState";

describe("wave director", () => {
  it("creates spawn queue when wave starts", () => {
    const state = makeTestState();
    const wave = new WaveDirector({
      spawnEnemy: () => {
        // test hook
      },
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
});
