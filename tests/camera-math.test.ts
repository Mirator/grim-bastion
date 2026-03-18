import { describe, expect, it } from "vitest";
import {
  clampCameraPitch,
  computeCameraRigPosition,
  computeDampingAlpha,
  forwardFromYawPitch,
  rightFromYaw,
} from "../src/game/render/cameraMath";
import { add, mul } from "../src/game/utils/math";

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

  it("clamps camera pitch safely", () => {
    expect(clampCameraPitch(-2, -0.7, 0.2)).toBeCloseTo(-0.7, 5);
    expect(clampCameraPitch(0.8, -0.7, 0.2)).toBeCloseTo(0.2, 5);
    expect(clampCameraPitch(-0.3, -0.7, 0.2)).toBeCloseTo(-0.3, 5);
  });

  it("produces stable forward/right basis from yaw", () => {
    const forward = forwardFromYawPitch(Math.PI / 2, 0);
    const right = rightFromYaw(Math.PI / 2);
    expect(forward.x).toBeCloseTo(1, 5);
    expect(forward.z).toBeCloseTo(0, 5);
    expect(right.x).toBeCloseTo(0, 5);
    expect(right.z).toBeCloseTo(1, 5);
  });

  it("computes right-shoulder follow position from yaw/pitch", () => {
    const position = computeCameraRigPosition({ x: 8, y: 1.35, z: 0 }, -Math.PI / 2, -0.35, 6.2, 0.95, 0.35);
    expect(position.x).toBeGreaterThan(8);
    expect(position.y).toBeGreaterThan(1.35);
    expect(position.z).toBeCloseTo(-0.95, 2);
  });

  it("maps strafe sign to camera right/left as expected", () => {
    const yaw = -Math.PI / 2;
    const right = rightFromYaw(yaw);
    const hero = { x: 8, y: 0, z: 0 };
    const moveRight = add(hero, mul(right, 1));
    const moveLeft = add(hero, mul(right, -1));
    expect(moveRight.z).toBeLessThan(hero.z);
    expect(moveLeft.z).toBeGreaterThan(hero.z);
  });
});
