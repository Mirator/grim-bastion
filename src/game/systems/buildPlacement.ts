import type {
  DefenseKind,
  LaneDefinition,
  MapObstacle,
  PlacementBlockReason,
  TrapState,
  TowerState,
  Vec3,
} from "../types";
import { distance2D } from "../utils/math";

export interface PlacementValidation {
  canPlace: boolean;
  blockReason: PlacementBlockReason | null;
}

export interface SellTarget {
  id: string;
  kind: DefenseKind;
  distance: number;
}

function distanceToSegment2D(point: Vec3, start: Vec3, end: Vec3): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq <= 1e-6) {
    return distance2D(point, start);
  }
  const projection = ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSq;
  const t = Math.max(0, Math.min(1, projection));
  const px = start.x + dx * t;
  const pz = start.z + dz * t;
  const ddx = point.x - px;
  const ddz = point.z - pz;
  return Math.hypot(ddx, ddz);
}

function hasDefenseOverlap(position: Vec3, towers: TowerState[], traps: TrapState[], minSpacing: number): boolean {
  for (const tower of towers) {
    if (distance2D(position, tower.position) < minSpacing) {
      return true;
    }
  }
  for (const trap of traps) {
    if (distance2D(position, trap.position) < minSpacing) {
      return true;
    }
  }
  return false;
}

function hasObstacleOverlap(position: Vec3, obstacles: MapObstacle[], clearance: number): boolean {
  for (const obstacle of obstacles) {
    const requiredDistance = obstacle.radius + clearance;
    if (distance2D(position, obstacle.center) < requiredDistance) {
      return true;
    }
  }
  return false;
}

export function validatePlacement(
  position: Vec3,
  gold: number,
  cost: number,
  towers: TowerState[],
  traps: TrapState[],
  corePosition: Vec3,
  coreBuildBufferRadius: number,
  minSpacing: number,
  obstacles: MapObstacle[] = [],
  obstacleClearance = 0.55,
  blocksPath = false,
): PlacementValidation {
  if (gold < cost) {
    return {
      canPlace: false,
      blockReason: "insufficient-gold",
    };
  }

  if (distance2D(position, corePosition) < coreBuildBufferRadius) {
    return {
      canPlace: false,
      blockReason: "core-buffer",
    };
  }

  if (hasObstacleOverlap(position, obstacles, obstacleClearance)) {
    return {
      canPlace: false,
      blockReason: "obstacle",
    };
  }

  if (hasDefenseOverlap(position, towers, traps, minSpacing)) {
    return {
      canPlace: false,
      blockReason: "overlap",
    };
  }

  if (blocksPath) {
    return {
      canPlace: false,
      blockReason: "blocks-path",
    };
  }

  return {
    canPlace: true,
    blockReason: null,
  };
}

export function findSellTarget(position: Vec3, towers: TowerState[], traps: TrapState[], sellRadius: number): SellTarget | null {
  let bestTarget: SellTarget | null = null;

  for (const tower of towers) {
    const dist = distance2D(position, tower.position);
    if (dist > sellRadius) {
      continue;
    }
    if (!bestTarget || dist < bestTarget.distance) {
      bestTarget = {
        id: tower.id,
        kind: "tower",
        distance: dist,
      };
    }
  }

  for (const trap of traps) {
    const dist = distance2D(position, trap.position);
    if (dist > sellRadius) {
      continue;
    }
    if (!bestTarget || dist < bestTarget.distance) {
      bestTarget = {
        id: trap.id,
        kind: "trap",
        distance: dist,
      };
    }
  }

  return bestTarget;
}

export function resolveNearestLaneId(position: Vec3, lanes: LaneDefinition[]): string {
  if (lanes.length === 0) {
    return "lane-0";
  }

  let bestLaneId = lanes[0]!.id;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const lane of lanes) {
    const points = lane.points;
    if (points.length === 0) {
      continue;
    }

    if (points.length === 1) {
      const dist = distance2D(position, points[0]!);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestLaneId = lane.id;
      }
      continue;
    }

    for (let i = 0; i < points.length - 1; i += 1) {
      const start = points[i]!;
      const end = points[i + 1]!;
      const dist = distanceToSegment2D(position, start, end);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestLaneId = lane.id;
      }
    }
  }

  return bestLaneId;
}
