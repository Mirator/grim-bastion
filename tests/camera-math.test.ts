import { describe, expect, it } from "vitest";
import { computeDampingAlpha, resolveCameraLockId } from "../src/game/render/cameraMath";

describe("camera math", () => {
  it("computes frame-rate independent damping alpha", () => {
    const alpha60hz = computeDampingAlpha(9.75, 1 / 60);
    const alpha30hz = computeDampingAlpha(9.75, 1 / 30);
    expect(alpha60hz).toBeCloseTo(0.15, 3);
    expect(alpha30hz).toBeGreaterThan(alpha60hz);
  });

  it("returns zero damping for invalid inputs", () => {
    expect(computeDampingAlpha(0, 1 / 60)).toBe(0);
    expect(computeDampingAlpha(8, 0)).toBe(0);
  });

  it("keeps current lock when challenger is not enough better", () => {
    const lockId = resolveCameraLockId({
      currentLockId: "enemy-a",
      bestCandidateId: "enemy-b",
      bestCandidateDistanceSq: 14,
      currentLockFound: true,
      currentLockDistanceSq: 16,
    });
    expect(lockId).toBe("enemy-a");
  });

  it("switches lock when challenger is significantly better", () => {
    const lockId = resolveCameraLockId({
      currentLockId: "enemy-a",
      bestCandidateId: "enemy-b",
      bestCandidateDistanceSq: 6,
      currentLockFound: true,
      currentLockDistanceSq: 16,
    });
    expect(lockId).toBe("enemy-b");
  });

  it("switches lock when current lock is invalid", () => {
    const lockId = resolveCameraLockId({
      currentLockId: "enemy-a",
      bestCandidateId: "enemy-c",
      bestCandidateDistanceSq: 20,
      currentLockFound: false,
      currentLockDistanceSq: Number.POSITIVE_INFINITY,
    });
    expect(lockId).toBe("enemy-c");
  });

  it("clears lock when no active candidate exists", () => {
    const lockId = resolveCameraLockId({
      currentLockId: "enemy-a",
      bestCandidateId: null,
      bestCandidateDistanceSq: Number.POSITIVE_INFINITY,
      currentLockFound: false,
      currentLockDistanceSq: Number.POSITIVE_INFINITY,
    });
    expect(lockId).toBeNull();
  });
});
