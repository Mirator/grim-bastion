import { describe, expect, it } from "vitest";
import { buildReticleFrameData } from "../src/game/systems/reticleFrame";
import { makeTestState } from "./testState";

describe("reticle frame", () => {
  it("uses ground point for node selection and keeps 3D aim for abilities", () => {
    const state = makeTestState();
    const node = state.buildNodes[0]!;
    const groundPoint = {
      x: node.position.x + 0.18,
      y: 0,
      z: node.position.z + 0.12,
    };
    const aimPoint3D = {
      x: groundPoint.x,
      y: 1.8,
      z: groundPoint.z,
    };

    const frame = buildReticleFrameData(aimPoint3D, groundPoint, state.buildNodes);
    expect(frame.selectedNodeId).toBe(node.id);
    expect(frame.groundPoint).toEqual(groundPoint);
    expect(frame.abilityTarget).toEqual(aimPoint3D);
    expect(frame.aimPoint3D).toEqual(aimPoint3D);
  });

  it("keeps ability target even when no node is selected", () => {
    const state = makeTestState();
    const aimPoint3D = { x: 40, y: 2, z: 40 };
    const groundPoint = { x: 40, y: 0, z: 40 };

    const frame = buildReticleFrameData(aimPoint3D, groundPoint, state.buildNodes);
    expect(frame.selectedNodeId).toBeNull();
    expect(frame.abilityTarget).toEqual(aimPoint3D);
  });
});
