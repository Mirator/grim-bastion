export interface CameraLockResolutionInput {
  currentLockId: string | null;
  bestCandidateId: string | null;
  bestCandidateDistanceSq: number;
  currentLockFound: boolean;
  currentLockDistanceSq: number;
  switchRatio?: number;
  releaseDistanceSq?: number;
}

const DEFAULT_SWITCH_RATIO = 0.78;
const DEFAULT_RELEASE_DISTANCE_SQ = 28 * 28;

export function computeDampingAlpha(lambda: number, dt: number): number {
  if (lambda <= 0 || dt <= 0) {
    return 0;
  }
  const alpha = 1 - Math.exp(-lambda * dt);
  return Math.max(0, Math.min(1, alpha));
}

export function resolveCameraLockId(input: CameraLockResolutionInput): string | null {
  const {
    currentLockId,
    bestCandidateId,
    bestCandidateDistanceSq,
    currentLockFound,
    currentLockDistanceSq,
    switchRatio = DEFAULT_SWITCH_RATIO,
    releaseDistanceSq = DEFAULT_RELEASE_DISTANCE_SQ,
  } = input;

  if (!bestCandidateId) {
    return null;
  }

  if (!currentLockId || !currentLockFound) {
    return bestCandidateId;
  }

  if (bestCandidateId === currentLockId) {
    return currentLockId;
  }

  if (currentLockDistanceSq > releaseDistanceSq) {
    return bestCandidateId;
  }

  if (bestCandidateDistanceSq < currentLockDistanceSq * switchRatio) {
    return bestCandidateId;
  }

  return currentLockId;
}
