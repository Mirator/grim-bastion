import type { BiomeDefinition, LaneDefinition, WaveTemplate } from "../types";

export function orderedWaveLanes(biome: BiomeDefinition, template: WaveTemplate): LaneDefinition[] {
  const laneIds = new Set(template.groups.map((group) => group.laneId));
  const ordered = biome.lanes.filter((lane) => laneIds.has(lane.id));
  if (ordered.length > 0) {
    return ordered;
  }
  return biome.lanes.slice(0, 1);
}
