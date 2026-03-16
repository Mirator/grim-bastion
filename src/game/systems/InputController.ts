export interface InputState {
  moveX: number;
  moveZ: number;
  firePrimary: boolean;
  fireSecondary: boolean;
  useAbility1: boolean;
  useAbility2: boolean;
  useDash: boolean;
  toggleBuild: boolean;
  startWave: boolean;
  startRun: boolean;
  confirmUpgradeIndex: number | null;
  cycleWeapon: boolean;
  switchLoadout: boolean;
  toggleFullscreen: boolean;
  mouseNdcX: number;
  mouseNdcY: number;
  pointerLocked: boolean;
}

const KEY_BINDINGS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
};

export class InputController {
  private keysDown = new Set<string>();

  private buttonsDown = new Set<number>();

  private pointer = { x: 0, y: 0 };

  private transient: Record<string, boolean> = {};

  private pointerLocked = false;

  private readonly target: HTMLElement | Window;

  constructor(target: HTMLElement | Window) {
    this.target = target;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    window.addEventListener("blur", this.onBlur);
    if (this.target instanceof HTMLElement) {
      this.target.addEventListener("click", this.onClick);
      this.target.addEventListener("contextmenu", this.onContextMenu);
    }
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    window.removeEventListener("blur", this.onBlur);
    if (this.target instanceof HTMLElement) {
      this.target.removeEventListener("click", this.onClick);
      this.target.removeEventListener("contextmenu", this.onContextMenu);
    }
  }

  sample(width: number, height: number): InputState {
    const moveX = this.axis(KEY_BINDINGS.left, KEY_BINDINGS.right);
    const moveZ = this.axis(KEY_BINDINGS.forward, KEY_BINDINGS.backward);

    const state: InputState = {
      moveX,
      moveZ,
      firePrimary: this.buttonsDown.has(0),
      fireSecondary: this.buttonsDown.has(2),
      useAbility1: this.consumeTransient("ability1") || this.keysDown.has("KeyQ"),
      useAbility2: this.consumeTransient("ability2") || this.keysDown.has("KeyE"),
      useDash: this.consumeTransient("dash") || this.keysDown.has("Space"),
      toggleBuild: this.consumeTransient("toggleBuild"),
      startWave: this.consumeTransient("startWave"),
      startRun: this.consumeTransient("startRun"),
      confirmUpgradeIndex: this.consumeUpgradeChoice(),
      cycleWeapon: this.consumeTransient("cycleWeapon"),
      switchLoadout: this.consumeTransient("switchLoadout"),
      toggleFullscreen: this.consumeTransient("toggleFullscreen"),
      mouseNdcX: (this.pointer.x / Math.max(width, 1)) * 2 - 1,
      mouseNdcY: -((this.pointer.y / Math.max(height, 1)) * 2 - 1),
      pointerLocked: this.pointerLocked,
    };

    return state;
  }

  private axis(negativeKeys: string[], positiveKeys: string[]): number {
    const negative = negativeKeys.some((key) => this.keysDown.has(key)) ? 1 : 0;
    const positive = positiveKeys.some((key) => this.keysDown.has(key)) ? 1 : 0;
    return positive - negative;
  }

  private consumeTransient(key: string): boolean {
    if (this.transient[key]) {
      this.transient[key] = false;
      return true;
    }
    return false;
  }

  private consumeUpgradeChoice(): number | null {
    const keys = ["upgrade0", "upgrade1", "upgrade2"];
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index] as string;
      if (this.transient[key]) {
        this.transient[key] = false;
        return index;
      }
    }
    return null;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keysDown.add(event.code);
    switch (event.code) {
      case "KeyB":
        this.transient.toggleBuild = true;
        break;
      case "KeyN":
        this.transient.startWave = true;
        break;
      case "Enter":
        this.transient.startRun = true;
        this.transient.startWave = true;
        break;
      case "KeyQ":
        this.transient.ability1 = true;
        break;
      case "KeyE":
        this.transient.ability2 = true;
        break;
      case "Space":
        this.transient.dash = true;
        break;
      case "KeyR":
        this.transient.cycleWeapon = true;
        break;
      case "KeyL":
        this.transient.switchLoadout = true;
        break;
      case "KeyF":
        this.transient.toggleFullscreen = true;
        break;
      case "Digit1":
        this.transient.upgrade0 = true;
        break;
      case "Digit2":
        this.transient.upgrade1 = true;
        break;
      case "Digit3":
        this.transient.upgrade2 = true;
        break;
      default:
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code);
  };

  private onMouseDown = (event: MouseEvent): void => {
    this.buttonsDown.add(event.button);
  };

  private onMouseUp = (event: MouseEvent): void => {
    this.buttonsDown.delete(event.button);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (this.pointerLocked) {
      this.pointer.x = Math.min(window.innerWidth, Math.max(0, this.pointer.x + event.movementX));
      this.pointer.y = Math.min(window.innerHeight, Math.max(0, this.pointer.y + event.movementY));
      return;
    }
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.target;
  };

  private onClick = (): void => {
    if (this.target instanceof HTMLElement && document.pointerLockElement !== this.target) {
      this.target.requestPointerLock().catch(() => {
        // Ignore; pointer lock is optional.
      });
    }
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private onBlur = (): void => {
    this.keysDown.clear();
    this.buttonsDown.clear();
    this.transient = {};
  };
}
