import type { Vec3 } from "../types";

const COLLISION_EPSILON = 1e-3;
export const ENEMY_MIN_GAP = 0.08;

export interface EnemyCollisionCandidate {
  id: string;
  position: Vec3;
  velocity: Vec3;
  collisionRadius: number;
  pathProgress: number;
  isElite: boolean;
  isBoss: boolean;
}

function normalize2D(x: number, z: number): Vec3 {
  const magnitude = Math.hypot(x, z);
  if (magnitude <= 1e-6) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: x / magnitude,
    y: 0,
    z: z / magnitude,
  };
}

function perpendicular(direction: Vec3): Vec3 {
  return normalize2D(-direction.z, direction.x);
}

function isMoving(candidate: EnemyCollisionCandidate): boolean {
  return Math.hypot(candidate.velocity.x, candidate.velocity.z) > 1e-6;
}

function collisionResistance(candidate: EnemyCollisionCandidate): number {
  const progressWeight = Math.max(0, candidate.pathProgress) * 0.2;
  const sizeWeight = Math.max(0, candidate.collisionRadius) * 2.5;
  const eliteWeight = candidate.isElite ? 1.5 : 0;
  const bossWeight = candidate.isBoss ? 4 : 0;
  return 1 + progressWeight + sizeWeight + eliteWeight + bossWeight;
}

function stationaryFallbackAxis(a: EnemyCollisionCandidate, b: EnemyCollisionCandidate): Vec3 {
  const sign = a.id.localeCompare(b.id) <= 0 ? 1 : -1;
  return normalize2D(sign, 1);
}

function separationAxis(a: EnemyCollisionCandidate, b: EnemyCollisionCandidate): Vec3 {
  const delta = normalize2D(b.position.x - a.position.x, b.position.z - a.position.z);
  if (Math.hypot(delta.x, delta.z) > 1e-6) {
    return delta;
  }

  const relativeVelocity = normalize2D(b.velocity.x - a.velocity.x, b.velocity.z - a.velocity.z);
  if (Math.hypot(relativeVelocity.x, relativeVelocity.z) > 1e-6) {
    return relativeVelocity;
  }

  if (isMoving(a) || isMoving(b)) {
    const guidingVelocity = isMoving(a)
      ? normalize2D(a.velocity.x, a.velocity.z)
      : normalize2D(b.velocity.x, b.velocity.z);
    if (Math.hypot(guidingVelocity.x, guidingVelocity.z) > 1e-6) {
      return perpendicular(guidingVelocity);
    }
  }

  return stationaryFallbackAxis(a, b);
}

export function resolveEnemyCollisions<T extends EnemyCollisionCandidate>(
  candidates: T[],
  resolvePosition: (candidate: T, position: Vec3) => Vec3,
  passes = 3,
): void {
  if (candidates.length <= 1 || passes <= 0) {
    return;
  }

  for (let pass = 0; pass < passes; pass += 1) {
    let changed = false;

    for (let i = 0; i < candidates.length; i += 1) {
      const a = candidates[i]!;
      for (let j = i + 1; j < candidates.length; j += 1) {
        const b = candidates[j]!;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const distance = Math.hypot(dx, dz);
        const minDistance = a.collisionRadius + b.collisionRadius + ENEMY_MIN_GAP;
        if (distance >= minDistance) {
          continue;
        }

        const axis = separationAxis(a, b);
        const overlap = Math.max(0, minDistance - distance) + COLLISION_EPSILON;
        const aResistance = collisionResistance(a);
        const bResistance = collisionResistance(b);
        const totalResistance = aResistance + bResistance;
        const aMoveRatio = totalResistance > 0 ? bResistance / totalResistance : 0.5;
        const bMoveRatio = totalResistance > 0 ? aResistance / totalResistance : 0.5;

        a.position = resolvePosition(a, {
          x: a.position.x - axis.x * overlap * aMoveRatio,
          y: a.position.y,
          z: a.position.z - axis.z * overlap * aMoveRatio,
        });
        b.position = resolvePosition(b, {
          x: b.position.x + axis.x * overlap * bMoveRatio,
          y: b.position.y,
          z: b.position.z + axis.z * overlap * bMoveRatio,
        });
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }
}
