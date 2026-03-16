import * as THREE from "three";
import type { MutableGameState, Vec3 } from "../types";

function setObjectPosition(object: THREE.Object3D, position: Vec3): void {
  object.position.set(position.x, position.y, position.z);
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

  private buildNodeMeshes = new Map<string, THREE.Mesh>();

  private hazardMeshes = new Map<string, THREE.Mesh>();

  private pooledEnemyMeshes: THREE.Mesh[] = [];

  private pooledProjectileMeshes: THREE.Mesh[] = [];

  private reticleTarget = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#1c2430");
    this.clock = new THREE.Clock();
    this.worldPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();

    this.camera = new THREE.PerspectiveCamera(55, Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight), 0.1, 230);
    this.camera.position.set(0, 16, 19);
    this.camera.lookAt(0, 0, 0);

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
      new THREE.TorusGeometry(0.35, 0.04, 8, 24),
      new THREE.MeshBasicMaterial({ color: "#f4f1c8", transparent: true, opacity: 0.75 }),
    );
    this.reticleMesh.rotation.x = Math.PI / 2;
    this.reticleMesh.position.y = 0.03;
    this.scene.add(this.reticleMesh);

    this.addLighting();
    this.addEnvironment();

    window.addEventListener("resize", this.onResize);
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize);
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

  screenToGround(mouseNdcX: number, mouseNdcY: number): Vec3 {
    this.raycaster.setFromCamera(new THREE.Vector2(mouseNdcX, mouseNdcY), this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.worldPlane, target);
    return { x: target.x, y: 0, z: target.z };
  }

  setReticle(position: Vec3): void {
    this.reticleTarget.set(position.x, 0.03, position.z);
    this.reticleMesh.position.lerp(this.reticleTarget, 0.4);
  }

  render(state: MutableGameState): void {
    this.updateEnvironmentColor(state);
    this.updateHero(state);
    this.syncEnemyMeshes(state);
    this.syncTowerMeshes(state);
    this.syncTrapMeshes(state);
    this.syncProjectileMeshes(state);
    this.syncBuildNodes(state);
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
    bastionCore.position.set(12, 2.1, 0);
    this.scene.add(bastionCore);

    const bastionBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 3.6, 1.4, 10),
      new THREE.MeshStandardMaterial({ color: "#53606e", roughness: 0.8 }),
    );
    bastionBase.position.set(12, 0.65, 0);
    this.scene.add(bastionBase);
  }

  private updateEnvironmentColor(state: MutableGameState): void {
    const biomeColor = state.currentBiomeIndex === 0 ? "#2b3444" : state.currentBiomeIndex === 1 ? "#2d3b4c" : "#2c4433";
    this.scene.background = new THREE.Color(biomeColor);
  }

  private updateHero(state: MutableGameState): void {
    setObjectPosition(this.heroMesh, { x: state.hero.position.x, y: state.hero.position.y + 0.8, z: state.hero.position.z });
    this.heroMesh.rotation.y = Math.atan2(state.hero.facing.x, state.hero.facing.z);

    const nearestEnemy = state.enemies
      .filter((enemy) => !enemy.isDead)
      .sort((a, b) => {
        const da = (a.position.x - state.hero.position.x) ** 2 + (a.position.z - state.hero.position.z) ** 2;
        const db = (b.position.x - state.hero.position.x) ** 2 + (b.position.z - state.hero.position.z) ** 2;
        return da - db;
      })[0];

    const desiredCamera = new THREE.Vector3(
      state.hero.position.x - 6.8,
      11.5,
      state.hero.position.z + 10.5,
    );
    this.camera.position.lerp(desiredCamera, 0.15);

    const focusX = nearestEnemy ? state.hero.position.x * 0.4 + nearestEnemy.position.x * 0.6 : state.hero.position.x + state.hero.facing.x * 2.8;
    const focusZ = nearestEnemy ? state.hero.position.z * 0.4 + nearestEnemy.position.z * 0.6 : state.hero.position.z + state.hero.facing.z * 2.8;
    const focus = new THREE.Vector3(focusX, 1.2, focusZ);
    this.camera.lookAt(focus);
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

  private syncBuildNodes(state: MutableGameState): void {
    const seen = new Set<string>();
    for (const buildNode of state.buildNodes) {
      seen.add(buildNode.id);
      let mesh = this.buildNodeMeshes.get(buildNode.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.RingGeometry(0.45, 0.6, 24),
          new THREE.MeshBasicMaterial({ color: "#4a705e", transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
        );
        mesh.rotation.x = -Math.PI / 2;
        this.scene.add(mesh);
        this.buildNodeMeshes.set(buildNode.id, mesh);
      }
      mesh.position.set(buildNode.position.x, 0.05, buildNode.position.z);

      const material = mesh.material as THREE.MeshBasicMaterial;
      const selected = state.selectedNodeId === buildNode.id;
      const occupied = !!buildNode.occupiedBy;
      material.color.set(selected ? "#f0efaa" : occupied ? "#6d6257" : "#4a705e");
      material.opacity = state.mode === "build" ? 0.8 : 0.25;
      mesh.visible = true;
    }

    for (const [id, mesh] of this.buildNodeMeshes.entries()) {
      if (seen.has(id)) {
        continue;
      }
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.buildNodeMeshes.delete(id);
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
