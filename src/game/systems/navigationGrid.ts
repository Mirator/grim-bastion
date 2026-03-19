import {
  ARENA_MAX_X,
  ARENA_MAX_Z,
  ARENA_MIN_X,
  ARENA_MIN_Z,
  CORE_REACH_RADIUS,
  CORE_WORLD_POSITION,
  NAV_AGENT_RADIUS,
  NAV_CELL_SIZE,
  TOWER_BLOCK_RADIUS,
} from "../constants";
import type { MapObstacle, TowerState, Vec3 } from "../types";

export interface CircleBlocker {
  id: string;
  x: number;
  z: number;
  radius: number;
  source: "obstacle" | "tower" | "core";
}

interface CellCoord {
  x: number;
  z: number;
}

const ORTHOGONAL_COST = 1;
const DIAGONAL_COST = 1.41421356237;

const NEIGHBORS: Array<{ dx: number; dz: number; cost: number }> = [
  { dx: 1, dz: 0, cost: ORTHOGONAL_COST },
  { dx: -1, dz: 0, cost: ORTHOGONAL_COST },
  { dx: 0, dz: 1, cost: ORTHOGONAL_COST },
  { dx: 0, dz: -1, cost: ORTHOGONAL_COST },
  { dx: 1, dz: 1, cost: DIAGONAL_COST },
  { dx: 1, dz: -1, cost: DIAGONAL_COST },
  { dx: -1, dz: 1, cost: DIAGONAL_COST },
  { dx: -1, dz: -1, cost: DIAGONAL_COST },
];

