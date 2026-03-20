import * as THREE from "three";
import {
  ARENA_MAX_X,
  ARENA_MAX_Z,
  ARENA_MIN_X,
  ARENA_MIN_Z,
  CORE_BUILD_BUFFER_RADIUS,
  CORE_WORLD_POSITION,
} from "../constants";
import { biomeSequence } from "../data/biomes";
import type { MutableGameState, TowerType, TrapType, Vec3 } from "../types";
import {
  clampCameraPitch,
  computeCameraFocusPoint,
  computeCameraRigPosition,
  computeDampingAlpha,
  rightFromYaw,
} from "./cameraMath";

function setObjectPosition(object: THREE.Object3D, position: Vec3): void {
  object.position.set(position.x, position.y, position.z);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface AimSample {
  aimPoint3D: Vec3;
  groundPoint: Vec3;
  rayDirection: Vec3;
}

export function resolveAimPoint3D(
  objectHit: Vec3 | null,
  groundHit: Vec3 | null,
  rayOrigin: Vec3,
  rayDirection: Vec3,
  fallbackDistance = 32,
): Vec3 {
  if (objectHit) {
    return { x: objectHit.x, y: objectHit.y, z: objectHit.z };
  }
  if (groundHit) {
    return { x: groundHit.x, y: groundHit.y, z: groundHit.z };
  }
  return {
    x: rayOrigin.x + rayDirection.x * fallbackDistance,
    y: rayOrigin.y + rayDirection.y * fallbackDistance,
    z: rayOrigin.z + rayDirection.z * fallbackDistance,
  };
}

function hueForEnemy(type: string): number {
  switch (type) {
    case "grunt":
      return 0.08;
    case "hound":
      return 0.02;
    case "brute":
      return 0.11;
    case "witch":
      return 0.72;
    case "wisp":
      return 0.55;
    case "juggernaut":
      return 0.95;
    case "boss":
      return 0;
    default:
      return 0.5;
  }
}

export class Renderer3D {
  private static readonly ARENA_MIN_X = ARENA_MIN_X;

  private static readonly ARENA_MAX_X = ARENA_MAX_X;

  private static readonly ARENA_MIN_Z = ARENA_MIN_Z;

  private static readonly ARENA_MAX_Z = ARENA_MAX_Z;

  private static readonly CAMERA_POSITION_LAMBDA = 11;

  private static readonly CAMERA_FOCUS_LAMBDA = 13;

  private static readonly CAMERA_YAW_SENSITIVITY = 0.0024;

  private static readonly CAMERA_PITCH_SENSITIVITY = 0.0019;

  private static readonly CAMERA_MIN_PITCH = -0.78;

  private static readonly CAMERA_MAX_PITCH = 0.22;

  private static readonly CAMERA_FOLLOW_DISTANCE = 6.2;

  private static readonly CAMERA_SHOULDER_OFFSET = 0.95;

  private static readonly CAMERA_HEIGHT_OFFSET = 0.35;

  private static readonly CAMERA_FOCUS_DISTANCE = 18;

  private static readonly RETICLE_LAMBDA = 30;

  private static readonly LANE_PATH_BASE_HEIGHT = 0.16;

  private static readonly LANE_PATH_FLOW_SPEED = 2.6;

  private static readonly CAMERA_POSITION_DEADZONE_SQ = 0.015 * 0.015;

  private static readonly CAMERA_FOCUS_DEADZONE_SQ = 0.02 * 0.02;

  private static readonly RETICLE_DEADZONE_SQ = 0.01 * 0.01;

  readonly renderer: THREE.WebGLRenderer;

  readonly scene: THREE.Scene;

  readonly camera: THREE.PerspectiveCamera;

  readonly clock: THREE.Clock;

  private canvas: HTMLCanvasElement;

  private worldPlane: THREE.Plane;

  private raycaster: THREE.Raycaster;

  private heroMesh: THREE.Mesh;

  private reticleMesh: THREE.Mesh;

  private enemyMeshes = new Map<string, THREE.Mesh>();

  private towerMeshes = new Map<string, THREE.Mesh>();

  private trapMeshes = new Map<string, THREE.Mesh>();

  private projectileMeshes = new Map<string, THREE.Mesh>();

  private hazardMeshes = new Map<string, THREE.Mesh>();

  private obstacleMeshes = new Map<string, THREE.Mesh>();

  private laneLineMeshes = new Map<string, THREE.Line>();

  private pooledEnemyMeshes: THREE.Mesh[] = [];

  private pooledProjectileMeshes: THREE.Mesh[] = [];

  private placementPreviewMesh: THREE.Mesh;

  private buildGhostMesh: THREE.Mesh;

  private activeBuildGhostType: TowerType | TrapType | null = null;

  private coreBuildBufferMesh: THREE.Mesh;

  private reticleTarget = new THREE.Vector3();

  private raycastNdc = new THREE.Vector2(0, 0);

  private raycastGroundHit = new THREE.Vector3();

  private raycastForwardFallback = new THREE.Vector3();

  private lastGroundPoint = new THREE.Vector3(8, 0, 0);

  private lastAimPoint = new THREE.Vector3(8, 0, 0);

  private cameraDesiredPosition = new THREE.Vector3();

  private cameraDesiredFocus = new THREE.Vector3();

  private cameraCurrentFocus = new THREE.Vector3();

  private cameraYaw = -Math.PI / 2;

  private cameraPitch = -0.34;

  private cameraPivot = new THREE.Vector3(8, 1.35, 0);

  private readonly biomeBackgroundColors = [
    new THREE.Color("#2b3444"),
    new THREE.Color("#2d3b4c"),
    new THREE.Color("#2c4433"),
  ];

  private activeBiomeBackgroundIndex = -1;

  private activeLaneSignature = "";

  private activeObstacleBiomeIndex = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = this.biomeBackgroundColors[0];
    this.clock = new THREE.Clock();
    this.worldPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();

    this.camera = new THREE.PerspectiveCamera(62, Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight), 0.1, 230);
    this.camera.position.set(12.5, 4.8, 0);
    this.camera.lookAt(8, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.shadowMap.enabled = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.heroMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.45, 1.2, 8, 12),
      new THREE.MeshStandardMaterial({ color: "#d6d2bf", roughness: 0.5, metalness: 0.15 }),
    );
    this.heroMesh.position.y = 0.9;
    this.scene.add(this.heroMesh);

    this.reticleMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.15, 1),
      new THREE.MeshBasicMaterial({ color: "#f4f1c8", transparent: true, opacity: 0.9 }),
    );
    this.reticleMesh.position.y = 1;
    this.scene.add(this.reticleMesh);

    this.placementPreviewMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.78, 32),
      new THREE.MeshBasicMaterial({ color: "#65f2a6", transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    this.placementPreviewMesh.rotation.x = -Math.PI / 2;
    this.placementPreviewMesh.visible = false;
    this.scene.add(this.placementPreviewMesh);

    this.buildGhostMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: "#65f2a6",
        emissive: "#3a7f67",
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.42,
        roughness: 0.35,
        metalness: 0.05,
      }),
    );
    this.buildGhostMesh.visible = false;
    this.scene.add(this.buildGhostMesh);

    this.coreBuildBufferMesh = new THREE.Mesh(
      new THREE.RingGeometry(CORE_BUILD_BUFFER_RADIUS - 0.1, CORE_BUILD_BUFFER_RADIUS, 64),
      new THREE.MeshBasicMaterial({ color: "#82c6f3", transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    this.coreBuildBufferMesh.rotation.x = -Math.PI / 2;
    this.coreBuildBufferMesh.position.set(CORE_WORLD_POSITION.x, 0.03, CORE_WORLD_POSITION.z);
    this.coreBuildBufferMesh.visible = false;
    this.scene.add(this.coreBuildBufferMesh);

    this.addLighting();
    this.addEnvironment();

    window.addEventListener("resize", this.onResize);
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize);
    for (const line of this.laneLineMeshes.values()) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.laneLineMeshes.clear();
    for (const mesh of this.obstacleMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.obstacleMeshes.clear();
    this.placementPreviewMesh.geometry.dispose();
    (this.placementPreviewMesh.material as THREE.Material).dispose();
    this.buildGhostMesh.geometry.dispose();
    (this.buildGhostMesh.material as THREE.Material).dispose();
    this.coreBuildBufferMesh.geometry.dispose();
    (this.coreBuildBufferMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
  }

  onResize = (): void => {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  initializeCameraRig(heroPosition: Vec3, heroFacing: Vec3): void {
    this.cameraPivot.set(heroPosition.x, heroPosition.y + 1.35, heroPosition.z);
    this.cameraYaw = Math.atan2(heroFacing.x, heroFacing.z);
    this.cameraPitch = clampCameraPitch(this.cameraPitch, Renderer3D.CAMERA_MIN_PITCH, Renderer3D.CAMERA_MAX_PITCH);
    this.applyCameraRigImmediate();
  }

  stepCameraRig(heroPosition: Vec3, lookDeltaX: number, lookDeltaY: number, frameDt: number): void {
    if (lookDeltaX !== 0 || lookDeltaY !== 0) {
      this.cameraYaw -= lookDeltaX * Renderer3D.CAMERA_YAW_SENSITIVITY;
      this.cameraPitch = clampCameraPitch(
        this.cameraPitch - lookDeltaY * Renderer3D.CAMERA_PITCH_SENSITIVITY,
        Renderer3D.CAMERA_MIN_PITCH,
        Renderer3D.CAMERA_MAX_PITCH,
      );
    }

    this.cameraPivot.set(heroPosition.x, heroPosition.y + 1.35, heroPosition.z);
    const desiredPosition = computeCameraRigPosition(
      { x: this.cameraPivot.x, y: this.cameraPivot.y, z: this.cameraPivot.z },
      this.cameraYaw,
      this.cameraPitch,
      Renderer3D.CAMERA_FOLLOW_DISTANCE,
      Renderer3D.CAMERA_SHOULDER_OFFSET,
      Renderer3D.CAMERA_HEIGHT_OFFSET,
    );
    this.cameraDesiredPosition.set(desiredPosition.x, desiredPosition.y, desiredPosition.z);

    const desiredFocus = computeCameraFocusPoint(
      { x: this.cameraPivot.x, y: this.cameraPivot.y, z: this.cameraPivot.z },
      this.cameraYaw,
      this.cameraPitch,
      Renderer3D.CAMERA_FOCUS_DISTANCE,
    );
    this.cameraDesiredFocus.set(desiredFocus.x, desiredFocus.y, desiredFocus.z);

    const positionAlpha = computeDampingAlpha(Renderer3D.CAMERA_POSITION_LAMBDA, frameDt);
    this.dampVector(this.camera.position, this.cameraDesiredPosition, positionAlpha, Renderer3D.CAMERA_POSITION_DEADZONE_SQ);

    const focusAlpha = computeDampingAlpha(Renderer3D.CAMERA_FOCUS_LAMBDA, frameDt);
    this.dampVector(this.cameraCurrentFocus, this.cameraDesiredFocus, focusAlpha, Renderer3D.CAMERA_FOCUS_DEADZONE_SQ);
    this.camera.lookAt(this.cameraCurrentFocus);
  }

  getMovementBasis(): { forward: Vec3; right: Vec3 } {
    const right = rightFromYaw(this.cameraYaw);
    const forward = { x: Math.sin(this.cameraYaw), y: 0, z: Math.cos(this.cameraYaw) };
    return {
      forward,
      right,
    };
  }

  sampleAimTarget(): AimSample {
    this.raycaster.setFromCamera(this.raycastNdc, this.camera);

    const rayDirection = this.raycaster.ray.direction;
    const hitTargets: THREE.Object3D[] = [];
    for (const mesh of this.enemyMeshes.values()) {
      if (mesh.visible) {
        hitTargets.push(mesh);
      }
    }

    const objectHit = hitTargets.length > 0 ? this.raycaster.intersectObjects(hitTargets, false)[0] : undefined;
    const groundHit = this.raycaster.ray.intersectPlane(this.worldPlane, this.raycastGroundHit);
    const resolvedAimPoint = resolveAimPoint3D(
      objectHit?.point ? { x: objectHit.point.x, y: objectHit.point.y, z: objectHit.point.z } : null,
      groundHit ? { x: groundHit.x, y: groundHit.y, z: groundHit.z } : null,
      {
        x: this.raycaster.ray.origin.x,
        y: this.raycaster.ray.origin.y,
        z: this.raycaster.ray.origin.z,
      },
      {
        x: rayDirection.x,
        y: rayDirection.y,
        z: rayDirection.z,
      },
    );
    this.lastAimPoint.set(resolvedAimPoint.x, resolvedAimPoint.y, resolvedAimPoint.z);

    if (groundHit) {
      this.lastGroundPoint.copy(groundHit);
    } else {
      this.raycastForwardFallback.copy(rayDirection).multiplyScalar(20).add(this.raycaster.ray.origin);
      this.lastGroundPoint.set(this.raycastForwardFallback.x, 0, this.raycastForwardFallback.z);
    }
    this.lastGroundPoint.x = clamp(this.lastGroundPoint.x, Renderer3D.ARENA_MIN_X, Renderer3D.ARENA_MAX_X);
    this.lastGroundPoint.y = 0;
    this.lastGroundPoint.z = clamp(this.lastGroundPoint.z, Renderer3D.ARENA_MIN_Z, Renderer3D.ARENA_MAX_Z);

    return {
      aimPoint3D: {
        x: this.lastAimPoint.x,
        y: this.lastAimPoint.y,
        z: this.lastAimPoint.z,
      },
      groundPoint: {
        x: this.lastGroundPoint.x,
        y: 0,
        z: this.lastGroundPoint.z,
      },
      rayDirection: {
        x: rayDirection.x,
        y: rayDirection.y,
        z: rayDirection.z,
      },
    };
  }

  setReticle(position: Vec3, frameDt: number): void {
    this.reticleTarget.set(position.x, position.y, position.z);
    const alpha = computeDampingAlpha(Renderer3D.RETICLE_LAMBDA, frameDt);
    this.dampVector(this.reticleMesh.position, this.reticleTarget, alpha, Renderer3D.RETICLE_DEADZONE_SQ);
  }

  getCameraDiagnostics(): { position: Vec3; focus: Vec3; yaw: number; pitch: number; aimPoint: Vec3 } {
    return {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      focus: {
        x: this.cameraCurrentFocus.x,
        y: this.cameraCurrentFocus.y,
        z: this.cameraCurrentFocus.z,
      },
      yaw: this.cameraYaw,
      pitch: this.cameraPitch,
      aimPoint: {
        x: this.lastAimPoint.x,
        y: this.lastAimPoint.y,
        z: this.lastAimPoint.z,
      },
    };
  }

  render(state: MutableGameState, frameDt: number): void {
    void frameDt;
    this.updateEnvironmentColor(state);
    this.updateHero(state);
    this.syncEnemyMeshes(state);
    this.syncTowerMeshes(state);
    this.syncTrapMeshes(state);
    this.syncProjectileMeshes(state);
    this.syncObstacles(state);
    this.syncLanePaths(state);
    this.animateLanePaths(state.time);
    this.syncPlacementPreview(state);
    this.syncHazards(state);

    this.renderer.render(this.scene, this.camera);
  }

  private addLighting(): void {
    const ambient = new THREE.AmbientLight("#d6e3f0", 0.65);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight("#ffe1b4", 1.05);
    key.position.set(16, 30, 18);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight("#9eb5e7", 0.5);
    fill.position.set(-16, 22, -12);
    this.scene.add(fill);
  }

  private addEnvironment(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90, 1, 1),
      new THREE.MeshStandardMaterial({ color: "#4a5d73", roughness: 0.92, metalness: 0.02 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);

    const bastionCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.5, 0),
      new THREE.MeshStandardMaterial({ color: "#b4e4ff", emissive: "#4aa6ff", emissiveIntensity: 0.45 }),
    );
    bastionCore.position.set(CORE_WORLD_POSITION.x, 2.1, CORE_WORLD_POSITION.z);
    this.scene.add(bastionCore);

    const bastionBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 3.6, 1.4, 10),
      new THREE.MeshStandardMaterial({ color: "#53606e", roughness: 0.8 }),
    );
    bastionBase.position.set(CORE_WORLD_POSITION.x, 0.65, CORE_WORLD_POSITION.z);
    this.scene.add(bastionBase);
  }

  private updateEnvironmentColor(state: MutableGameState): void {
    const biomeIndex = Math.max(0, Math.min(this.biomeBackgroundColors.length - 1, state.currentBiomeIndex));
    if (biomeIndex === this.activeBiomeBackgroundIndex) {
      return;
    }
    this.activeBiomeBackgroundIndex = biomeIndex;
    this.scene.background = this.biomeBackgroundColors[biomeIndex];
  }

  private updateHero(state: MutableGameState): void {
    setObjectPosition(this.heroMesh, { x: state.hero.position.x, y: state.hero.position.y + 0.8, z: state.hero.position.z });
    this.heroMesh.rotation.y = Math.atan2(state.hero.facing.x, state.hero.facing.z);
  }

  private applyCameraRigImmediate(): void {
    const desiredPosition = computeCameraRigPosition(
      { x: this.cameraPivot.x, y: this.cameraPivot.y, z: this.cameraPivot.z },
      this.cameraYaw,
      this.cameraPitch,
      Renderer3D.CAMERA_FOLLOW_DISTANCE,
      Renderer3D.CAMERA_SHOULDER_OFFSET,
      Renderer3D.CAMERA_HEIGHT_OFFSET,
    );
    this.camera.position.set(desiredPosition.x, desiredPosition.y, desiredPosition.z);

    const focus = computeCameraFocusPoint(
      { x: this.cameraPivot.x, y: this.cameraPivot.y, z: this.cameraPivot.z },
      this.cameraYaw,
      this.cameraPitch,
      Renderer3D.CAMERA_FOCUS_DISTANCE,
    );
    this.cameraCurrentFocus.set(focus.x, focus.y, focus.z);
    this.cameraDesiredFocus.copy(this.cameraCurrentFocus);
    this.camera.lookAt(this.cameraCurrentFocus);
  }

  private dampVector(current: THREE.Vector3, target: THREE.Vector3, alpha: number, deadzoneSq: number): void {
    if (current.distanceToSquared(target) <= deadzoneSq) {
      current.copy(target);
      return;
    }
    current.lerp(target, alpha);
  }

  private getEnemyMesh(id: string, type: string): THREE.Mesh {
    let mesh = this.enemyMeshes.get(id);
    if (mesh) {
      return mesh;
    }

    mesh = this.pooledEnemyMeshes.pop();
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 12, 10),
        new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.08, emissiveIntensity: 0.18 }),
      );
      this.scene.add(mesh);
    }

    const material = mesh.material as THREE.MeshStandardMaterial;
    material.color.setHSL(hueForEnemy(type), 0.68, 0.58);
    this.enemyMeshes.set(id, mesh);
    return mesh;
  }

  private syncEnemyMeshes(state: MutableGameState): void {
    const liveIds = new Set<string>();
    for (const enemy of state.enemies) {
      if (enemy.isDead) {
        continue;
      }
      liveIds.add(enemy.id);
      const mesh = this.getEnemyMesh(enemy.id, enemy.type);
      mesh.visible = true;
      mesh.position.set(enemy.position.x, enemy.position.y + 0.55, enemy.position.z);
      mesh.scale.setScalar(enemy.isBoss ? 1.9 : enemy.isElite ? 1.35 : 1);

      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.set(enemy.statuses.some((entry) => entry.type === "shock") ? "#6eb6ff" : "#000000");
      material.emissiveIntensity = enemy.statuses.some((entry) => entry.type === "shock") ? 0.75 : 0.22;
      if (enemy.statuses.some((entry) => entry.type === "freeze")) {
        material.color.set("#b8e4ff");
      }
    }

    for (const [id, mesh] of this.enemyMeshes.entries()) {
      if (liveIds.has(id)) {
        continue;
      }
      mesh.visible = false;
      this.enemyMeshes.delete(id);
      this.pooledEnemyMeshes.push(mesh);
    }
  }

  private meshForTower(type: string): THREE.Mesh {
    switch (type) {
      case "ballista":
        return new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 1.1, 1.1),
          new THREE.MeshStandardMaterial({ color: "#8e6b4c", roughness: 0.7 }),
        );
      case "frost-obelisk":
        return new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1.8, 5),
          new THREE.MeshStandardMaterial({ color: "#9ed8ff", roughness: 0.4 }),
        );
      case "bombard":
        return new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.85, 1.2, 8),
          new THREE.MeshStandardMaterial({ color: "#a69d93", roughness: 0.65 }),
        );
      case "arc-tower":
        return new THREE.Mesh(
          new THREE.OctahedronGeometry(0.75, 0),
          new THREE.MeshStandardMaterial({ color: "#9aa6ff", roughness: 0.3 }),
        );
      case "shrine":
      default:
        return new THREE.Mesh(
          new THREE.TorusKnotGeometry(0.6, 0.18, 64, 10),
          new THREE.MeshStandardMaterial({ color: "#c9b4f3", roughness: 0.35 }),
        );
    }
  }

  private syncTowerMeshes(state: MutableGameState): void {
    const alive = new Set<string>();
    for (const tower of state.towers) {
      alive.add(tower.id);
      let mesh = this.towerMeshes.get(tower.id);
      if (!mesh) {
        mesh = this.meshForTower(tower.type);
        this.scene.add(mesh);
        this.towerMeshes.set(tower.id, mesh);
      }
      mesh.visible = true;
      mesh.position.set(tower.position.x, 0.8, tower.position.z);
      const pulse = 1 + Math.sin(state.time * 2 + tower.level) * 0.04;
      mesh.scale.setScalar((1 + tower.level * 0.08) * pulse);
    }

    for (const [id, mesh] of this.towerMeshes.entries()) {
      if (alive.has(id)) {
        continue;
      }
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.towerMeshes.delete(id);
    }
  }

  private meshForTrap(type: string): THREE.Mesh {
    switch (type) {
      case "spike-trap":
        return new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 0.8, 4),
          new THREE.MeshStandardMaterial({ color: "#ba8f74", roughness: 0.8 }),
        );
      case "push-trap":
        return new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.2, 0.8),
          new THREE.MeshStandardMaterial({ color: "#6e8ab3", roughness: 0.7 }),
        );
      case "flame-trap":
      default:
        return new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.55, 0.25, 8),
          new THREE.MeshStandardMaterial({ color: "#bf7342", roughness: 0.6 }),
        );
    }
  }

  private syncTrapMeshes(state: MutableGameState): void {
    const active = new Set<string>();
    for (const trap of state.traps) {
      active.add(trap.id);
      let mesh = this.trapMeshes.get(trap.id);
      if (!mesh) {
        mesh = this.meshForTrap(trap.type);
        this.scene.add(mesh);
        this.trapMeshes.set(trap.id, mesh);
      }
      mesh.position.set(trap.position.x, 0.2, trap.position.z);
      mesh.rotation.y += 0.01;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.set(trap.cooldown > 0 ? "#331100" : "#552200");
    }

    for (const [id, mesh] of this.trapMeshes.entries()) {
      if (active.has(id)) {
        continue;
      }
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.trapMeshes.delete(id);
    }
  }

  private getProjectileMesh(id: string): THREE.Mesh {
    let mesh = this.projectileMeshes.get(id);
    if (mesh) {
      return mesh;
    }

    mesh = this.pooledProjectileMeshes.pop();
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.16, 0),
        new THREE.MeshStandardMaterial({ color: "#fcefb4", roughness: 0.35, emissive: "#f8ca6a", emissiveIntensity: 0.35 }),
      );
      this.scene.add(mesh);
    }

    this.projectileMeshes.set(id, mesh);
    return mesh;
  }

  private syncProjectileMeshes(state: MutableGameState): void {
    const seen = new Set<string>();
    for (const projectile of state.projectiles) {
      seen.add(projectile.id);
      const mesh = this.getProjectileMesh(projectile.id);
      mesh.visible = true;
      mesh.position.set(projectile.position.x, projectile.position.y + 0.2, projectile.position.z);
    }

    for (const [id, mesh] of this.projectileMeshes.entries()) {
      if (seen.has(id)) {
        continue;
      }
      mesh.visible = false;
      this.projectileMeshes.delete(id);
      this.pooledProjectileMeshes.push(mesh);
    }
  }

  private laneRouteSignature(state: MutableGameState): string {
    return state.enemyRoutePreview
      .map(
        (laneRoute) => `${laneRoute.laneId}:${laneRoute.points
          .map((point) => `${point.x.toFixed(2)},${point.z.toFixed(2)}`)
          .join("|")}`,
      )
      .join(";");
  }

  private syncLanePaths(state: MutableGameState): void {
    const signature = this.laneRouteSignature(state);
    if (signature === this.activeLaneSignature) {
      return;
    }

    for (const laneLine of this.laneLineMeshes.values()) {
      this.scene.remove(laneLine);
      laneLine.geometry.dispose();
      (laneLine.material as THREE.Material).dispose();
    }
    this.laneLineMeshes.clear();

    for (const laneRoute of state.enemyRoutePreview) {
      if (laneRoute.points.length < 2) {
        continue;
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(
        laneRoute.points.map((point) => new THREE.Vector3(point.x, 0, point.z)),
      );
      const line = new THREE.Line(
        geometry,
        new THREE.LineDashedMaterial({
          color: "#9fd7ff",
          dashSize: 1.2,
          gapSize: 0.7,
          transparent: true,
          opacity: 0.58,
        }),
      );
      line.computeLineDistances();
      line.position.y = Renderer3D.LANE_PATH_BASE_HEIGHT;
      const lineDistanceAttr = geometry.getAttribute("lineDistance");
      if (lineDistanceAttr) {
        line.userData.baseLineDistances = Float32Array.from(lineDistanceAttr.array as ArrayLike<number>);
      }
      this.scene.add(line);
      this.laneLineMeshes.set(laneRoute.laneId, line);
    }

    this.activeLaneSignature = signature;
  }

  private animateLanePaths(time: number): void {
    for (const laneLine of this.laneLineMeshes.values()) {
      const material = laneLine.material as THREE.LineDashedMaterial;
      const cycle = Math.max(0.001, material.dashSize + material.gapSize);
      const shift = (time * Renderer3D.LANE_PATH_FLOW_SPEED) % cycle;
      const lineDistance = laneLine.geometry.getAttribute("lineDistance");
      const base = laneLine.userData.baseLineDistances as Float32Array | undefined;
      if (!lineDistance || !base || lineDistance.count !== base.length) {
        continue;
      }

      for (let i = 0; i < lineDistance.count; i += 1) {
        lineDistance.setX(i, base[i]! - shift);
      }
      lineDistance.needsUpdate = true;
    }
  }

  private syncObstacles(state: MutableGameState): void {
    if (state.currentBiomeIndex === this.activeObstacleBiomeIndex) {
      return;
    }

    for (const mesh of this.obstacleMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.obstacleMeshes.clear();

    const biome = biomeSequence[state.currentBiomeIndex] ?? biomeSequence[biomeSequence.length - 1];
    if (!biome) {
      this.activeObstacleBiomeIndex = state.currentBiomeIndex;
      return;
    }

    for (const obstacle of biome.obstacles) {
      let geometry: THREE.BufferGeometry;
      let color = "#7e8d9a";
      if (obstacle.style === "ruin") {
        geometry = new THREE.BoxGeometry(obstacle.radius * 1.8, obstacle.height, obstacle.radius * 1.6);
        color = "#8d877c";
      } else if (obstacle.style === "tree") {
        geometry = new THREE.ConeGeometry(obstacle.radius * 0.95, obstacle.height, 8);
        color = "#5d7f58";
      } else {
        geometry = new THREE.CylinderGeometry(obstacle.radius, obstacle.radius * 1.1, obstacle.height, 10);
      }

      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.06 }),
      );
      mesh.position.set(obstacle.center.x, obstacle.height * 0.5, obstacle.center.z);
      this.scene.add(mesh);
      this.obstacleMeshes.set(obstacle.id, mesh);
    }

    this.activeObstacleBiomeIndex = state.currentBiomeIndex;
  }

  private syncPlacementPreview(state: MutableGameState): void {
    const buildMode = state.mode === "build";
    this.placementPreviewMesh.visible = buildMode;
    this.buildGhostMesh.visible = buildMode;
    this.coreBuildBufferMesh.visible = buildMode;
    if (!buildMode) {
      return;
    }

    this.syncBuildGhost(state.selectedBuildType, state.placementPreview.canPlace, state.placementPreview.position);
    this.placementPreviewMesh.position.set(state.placementPreview.position.x, 0.045, state.placementPreview.position.z);
    const material = this.placementPreviewMesh.material as THREE.MeshBasicMaterial;
    if (state.placementPreview.canPlace) {
      material.color.set("#65f2a6");
      material.opacity = 0.85;
      return;
    }
    if (state.placementPreview.blockReason === "insufficient-gold") {
      material.color.set("#f7c26c");
      material.opacity = 0.8;
      return;
    }
    material.color.set("#ff8f84");
    material.opacity = 0.8;
  }

  private syncBuildGhost(selectedBuildType: TowerType | TrapType, canPlace: boolean, position: Vec3): void {
    if (this.activeBuildGhostType !== selectedBuildType) {
      this.buildGhostMesh.geometry.dispose();
      this.buildGhostMesh.geometry = this.geometryForBuildType(selectedBuildType);
      this.activeBuildGhostType = selectedBuildType;
    }

    this.buildGhostMesh.position.set(position.x, this.previewHeightForBuildType(selectedBuildType), position.z);
    this.buildGhostMesh.rotation.set(0, 0, 0);

    const material = this.buildGhostMesh.material as THREE.MeshStandardMaterial;
    material.color.set(canPlace ? "#65f2a6" : "#ff8f84");
    material.emissive.set(canPlace ? "#3a7f67" : "#8f4a40");
    material.opacity = canPlace ? 0.42 : 0.46;
  }

  private previewHeightForBuildType(type: TowerType | TrapType): number {
    switch (type) {
      case "spike-trap":
        return 0.4;
      case "push-trap":
      case "flame-trap":
        return 0.2;
      case "frost-obelisk":
        return 0.9;
      case "bombard":
        return 0.6;
      case "arc-tower":
        return 0.78;
      case "shrine":
        return 0.8;
      case "ballista":
      default:
        return 0.7;
    }
  }

  private geometryForBuildType(type: TowerType | TrapType): THREE.BufferGeometry {
    switch (type) {
      case "ballista":
        return new THREE.BoxGeometry(1.1, 1.1, 1.1);
      case "frost-obelisk":
        return new THREE.ConeGeometry(0.5, 1.8, 5);
      case "bombard":
        return new THREE.CylinderGeometry(0.7, 0.85, 1.2, 8);
      case "arc-tower":
        return new THREE.OctahedronGeometry(0.75, 0);
      case "shrine":
        return new THREE.TorusKnotGeometry(0.6, 0.18, 64, 10);
      case "spike-trap":
        return new THREE.ConeGeometry(0.35, 0.8, 4);
      case "push-trap":
        return new THREE.BoxGeometry(0.8, 0.2, 0.8);
      case "flame-trap":
      default:
        return new THREE.CylinderGeometry(0.45, 0.55, 0.25, 8);
    }
  }

  private syncHazards(state: MutableGameState): void {
    const seen = new Set<string>();
    // Hazards are visual-only in renderer; gameplay handling is in simulation.
    const hazardCandidates = state.currentBiomeIndex === 0
      ? [
          { id: "rg-fissure", x: -2, z: 0, radius: 1.7, color: "#794a30" },
        ]
      : state.currentBiomeIndex === 1
        ? [
            { id: "fp-ice-field", x: -6, z: -1, radius: 3.1, color: "#86b2dd" },
            { id: "fp-frost-field", x: 3, z: 3, radius: 2.4, color: "#76c7f7" },
          ]
        : [
            { id: "bm-toxic-pool-1", x: -4, z: 0, radius: 2.7, color: "#62854f" },
            { id: "bm-toxic-pool-2", x: 3, z: -6, radius: 2.2, color: "#4d803f" },
          ];

    for (const hazard of hazardCandidates) {
      seen.add(hazard.id);
      let mesh = this.hazardMeshes.get(hazard.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.CircleGeometry(hazard.radius, 32),
          new THREE.MeshBasicMaterial({ color: hazard.color, transparent: true, opacity: 0.28 }),
        );
        mesh.rotation.x = -Math.PI / 2;
        this.scene.add(mesh);
        this.hazardMeshes.set(hazard.id, mesh);
      }
      mesh.position.set(hazard.x, 0.02, hazard.z);
      mesh.visible = true;
    }

    for (const [id, mesh] of this.hazardMeshes.entries()) {
      if (seen.has(id)) {
        continue;
      }
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.hazardMeshes.delete(id);
    }
  }
}
