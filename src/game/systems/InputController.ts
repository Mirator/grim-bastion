export interface InputState {
  moveX: number;
  moveZ: number;
  firePrimary: boolean;
  fireSecondary: boolean;
  useAbility1: boolean;
  useAbility2: boolean;
  useDash: boolean;
  jump: boolean;
  toggleBuild: boolean;
  startWave: boolean;
  startRun: boolean;
  digitHotkey: number | null;
  cycleWeapon: boolean;
  switchLoadout: boolean;
  toggleFullscreen: boolean;
  cycleBuildNext: boolean;
  cycleBuildPrev: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
  mouseNdcX: number;
  mouseNdcY: number;
  pointerLocked: boolean;
}

export interface InputViewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

const KEY_BINDINGS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
};

export function digitHotkeyFromCode(code: string): number | null {
  if (!code.startsWith("Digit")) {
    return null;
  }
  const value = Number(code.slice(5));
  if (!Number.isInteger(value) || value < 1 || value > 8) {
    return null;
  }
  return value - 1;
}

export function isDashKeyCode(code: string): boolean {
  return code === "ShiftLeft" || code === "ShiftRight";
}

export function isJumpKeyCode(code: string): boolean {
  return code === "Space";
}

export function isStartRunKeyCode(code: string): boolean {
  return code === "Enter";
}

export function isStartWaveKeyCode(code: string): boolean {
  return code === "KeyN";
}

export function buildCycleDirectionFromWheelDelta(deltaY: number): 1 | -1 | 0 {
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return 0;
  }
  return deltaY > 0 ? 1 : -1;
}

export class InputController {
  private keysDown = new Set<string>();

  private buttonsDown = new Set<number>();

  private pointer = { x: 0, y: 0 };

  private lookDelta = { x: 0, y: 0 };

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
    window.addEventListener("wheel", this.onWheel, { passive: false });
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
    window.removeEventListener("wheel", this.onWheel);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    window.removeEventListener("blur", this.onBlur);
    if (this.target instanceof HTMLElement) {
      this.target.removeEventListener("click", this.onClick);
      this.target.removeEventListener("contextmenu", this.onContextMenu);
    }
  }

  sample(viewport: InputViewport): InputState {
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    const localMouseX = Math.max(0, Math.min(width, this.pointer.x - viewport.left));
    const localMouseY = Math.max(0, Math.min(height, this.pointer.y - viewport.top));
    const lookDeltaX = this.lookDelta.x;
    const lookDeltaY = this.lookDelta.y;
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;

    const moveX = this.axis(KEY_BINDINGS.left, KEY_BINDINGS.right);
    const moveZ = this.axis(KEY_BINDINGS.backward, KEY_BINDINGS.forward);

    const state: InputState = {
      moveX,
      moveZ,
      firePrimary: this.buttonsDown.has(0),
      fireSecondary: this.buttonsDown.has(2),
      useAbility1: this.consumeTransient("ability1") || this.keysDown.has("KeyQ"),
      useAbility2: this.consumeTransient("ability2") || this.keysDown.has("KeyE"),
      useDash: this.consumeTransient("dash"),
      jump: this.consumeTransient("jump"),
      toggleBuild: this.consumeTransient("toggleBuild"),
      startWave: this.consumeTransient("startWave"),
      startRun: this.consumeTransient("startRun"),
      digitHotkey: this.consumeDigitHotkey(),
      cycleWeapon: this.consumeTransient("cycleWeapon"),
      switchLoadout: this.consumeTransient("switchLoadout"),
      toggleFullscreen: this.consumeTransient("toggleFullscreen"),
      cycleBuildNext: this.consumeTransient("cycleBuildNext"),
      cycleBuildPrev: this.consumeTransient("cycleBuildPrev"),
      lookDeltaX,
      lookDeltaY,
      mouseNdcX: (localMouseX / width) * 2 - 1,
      mouseNdcY: -((localMouseY / height) * 2 - 1),
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

  private consumeDigitHotkey(): number | null {
    for (let index = 0; index < 8; index += 1) {
      const key = `digit${index}` as string;
      if (this.transient[key]) {
        this.transient[key] = false;
        return index;
      }
    }
    return null;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keysDown.add(event.code);
    const digitHotkey = digitHotkeyFromCode(event.code);
    if (digitHotkey !== null) {
      this.transient[`digit${digitHotkey}`] = true;
    }

    switch (event.code) {
      case "KeyB":
        this.transient.toggleBuild = true;
        break;
      case "KeyN":
        this.transient.startWave = true;
        break;
      case "Enter":
        this.transient.startRun = true;
        break;
      case "KeyQ":
        this.transient.ability1 = true;
        break;
      case "KeyE":
        this.transient.ability2 = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.transient.dash = true;
        break;
      case "Space":
        this.transient.jump = true;
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
      case "BracketRight":
        this.transient.cycleBuildNext = true;
        break;
      case "BracketLeft":
        this.transient.cycleBuildPrev = true;
        break;
      default:
        break;
    }

    this.requestPointerLock();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code);
  };

  private onMouseDown = (event: MouseEvent): void => {
    this.buttonsDown.add(event.button);
    this.requestPointerLock();
  };

  private onMouseUp = (event: MouseEvent): void => {
    this.buttonsDown.delete(event.button);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (this.pointerLocked) {
      this.pointer.x = Math.min(window.innerWidth, Math.max(0, this.pointer.x + event.movementX));
      this.pointer.y = Math.min(window.innerHeight, Math.max(0, this.pointer.y + event.movementY));
      this.lookDelta.x += event.movementX;
      this.lookDelta.y += event.movementY;
      return;
    }
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
  };

  private onWheel = (event: WheelEvent): void => {
    const direction = buildCycleDirectionFromWheelDelta(event.deltaY);
    if (direction === 0) {
      return;
    }
    if (direction > 0) {
      this.transient.cycleBuildNext = true;
    } else {
      this.transient.cycleBuildPrev = true;
    }
    event.preventDefault();
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.target;
  };

  private onClick = (event: MouseEvent): void => {
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
    this.requestPointerLock();
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private onBlur = (): void => {
    this.keysDown.clear();
    this.buttonsDown.clear();
    this.transient = {};
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
  };

  private requestPointerLock(): void {
    if (!(this.target instanceof HTMLElement)) {
      return;
    }
    if (document.pointerLockElement === this.target) {
      return;
    }
    this.target.requestPointerLock().catch(() => {
      // Ignore; pointer lock can fail without a valid user gesture.
    });
  }
}