function sqr(value: number): number {
  return value * value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class NavigationGrid {
  private readonly minX = ARENA_MIN_X;

  private readonly maxX = ARENA_MAX_X;

  private readonly minZ = ARENA_MIN_Z;

  private readonly maxZ = ARENA_MAX_Z;

  private readonly cellSize = NAV_CELL_SIZE;

  private readonly width = Math.max(1, Math.floor((this.maxX - this.minX) / this.cellSize) + 1);

  private readonly height = Math.max(1, Math.floor((this.maxZ - this.minZ) / this.cellSize) + 1);

  private obstacleGroundBlockers: CircleBlocker[] = [];

  private obstacleHeroBlockers: CircleBlocker[] = [];

  private towerBlockers: CircleBlocker[] = [];

  private readonly coreBlocker: CircleBlocker = {
    id: "__core__",
    x: CORE_WORLD_POSITION.x,
    z: CORE_WORLD_POSITION.z,
    radius: CORE_REACH_RADIUS,
    source: "core",
  };

  private blockedMask: Uint8Array = new Uint8Array(this.width * this.height);

  private distanceField: Float32Array = new Float32Array(this.width * this.height);

  private dirty = true;

  private coreCell: CellCoord | null = null;

  constructor() {
    this.distanceField.fill(Number.POSITIVE_INFINITY);
  }

  setStaticObstacles(obstacles: MapObstacle[]): void {
    this.obstacleGroundBlockers = obstacles
      .filter((obstacle) => obstacle.blocksGround)
      .map((obstacle) => ({
        id: obstacle.id,
        x: obstacle.center.x,
        z: obstacle.center.z,
        radius: obstacle.radius,
        source: "obstacle" as const,
      }));

    this.obstacleHeroBlockers = obstacles
      .filter((obstacle) => obstacle.blocksHero)
      .map((obstacle) => ({
        id: obstacle.id,
        x: obstacle.center.x,
        z: obstacle.center.z,
        radius: obstacle.radius,
        source: "obstacle" as const,
      }));

    this.dirty = true;
  }

  setTowerBlockers(towers: TowerState[]): void {
    this.towerBlockers = towers.map((tower) => ({
      id: tower.id,
      x: tower.position.x,
      z: tower.position.z,
      radius: TOWER_BLOCK_RADIUS,
      source: "tower" as const,
    }));
    this.dirty = true;
  }

  getHeroCollisionBlockers(): CircleBlocker[] {
    return [...this.obstacleHeroBlockers, ...this.getStructureCollisionBlockers()];
  }

  getGroundCollisionBlockers(): CircleBlocker[] {
    return [...this.obstacleGroundBlockers, ...this.getStructureCollisionBlockers()];
  }

  getStructureCollisionBlockers(): CircleBlocker[] {
    return [...this.towerBlockers, this.coreBlocker];
  }

  resolvePositionAgainstBlockers(position: Vec3, radius: number, blockers: CircleBlocker[]): Vec3 {
    if (blockers.length === 0) {
      return {
        x: clamp(position.x, this.minX, this.maxX),
        y: position.y,
        z: clamp(position.z, this.minZ, this.maxZ),
      };
    }

    const resolved = { x: position.x, y: position.y, z: position.z };
    for (let pass = 0; pass < 3; pass += 1) {
      let changed = false;
      for (const blocker of blockers) {
        const dx = resolved.x - blocker.x;
        const dz = resolved.z - blocker.z;
        const minDistance = radius + blocker.radius;
        const distanceSq = dx * dx + dz * dz;
        if (distanceSq >= minDistance * minDistance) {
          continue;
        }

        const distance = Math.sqrt(distanceSq);
        if (distance <= 1e-6) {
          resolved.x += minDistance + 1e-3;
          changed = true;
          continue;
        }

        const push = minDistance - distance + 1e-3;
        resolved.x += (dx / distance) * push;
        resolved.z += (dz / distance) * push;
        changed = true;
      }

      resolved.x = clamp(resolved.x, this.minX, this.maxX);
      resolved.z = clamp(resolved.z, this.minZ, this.maxZ);
      if (!changed) {
        break;
      }
    }

    return resolved;
  }

  overlapsGroundObstacle(position: Vec3, clearance: number): boolean {
    for (const blocker of this.obstacleGroundBlockers) {
      const required = blocker.radius + clearance;
      if (sqr(position.x - blocker.x) + sqr(position.z - blocker.z) < sqr(required)) {
        return true;
      }
    }
    return false;
  }

  ensureDistanceField(corePosition: Vec3): void {
    const requestedCoreCell = this.worldToCell(corePosition);
    if (
      !this.dirty
      && this.coreCell
      && this.coreCell.x === requestedCoreCell.x
      && this.coreCell.z === requestedCoreCell.z
    ) {
      return;
    }

    this.blockedMask = this.buildBlockedMask(this.obstacleGroundBlockers, this.towerBlockers, NAV_AGENT_RADIUS);
    this.distanceField = this.computeDistanceField(requestedCoreCell, this.blockedMask);
    this.coreCell = requestedCoreCell;
    this.dirty = false;
  }

  sampleDistanceToCore(position: Vec3, corePosition: Vec3): number {
    this.ensureDistanceField(corePosition);
    const cell = this.worldToCell(position);
    return this.distanceField[this.toIndex(cell.x, cell.z)] ?? Number.POSITIVE_INFINITY;
  }

  sampleFlowTarget(position: Vec3, corePosition: Vec3): Vec3 | null {
    this.ensureDistanceField(corePosition);
    const current = this.worldToCell(position);
    const currentIndex = this.toIndex(current.x, current.z);
    const currentDistance = this.distanceField[currentIndex] ?? Number.POSITIVE_INFINITY;

    let bestCell: CellCoord | null = null;
    let bestDistance = currentDistance;

    for (const neighbor of NEIGHBORS) {
      const nx = current.x + neighbor.dx;
      const nz = current.z + neighbor.dz;
      if (!this.inBounds(nx, nz)) {
        continue;
      }
      const nIndex = this.toIndex(nx, nz);
      if (this.blockedMask[nIndex]) {
        continue;
      }
      const distance = this.distanceField[nIndex] ?? Number.POSITIVE_INFINITY;
      if (!Number.isFinite(distance)) {
        continue;
      }
      if (distance < bestDistance - 1e-4) {
        bestDistance = distance;
        bestCell = { x: nx, z: nz };
      }
    }

    if (!bestCell) {
      for (const neighbor of NEIGHBORS) {
        const nx = current.x + neighbor.dx;
        const nz = current.z + neighbor.dz;
        if (!this.inBounds(nx, nz)) {
          continue;
        }
        const nIndex = this.toIndex(nx, nz);
        if (this.blockedMask[nIndex]) {
          continue;
        }
        const distance = this.distanceField[nIndex] ?? Number.POSITIVE_INFINITY;
        if (!Number.isFinite(distance)) {
          continue;
        }
        if (!bestCell || distance < bestDistance) {
          bestDistance = distance;
          bestCell = { x: nx, z: nz };
        }
      }
    }

    if (!bestCell) {
      if (!Number.isFinite(currentDistance)) {
        return null;
      }
      bestCell = current;
    }

    return this.cellToWorld(bestCell);
  }

  wouldTowerPlacementBlockPaths(candidatePosition: Vec3, spawnPoints: Vec3[], corePosition: Vec3): boolean {
    const candidateBlocker: CircleBlocker = {
      id: "__candidate__",
      x: candidatePosition.x,
      z: candidatePosition.z,
      radius: TOWER_BLOCK_RADIUS,
      source: "tower",
    };

    const blockers = [...this.towerBlockers, candidateBlocker];
    const blockedMask = this.buildBlockedMask(this.obstacleGroundBlockers, blockers, NAV_AGENT_RADIUS);
    const coreCell = this.worldToCell(corePosition);
    const coreIndex = this.toIndex(coreCell.x, coreCell.z);
    if (blockedMask[coreIndex]) {
      return true;
    }

    const distanceField = this.computeDistanceField(coreCell, blockedMask);
    for (const spawnPoint of spawnPoints) {
      const spawnCell = this.worldToCell(spawnPoint);
      const distance = distanceField[this.toIndex(spawnCell.x, spawnCell.z)] ?? Number.POSITIVE_INFINITY;
      if (!Number.isFinite(distance)) {
        return true;
      }
    }
    return false;
  }

  private buildBlockedMask(obstacleBlockers: CircleBlocker[], towerBlockers: CircleBlocker[], agentRadius: number): Uint8Array {
    const blockers = [...obstacleBlockers, ...towerBlockers];
    const mask = new Uint8Array(this.width * this.height);
    if (blockers.length === 0) {
      return mask;
    }

    for (let z = 0; z < this.height; z += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const world = this.cellToWorld({ x, z });
        const index = this.toIndex(x, z);
        for (const blocker of blockers) {
          const minDistance = blocker.radius + agentRadius;
          if (sqr(world.x - blocker.x) + sqr(world.z - blocker.z) <= sqr(minDistance)) {
            mask[index] = 1;
            break;
          }
        }
      }
    }

    return mask;
  }

  private computeDistanceField(coreCell: CellCoord, blockedMask: Uint8Array): Float32Array {
    const field = new Float32Array(this.width * this.height);
    field.fill(Number.POSITIVE_INFINITY);
    if (!this.inBounds(coreCell.x, coreCell.z)) {
      return field;
    }

    const coreIndex = this.toIndex(coreCell.x, coreCell.z);
    if (blockedMask[coreIndex]) {
      return field;
    }

    const heapIndices: number[] = [];
    const heapCosts: number[] = [];

    const heapSwap = (a: number, b: number): void => {
      const idxA = heapIndices[a]!;
      const costA = heapCosts[a]!;
      heapIndices[a] = heapIndices[b]!;
      heapCosts[a] = heapCosts[b]!;
      heapIndices[b] = idxA;
      heapCosts[b] = costA;
    };

    const heapPush = (index: number, cost: number): void => {
      heapIndices.push(index);
      heapCosts.push(cost);
      let cursor = heapIndices.length - 1;
      while (cursor > 0) {
        const parent = Math.floor((cursor - 1) / 2);
        if ((heapCosts[parent] ?? Number.POSITIVE_INFINITY) <= cost) {
          break;
        }
        heapSwap(cursor, parent);
        cursor = parent;
      }
    };

    const heapPop = (): { index: number; cost: number } | null => {
      if (heapIndices.length === 0) {
        return null;
      }
      const index = heapIndices[0]!;
      const cost = heapCosts[0]!;
      const lastIndex = heapIndices.pop()!;
      const lastCost = heapCosts.pop()!;
      if (heapIndices.length > 0) {
        heapIndices[0] = lastIndex;
        heapCosts[0] = lastCost;

        let cursor = 0;
        while (true) {
          const left = cursor * 2 + 1;
          const right = left + 1;
          let smallest = cursor;
          if (left < heapIndices.length && (heapCosts[left] ?? Number.POSITIVE_INFINITY) < (heapCosts[smallest] ?? Number.POSITIVE_INFINITY)) {
            smallest = left;
          }
          if (right < heapIndices.length && (heapCosts[right] ?? Number.POSITIVE_INFINITY) < (heapCosts[smallest] ?? Number.POSITIVE_INFINITY)) {
            smallest = right;
          }
          if (smallest === cursor) {
            break;
          }
          heapSwap(cursor, smallest);
          cursor = smallest;
        }
      }
      return { index, cost };
    };

    field[coreIndex] = 0;
    heapPush(coreIndex, 0);

    while (heapIndices.length > 0) {
      const next = heapPop();
      if (!next) {
        break;
      }

      if (next.cost > (field[next.index] ?? Number.POSITIVE_INFINITY) + 1e-6) {
        continue;
      }

      const x = next.index % this.width;
      const z = Math.floor(next.index / this.width);
      for (const neighbor of NEIGHBORS) {
        const nx = x + neighbor.dx;
        const nz = z + neighbor.dz;
        if (!this.inBounds(nx, nz)) {
          continue;
        }

        const nIndex = this.toIndex(nx, nz);
        if (blockedMask[nIndex]) {
          continue;
        }

        const nextCost = next.cost + neighbor.cost;
        if (nextCost + 1e-6 < (field[nIndex] ?? Number.POSITIVE_INFINITY)) {
          field[nIndex] = nextCost;
          heapPush(nIndex, nextCost);
        }
      }
    }

    return field;
  }

  private worldToCell(position: Vec3): CellCoord {
    const clampedX = clamp(position.x, this.minX, this.maxX);
    const clampedZ = clamp(position.z, this.minZ, this.maxZ);
    const x = clamp(Math.round((clampedX - this.minX) / this.cellSize), 0, this.width - 1);
    const z = clamp(Math.round((clampedZ - this.minZ) / this.cellSize), 0, this.height - 1);
    return { x, z };
  }

  private cellToWorld(cell: CellCoord): Vec3 {
    return {
      x: this.minX + cell.x * this.cellSize,
      y: 0,
      z: this.minZ + cell.z * this.cellSize,
    };
  }

  private inBounds(x: number, z: number): boolean {
    return x >= 0 && x < this.width && z >= 0 && z < this.height;
  }

  private toIndex(x: number, z: number): number {
    return z * this.width + x;
  }
}
