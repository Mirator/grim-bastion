import type { Vec3 } from "../types";
import { copyVec3 } from "../utils/math";

export interface ReticleFrameData {
  aimPoint3D: Vec3;
  groundPoint: Vec3;
  abilityTarget: Vec3;
  placementPoint: Vec3;
}

export function buildReticleFrameData(aimPoint3D: Vec3, groundPoint: Vec3): ReticleFrameData {
  const placementPoint = {
    x: groundPoint.x,
    y: 0,
    z: groundPoint.z,
  };
  return {
    aimPoint3D: copyVec3(aimPoint3D),
    groundPoint: copyVec3(groundPoint),
    abilityTarget: copyVec3(aimPoint3D),
    placementPoint: copyVec3(placementPoint),
  };
}
