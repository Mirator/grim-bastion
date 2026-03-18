import { describe, expect, it } from "vitest";
import { buildReticleFrameData } from "../src/game/systems/reticleFrame";
import { makeTestState } from "./testState";

describe("reticle frame", () => {
  it("uses one world reticle value for selection and ability targeting", () => {
    const state = makeTestState();
    const node = state.buildNodes[0]!;
    const reticle = {
      x: node.position.x + 0.18,
      y: 0,
      z: node.position.z + 0.12,
    };

    const frame = buildReticleFrameData(reticle, state.buildNodes);
    expect(frame.selectedNodeId).toBe(node.id);
    expect(frame.world).toEqual(reticle);
    expect(frame.abilityTarget).toEqual(frame.world);
  });

  it("keeps ability target even when no node is selected", () => {
    const state = makeTestState();
    const reticle = { x: 40, y: 0, z: 40 };

    const frame = buildReticleFrameData(reticle, state.buildNodes);
    expect(frame.selectedNodeId).toBeNull();
    expect(frame.abilityTarget).toEqual(reticle);
  });
});
