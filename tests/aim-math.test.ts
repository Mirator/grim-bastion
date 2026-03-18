import { describe, expect, it } from "vitest";
import { resolveAimPoint3D } from "../src/game/render/Renderer3D";

describe("aim math", () => {
  it("prefers object hit over ground/fallback", () => {
    const point = resolveAimPoint3D(
      { x: 2, y: 1.2, z: -3 },
      { x: 5, y: 0, z: -7 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -0.2, z: -1 },
    );
    expect(point).toEqual({ x: 2, y: 1.2, z: -3 });
  });

  it("falls back to ground hit and then forward ray distance", () => {
    const ground = resolveAimPoint3D(
      null,
      { x: 4, y: 0, z: 6 },
      { x: 0, y: 2, z: 0 },
      { x: 0, y: -1, z: 0 },
    );
    expect(ground).toEqual({ x: 4, y: 0, z: 6 });

    const fallback = resolveAimPoint3D(
      null,
      null,
      { x: 1, y: 2, z: 3 },
      { x: 0, y: 0, z: -1 },
      10,
    );
    expect(fallback).toEqual({ x: 1, y: 2, z: -7 });
  });
});
