import { describe, expect, it } from "vitest";
import { digitHotkeyFromCode } from "../src/game/systems/InputController";

describe("input controller hotkey mapping", () => {
  it("maps Digit1..Digit8 to zero-based build/upgrade slots", () => {
    expect(digitHotkeyFromCode("Digit1")).toBe(0);
    expect(digitHotkeyFromCode("Digit3")).toBe(2);
    expect(digitHotkeyFromCode("Digit8")).toBe(7);
  });

  it("ignores unsupported key codes", () => {
    expect(digitHotkeyFromCode("Digit9")).toBeNull();
    expect(digitHotkeyFromCode("KeyQ")).toBeNull();
  });
});
