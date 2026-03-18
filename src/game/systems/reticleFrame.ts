import type { BuildNode, Vec3 } from "../types";
import { copyVec3, distance2D } from "../utils/math";

export interface ReticleFrameData {
  world: Vec3;
  abilityTarget: Vec3;
  selectedNodeId: string | null;
}

export function buildReticleFrameData(
  reticleWorld: Vec3,
  buildNodes: BuildNode[],
  nodeSnapRadius = 1.2,
): ReticleFrameData {
  let selectedNodeId: string | null = null;
  let bestDist = nodeSnapRadius;

  for (const buildNode of buildNodes) {
    const dist = distance2D(buildNode.position, reticleWorld);
    if (dist < bestDist) {
      bestDist = dist;
      selectedNodeId = buildNode.id;
    }
  }

  const world = copyVec3(reticleWorld);
  return {
    world,
    abilityTarget: copyVec3(world),
    selectedNodeId,
  };
}
