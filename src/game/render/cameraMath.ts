import type { Vec3 } from "../types";

export function computeDampingAlpha(lambda: number, dt: number): number {
  if (lambda <= 0 || dt <= 0) {
    return 0;
  }
  const alpha = 1 - Math.exp(-lambda * dt);
  return Math.max(0, Math.min(1, alpha));
}

export function clampCameraPitch(pitch: number, minPitch: number, maxPitch: number): number {
  if (!Number.isFinite(pitch)) {
    return minPitch;
  }
  return Math.max(minPitch, Math.min(maxPitch, pitch));
}

export function forwardFromYawPitch(yaw: number, pitch: number): Vec3 {
  const cosPitch = Math.cos(pitch);
  return {
    x: Math.sin(yaw) * cosPitch,
    y: Math.sin(pitch),
    z: Math.cos(yaw) * cosPitch,
  };
}

export function rightFromYaw(yaw: number): Vec3 {
  return {
    x: -Math.cos(yaw),
    y: 0,
    z: Math.sin(yaw),
  };
}

export function computeCameraRigPosition(
  pivot: Vec3,
  yaw: number,
  pitch: number,
  followDistance: number,
  shoulderOffset: number,
  heightOffset: number,
): Vec3 {
  const forward = forwardFromYawPitch(yaw, pitch);
  const right = rightFromYaw(yaw);
  return {
    x: pivot.x - forward.x * followDistance + right.x * shoulderOffset,
    y: pivot.y - forward.y * followDistance + heightOffset,
    z: pivot.z - forward.z * followDistance + right.z * shoulderOffset,
  };
}

export function computeCameraFocusPoint(pivot: Vec3, yaw: number, pitch: number, focusDistance: number): Vec3 {
  const forward = forwardFromYawPitch(yaw, pitch);
  return {
    x: pivot.x + forward.x * focusDistance,
    y: pivot.y + forward.y * focusDistance,
    z: pivot.z + forward.z * focusDistance,
  };
}
