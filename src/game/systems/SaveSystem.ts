import { defaultUnlockedAbilities, defaultUnlockedTowers } from "../data/archetypes";
import type { AbilityType, SaveGameV1, TowerType } from "../types";

const SAVE_KEY = "grim-bastion-save-v1";

export function createDefaultSave(): SaveGameV1 {
  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    meta: {
      essence: 0,
      unlockedTowers: [...defaultUnlockedTowers],
      unlockedAbilities: [...defaultUnlockedAbilities],
      unlockedUpgradeIds: [],
      unlockedDifficultyTier: 1,
    },
    settings: {
      difficultyTier: 1,
      quality: "medium",
      masterVolume: 0.75,
    },
    runHistory: [],
  };
}

export function migrateSave(unknownData: unknown): SaveGameV1 {
  if (!unknownData || typeof unknownData !== "object") {
    return createDefaultSave();
  }

  const candidate = unknownData as Partial<SaveGameV1>;
  if (candidate.version === 1 && candidate.meta && candidate.settings && Array.isArray(candidate.runHistory)) {
    const merged = createDefaultSave();
    const safeTowers = Array.isArray(candidate.meta.unlockedTowers)
      ? (candidate.meta.unlockedTowers.filter((value): value is TowerType => typeof value === "string") as TowerType[])
      : merged.meta.unlockedTowers;
    const safeAbilities = Array.isArray(candidate.meta.unlockedAbilities)
      ? (candidate.meta.unlockedAbilities.filter((value): value is AbilityType => typeof value === "string") as AbilityType[])
      : merged.meta.unlockedAbilities;

    merged.meta = {
      essence: Number.isFinite(candidate.meta.essence) ? Number(candidate.meta.essence) : merged.meta.essence,
      unlockedTowers: safeTowers,
      unlockedAbilities: safeAbilities,
      unlockedUpgradeIds: Array.isArray(candidate.meta.unlockedUpgradeIds)
        ? candidate.meta.unlockedUpgradeIds.filter((entry): entry is string => typeof entry === "string")
        : [],
      unlockedDifficultyTier: Number.isFinite(candidate.meta.unlockedDifficultyTier)
        ? Number(candidate.meta.unlockedDifficultyTier)
        : 1,
    };

    merged.settings = {
      difficultyTier: Number.isFinite(candidate.settings.difficultyTier)
        ? Number(candidate.settings.difficultyTier)
        : merged.settings.difficultyTier,
      quality:
        candidate.settings.quality === "low" || candidate.settings.quality === "medium" || candidate.settings.quality === "high"
          ? candidate.settings.quality
          : merged.settings.quality,
      masterVolume: Number.isFinite(candidate.settings.masterVolume)
        ? Math.max(0, Math.min(1, Number(candidate.settings.masterVolume)))
        : merged.settings.masterVolume,
    };

    merged.createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : merged.createdAt;
    merged.updatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : merged.updatedAt;
    merged.runHistory = candidate.runHistory;
    return merged;
  }

  return createDefaultSave();
}

export function loadSave(): SaveGameV1 {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      const initial = createDefaultSave();
      saveGame(initial);
      return initial;
    }
    return migrateSave(JSON.parse(raw));
  } catch {
    return createDefaultSave();
  }
}

export function saveGame(save: SaveGameV1): void {
  const payload = {
    ...save,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

export function patchSave(mutator: (save: SaveGameV1) => void): SaveGameV1 {
  const save = loadSave();
  mutator(save);
  saveGame(save);
  return save;
}

export function resetSave(): SaveGameV1 {
  const save = createDefaultSave();
  saveGame(save);
  return save;
}
