import type { Vec3 } from "../types";

export function v3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function mul(a: Vec3, scalar: number): Vec3 {
  return { x: a.x * scalar, y: a.y * scalar, z: a.z * scalar };
}

export function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function length2D(a: Vec3): number {
  return Math.hypot(a.x, a.z);
}

export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  if (len <= 1e-5) {
    return v3(0, 0, 0);
  }
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function distance2D(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function projectPointToSegment(point: Vec3, start: Vec3, end: Vec3): { closest: Vec3; t: number } {
  const seg = sub(end, start);
  const segLengthSq = dot(seg, seg);
  if (segLengthSq <= 1e-6) {
    return { closest: start, t: 0 };
  }
  const t = clamp(dot(sub(point, start), seg) / segLengthSq, 0, 1);
  return {
    closest: add(start, mul(seg, t)),
    t,
  };
}

export function copyVec3(source: Vec3): Vec3 {
  return { x: source.x, y: source.y, z: source.z };
}

export function angleToDir(yawRad: number): Vec3 {
  return { x: Math.sin(yawRad), y: 0, z: Math.cos(yawRad) };
}

export function dirToYaw(direction: Vec3): number {
  return Math.atan2(direction.x, direction.z);
}
