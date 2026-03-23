import { describe, expect, it } from "vitest";
import { ENEMY_MIN_GAP, resolveEnemyCollisions, type EnemyCollisionCandidate } from "../src/game/systems/enemyCollision";

function makeCandidate(
  id: string,
  x: number,
  z: number,
  collisionRadius: number,
  options: Partial<EnemyCollisionCandidate> = {},
): EnemyCollisionCandidate {
  return {
    id,
    position: { x, y: 0, z },
    velocity: { x: 0, y: 0, z: 0 },
    collisionRadius,
    pathProgress: 0,
    isElite: false,
    isBoss: false,
    ...options,
  };
}

function distance2D(a: EnemyCollisionCandidate, b: EnemyCollisionCandidate): number {
  return Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
}

describe("enemy collision resolution", () => {
  it("separates overlapping ground enemies to their full clearance", () => {
    const entries = [
      makeCandidate("ground-a", 0, 0, 0.5),
      makeCandidate("ground-b", 0.35, 0, 0.5),
    ];

    resolveEnemyCollisions(entries, (_, position) => position);

    expect(distance2D(entries[0]!, entries[1]!)).toBeGreaterThanOrEqual(1 + ENEMY_MIN_GAP);
  });

  it("separates flying and ground enemies with the same rules", () => {
    const entries = [
      makeCandidate("ground", 0, 0, 0.45),
      makeCandidate("flying", 0.1, 0.1, 0.35, {
        velocity: { x: 0.7, y: 0, z: 0.25 },
      }),
    ];

    resolveEnemyCollisions(entries, (_, position) => position);

    expect(distance2D(entries[0]!, entries[1]!)).toBeGreaterThanOrEqual(0.8 + ENEMY_MIN_GAP);
  });

  it("moves leading heavier enemies less than trailing smaller ones", () => {
    const front = makeCandidate("front", 1, 0, 0.85, {
      velocity: { x: 1, y: 0, z: 0 },
      pathProgress: 14,
      isElite: true,
    });
    const trailing = makeCandidate("trailing", 0.3, 0, 0.5, {
      velocity: { x: 1, y: 0, z: 0 },
      pathProgress: 2,
    });

    resolveEnemyCollisions([front, trailing], (_, position) => position);

    expect(Math.abs(front.position.x - 1)).toBeLessThan(Math.abs(trailing.position.x - 0.3));
    expect(distance2D(front, trailing)).toBeGreaterThanOrEqual(front.collisionRadius + trailing.collisionRadius + ENEMY_MIN_GAP);
  });
});
