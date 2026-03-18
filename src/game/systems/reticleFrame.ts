import type { BuildNode, Vec3 } from "../types";
import { copyVec3, distance2D } from "../utils/math";

export interface ReticleFrameData {
  aimPoint3D: Vec3;
  groundPoint: Vec3;
  abilityTarget: Vec3;
  selectedNodeId: string | null;
}

export function buildReticleFrameData(
  aimPoint3D: Vec3,
  groundPoint: Vec3,
  buildNodes: BuildNode[],
  nodeSnapRadius = 1.2,
): ReticleFrameData {
  let selectedNodeId: string | null = null;
  let bestDist = nodeSnapRadius;

  for (const buildNode of buildNodes) {
    const dist = distance2D(buildNode.position, groundPoint);
    if (dist < bestDist) {
      bestDist = dist;
      selectedNodeId = buildNode.id;
    }
  }

  return {
    aimPoint3D: copyVec3(aimPoint3D),
    groundPoint: copyVec3(groundPoint),
    abilityTarget: copyVec3(aimPoint3D),
    selectedNodeId,
  };
}
