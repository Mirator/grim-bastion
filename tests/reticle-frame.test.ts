import { describe, expect, it } from "vitest";
import { buildReticleFrameData } from "../src/game/systems/reticleFrame";

describe("reticle frame", () => {
  it("keeps 3D aim for abilities and mirrors ground point for placement", () => {
    const groundPoint = { x: -3.25, y: 0, z: 4.75 };
    const aimPoint3D = {
      x: groundPoint.x,
      y: 1.8,
      z: groundPoint.z,
    };

    const frame = buildReticleFrameData(aimPoint3D, groundPoint);
    expect(frame.groundPoint).toEqual(groundPoint);
    expect(frame.placementPoint).toEqual(groundPoint);
    expect(frame.abilityTarget).toEqual(aimPoint3D);
    expect(frame.aimPoint3D).toEqual(aimPoint3D);
  });

  it("keeps placement at ground level even if input ground y is noisy", () => {
    const aimPoint3D = { x: 40, y: 2, z: 40 };
    const groundPoint = { x: 40, y: 3.2, z: 40 };

    const frame = buildReticleFrameData(aimPoint3D, groundPoint);
    expect(frame.placementPoint).toEqual({ x: 40, y: 0, z: 40 });
    expect(frame.abilityTarget).toEqual(aimPoint3D);
  });
});
