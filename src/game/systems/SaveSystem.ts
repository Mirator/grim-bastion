import { defaultUnlockedAbilities, defaultUnlockedTowers } from "../data/archetypes";
import type { AbilityType, SaveGameV1, TowerType } from "../types";

const SAVE_KEY = "grim-bastion-save-v1";
const MAX_DIFFICULTY_TIER = 10;
const MAX_HISTORY_ENTRIES = 40;
const KNOWN_TOWERS = new Set<TowerType>(["ballista", "frost-obelisk", "bombard", "arc-tower", "shrine"]);
const KNOWN_ABILITIES = new Set<AbilityType>([
  "dash",
  "explosive-rune",
  "freezing-pulse",
  "healing-beacon",
  "overcharge-aura",
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isTowerType(value: unknown): value is TowerType {
  return typeof value === "string" && KNOWN_TOWERS.has(value as TowerType);
}

function isAbilityType(value: unknown): value is AbilityType {
  return typeof value === "string" && KNOWN_ABILITIES.has(value as AbilityType);
}

function sanitizeFiniteNumber(value: unknown, fallback: number, min?: number, max?: number): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }
  if (min !== undefined && max !== undefined) {
    return clamp(normalized, min, max);
  }
  if (min !== undefined) {
    return Math.max(min, normalized);
  }
  if (max !== undefined) {
    return Math.min(max, normalized);
  }
  return normalized;
}

function sanitizeRunHistory(candidate: unknown): SaveGameV1["runHistory"] {
  if (!Array.isArray(candidate)) {
    return [];
  }

  const results: SaveGameV1["runHistory"] = [];
  for (const entry of candidate) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Partial<SaveGameV1["runHistory"][number]>;
    const result = record.result === "victory" || record.result === "defeat" ? record.result : null;
    if (!result) {
      continue;
    }

    results.push({
      endedAt: typeof record.endedAt === "string" ? record.endedAt : new Date(0).toISOString(),
      result,
      biomeReached: Math.round(sanitizeFiniteNumber(record.biomeReached, 1, 1)),
      wavesCleared: Math.round(sanitizeFiniteNumber(record.wavesCleared, 0, 0)),
      essenceGained: Math.round(sanitizeFiniteNumber(record.essenceGained, 0, 0)),
    });
  }

  if (results.length > MAX_HISTORY_ENTRIES) {
    return results.slice(results.length - MAX_HISTORY_ENTRIES);
  }
  return results;
}

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
  if (candidate.version !== 1) {
    return createDefaultSave();
  }

  const merged = createDefaultSave();
  const meta = candidate.meta && typeof candidate.meta === "object" ? candidate.meta : null;
  const settings = candidate.settings && typeof candidate.settings === "object" ? candidate.settings : null;

  if (meta) {
    merged.meta = {
      essence: Math.round(sanitizeFiniteNumber(meta.essence, merged.meta.essence, 0)),
      unlockedTowers: Array.isArray(meta.unlockedTowers)
        ? meta.unlockedTowers.filter((value): value is TowerType => isTowerType(value))
        : merged.meta.unlockedTowers,
      unlockedAbilities: Array.isArray(meta.unlockedAbilities)
        ? meta.unlockedAbilities.filter((value): value is AbilityType => isAbilityType(value))
        : merged.meta.unlockedAbilities,
      unlockedUpgradeIds: Array.isArray(meta.unlockedUpgradeIds)
        ? meta.unlockedUpgradeIds.filter((entry): entry is string => typeof entry === "string").slice(0, 400)
        : merged.meta.unlockedUpgradeIds,
      unlockedDifficultyTier: Math.round(
        sanitizeFiniteNumber(meta.unlockedDifficultyTier, merged.meta.unlockedDifficultyTier, 1, MAX_DIFFICULTY_TIER),
      ),
    };
  }

  if (settings) {
    merged.settings = {
      difficultyTier: Math.round(sanitizeFiniteNumber(settings.difficultyTier, merged.settings.difficultyTier, 1, MAX_DIFFICULTY_TIER)),
      quality:
        settings.quality === "low" || settings.quality === "medium" || settings.quality === "high"
          ? settings.quality
          : merged.settings.quality,
      masterVolume: sanitizeFiniteNumber(settings.masterVolume, merged.settings.masterVolume, 0, 1),
    };
  }

  merged.createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : merged.createdAt;
  merged.updatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : merged.updatedAt;
  merged.runHistory = sanitizeRunHistory(candidate.runHistory);
  return merged;
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
